"""x-work.jp 検索結果ページから企業情報を収集して JSON に書き出す。

x-work.jp は Next.js 製で、ページ内の `<script id="__NEXT_DATA__">` に
求人一覧の構造化データが埋め込まれている。`props.pageProps.data.records[]`
が検索結果（各レコードは1求人。同一会社の複数求人が並ぶことがあるので
会社名で重複排除する）。

利用規約の確認後に実行すること。レート制限はデフォルト 3 秒/ページ。

CLI:
    python scrape_xwork.py --url "<検索結果URL>" --out companies.json
    python scrape_xwork.py --url "..." --out companies.json --debug-dir ./debug
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

from playwright.async_api import Page, async_playwright

DEFAULT_DELAY_SEC = 3.0
DEFAULT_TIMEOUT_MS = 30_000
BASE_URL = "https://x-work.jp"

# company.detail は「・項目名：値\n」の繰り返し。汎用的な行パーサを用意する。
COMPANY_DETAIL_LINE_RE = re.compile(r"^[・･]?\s*([^：:]+)[：:]\s*(.+?)\s*$")

# 数値抽出：「11人」「5,000万円」など
INT_FROM_TEXT_RE = re.compile(r"([\d,]+)")


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


def extract_records(next_data: dict) -> list[dict]:
    """`props.pageProps.data.records[]` を取り出す。

    見つからない場合は空配列を返す。x-work.jp 側で構造が変わったときは
    debug-dir に保存された生 JSON を見て path を調整する。
    """
    return (next_data.get("props", {})
            .get("pageProps", {})
            .get("data", {})
            .get("records", []) or [])


def parse_company_detail(text: str) -> dict[str, str]:
    """`company.detail` の「・項目名：値」行をキー化して dict にする。"""
    out: dict[str, str] = {}
    if not text:
        return out
    for raw_line in text.splitlines():
        m = COMPANY_DETAIL_LINE_RE.match(raw_line)
        if not m:
            continue
        key = m.group(1).strip()
        value = m.group(2).strip()
        if key and value:
            out[key] = value
    return out


def _to_int(text: str) -> int | None:
    m = INT_FROM_TEXT_RE.search(text or "")
    if not m:
        return None
    try:
        return int(m.group(1).replace(",", ""))
    except ValueError:
        return None


def normalize_record(raw: dict, source_url: str) -> dict:
    company = raw.get("company") or {}
    location = raw.get("location") or {}
    company_detail_text = company.get("detail") or ""
    detail = parse_company_detail(company_detail_text)
    pk = raw.get("pk") or ""
    return {
        "company_name": (company.get("name") or "").strip(),
        "address": (location.get("detail") or company.get("location") or "").strip(),
        "zip_code": (location.get("zipCode") or "").strip(),
        "prefecture": (location.get("prefecture") or "").strip(),
        "city": (location.get("city") or "").strip(),
        "phone": "",
        "company_url": "",
        "occupation": (raw.get("helloWorkOccupationName") or "").strip(),
        "representative": detail.get("代表者名", ""),
        "representative_title": detail.get("代表者役職", ""),
        "business_content": detail.get("事業内容", ""),
        "company_feature": detail.get("会社の特長", ""),
        "employee_count_total": _to_int(detail.get("従業員数企業全体", "")),
        "employee_count_workplace": _to_int(detail.get("従業員数就業場所", "")),
        "employee_count_female": _to_int(detail.get("従業員数うち女性", "")),
        "employee_count_part_time": _to_int(detail.get("従業員数うちパート", "")),
        "capital": detail.get("資本金", ""),
        "detail_url": f"{BASE_URL}/jobs/{pk}" if pk else "",
        "hello_work_company_id": (raw.get("helloWorkCompanyId") or "").strip(),
        "source_url": source_url,
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
            # networkidle は x-work.jp の常時 beacon で到達しないため待たない。
            # __NEXT_DATA__ は SSR 済みで domcontentloaded 時点で取得可能。
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
            records = extract_records(next_data)
            new_count = 0
            for raw in records:
                rec = normalize_record(raw, url)
                if not rec["company_name"] or rec["company_name"] in seen:
                    continue
                seen.add(rec["company_name"])
                results.append(rec)
                new_count += 1
            print(f"[page {i + 1}] +{new_count} (records={len(records)}, total={len(results)})",
                  file=sys.stderr)
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
