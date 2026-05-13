"""x-work.jp 検索結果ページから企業情報を収集して JSON に書き出す。

x-work.jp は Next.js 製で、ページ内の `<script id="__NEXT_DATA__">` に
求人一覧の構造化データが埋め込まれている。DOM セレクタに頼らず
この JSON を直接パースする方が変更に強い。

利用規約の確認後に実行すること。レート制限はデフォルト 3 秒/ページ。

CLI:
    python scrape_xwork.py --url "<検索結果URL>" --out companies.json
    python scrape_xwork.py --url "..." --out companies.json --debug-dir ./debug
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse, urlunparse

from playwright.async_api import Page, async_playwright

DEFAULT_DELAY_SEC = 3.0
DEFAULT_TIMEOUT_MS = 30_000

COMPANY_NAME_KEYS = ("companyName", "company_name", "corporationName", "法人名", "company")
ADDRESS_KEYS = ("address", "workAddress", "location", "勤務地", "所在地", "addressText")
PHONE_KEYS = ("phone", "phoneNumber", "tel", "電話番号")
URL_KEYS = ("companyUrl", "homepage", "website", "url", "会社URL")
OCCUPATION_KEYS = ("occupation", "occupationName", "jobCategory", "職種")
JOB_ID_KEYS = ("id", "jobId", "slug", "detailUrl")


async def fetch_next_data(page: Page) -> dict[str, Any]:
    """`__NEXT_DATA__` の JSON を取得する。

    script 要素は非表示なので inner_text() ではなく text_content() を使う。
    """
    locator = page.locator("script#__NEXT_DATA__")
    await locator.wait_for(state="attached", timeout=DEFAULT_TIMEOUT_MS)
    text = await locator.text_content()
    if not text:
        raise RuntimeError("__NEXT_DATA__ found but empty")
    return json.loads(text)


def walk_for_jobs(node: Any) -> list[dict]:
    """`__NEXT_DATA__` を再帰的に走査し、会社名キーを持つ辞書の配列を見つける。

    最も大きな「会社名キーを持つ辞書のリスト」を求人一覧とみなす。
    """
    best: list[dict] = []

    def looks_like_job(d: dict) -> bool:
        return any(k in d for k in COMPANY_NAME_KEYS)

    def visit(x: Any) -> None:
        nonlocal best
        if isinstance(x, list):
            jobs = [v for v in x if isinstance(v, dict) and looks_like_job(v)]
            if len(jobs) > len(best):
                best = jobs
            for v in x:
                visit(v)
        elif isinstance(x, dict):
            for v in x.values():
                visit(v)

    visit(node)
    return best


def pick(d: dict, keys: tuple[str, ...]) -> str:
    for k in keys:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
        if isinstance(v, dict):
            for inner in ("name", "label", "text"):
                if isinstance(v.get(inner), str) and v[inner].strip():
                    return v[inner].strip()
    return ""


def normalize_record(raw: dict, base_url: str) -> dict:
    detail = pick(raw, JOB_ID_KEYS)
    detail_url = ""
    if detail:
        if detail.startswith("http"):
            detail_url = detail
        elif detail.startswith("/"):
            detail_url = urljoin(base_url, detail)
        else:
            detail_url = urljoin(base_url, f"/jobs/{detail}")
    return {
        "company_name": pick(raw, COMPANY_NAME_KEYS),
        "address": pick(raw, ADDRESS_KEYS),
        "phone": pick(raw, PHONE_KEYS),
        "company_url": pick(raw, URL_KEYS),
        "occupation": pick(raw, OCCUPATION_KEYS),
        "detail_url": detail_url,
        "source_url": base_url,
    }


def with_page_param(url: str, page_no: int) -> str:
    parsed = urlparse(url)
    query = [p for p in parsed.query.split("&") if p and not p.startswith("page=")]
    query.append(f"page={page_no}")
    return urlunparse(parsed._replace(query="&".join(query)))


def dump_debug(debug_dir: Path | None, page_no: int, data: dict) -> None:
    if not debug_dir:
        return
    debug_dir.mkdir(parents=True, exist_ok=True)
    (debug_dir / f"next_data_p{page_no}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


STEALTH_INIT = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'languages', {get: () => ['ja-JP', 'ja', 'en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
window.chrome = window.chrome || { runtime: {} };
"""

REAL_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
           "AppleWebKit/537.36 (KHTML, like Gecko) "
           "Chrome/147.0.0.0 Safari/537.36")


async def _launch_browser(pw, headed: bool, use_real_chrome: bool):
    args = ["--disable-blink-features=AutomationControlled"]
    if use_real_chrome:
        try:
            return await pw.chromium.launch(channel="chrome", headless=not headed, args=args)
        except Exception as e:
            print(f"[warn] installed Chrome not available ({e}); falling back to Chromium",
                  file=sys.stderr)
    return await pw.chromium.launch(headless=not headed, args=args)


async def crawl(start_url: str, max_pages: int, delay: float, headed: bool,
                debug_dir: Path | None, use_real_chrome: bool) -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()
    async with async_playwright() as pw:
        browser = await _launch_browser(pw, headed, use_real_chrome)
        ctx = await browser.new_context(
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            user_agent=REAL_UA,
            viewport={"width": 1280, "height": 800},
            extra_http_headers={"Accept-Language": "ja,en-US;q=0.9,en;q=0.8"},
        )
        await ctx.add_init_script(STEALTH_INIT)
        page = await ctx.new_page()
        page.set_default_timeout(DEFAULT_TIMEOUT_MS)
        for i in range(max_pages):
            url = start_url if i == 0 else with_page_param(start_url, i + 1)
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_load_state("networkidle")
            try:
                next_data = await fetch_next_data(page)
            except Exception as e:
                print(f"[page {i + 1}] __NEXT_DATA__ not found: {e}", file=sys.stderr)
                if debug_dir:
                    debug_dir.mkdir(parents=True, exist_ok=True)
                    html = await page.content()
                    (debug_dir / f"page_p{i + 1}.html").write_text(html, encoding="utf-8")
                    print(f"[page {i + 1}] saved HTML to {debug_dir}/page_p{i + 1}.html",
                          file=sys.stderr)
                break
            dump_debug(debug_dir, i + 1, next_data)
            jobs = walk_for_jobs(next_data)
            new_count = 0
            for raw in jobs:
                rec = normalize_record(raw, url)
                if not rec["company_name"] or rec["company_name"] in seen:
                    continue
                seen.add(rec["company_name"])
                results.append(rec)
                new_count += 1
            print(f"[page {i + 1}] +{new_count} (total {len(results)})", file=sys.stderr)
            if new_count == 0:
                break
            await asyncio.sleep(delay)
        await browser.close()
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="x-work.jp 検索結果の起点URL")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--max-pages", type=int, default=50)
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY_SEC)
    ap.add_argument("--headless", action="store_true",
                    help="ブラウザを表示せずに実行する。既定は headed（CloudFront対策）")
    ap.add_argument("--no-real-chrome", action="store_true",
                    help="インストール済み Chrome ではなく Playwright 同梱の Chromium を使う")
    ap.add_argument("--debug-dir", type=Path, default=None,
                    help="__NEXT_DATA__ の生JSONをページごとに保存（構造調査用）")
    args = ap.parse_args()

    data = asyncio.run(crawl(
        args.url, args.max_pages, args.delay,
        headed=not args.headless,
        debug_dir=args.debug_dir,
        use_real_chrome=not args.no_real_chrome,
    ))
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(data)} companies → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
