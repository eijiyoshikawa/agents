"""建職バンク（kenshoku-bank.com）から企業情報を収集して JSON に書き出す。

2段階クロール:
  1. 検索結果ページ（jobs/search）から各求人カードの /jobs/{ID} を収集
  2. 各求人詳細ページの「会社概要」セクションから会社情報を抽出
     - 会社名 / 会社HP / 住所 / 従業員数 / 資本金 / 設立 / 詳細説明

利用規約の確認後に実行すること。レート制限はデフォルト 2.5 秒/ページ。

CLI:
    python scrape_kenshoku.py --prefecture 大阪府 --out companies.json
    python scrape_kenshoku.py --prefecture 大阪府 京都府 --out companies.json
    python scrape_kenshoku.py --prefecture 大阪府 --out companies.json --max-pages 30
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote, urlencode

from playwright.async_api import Page, async_playwright

DEFAULT_DELAY_SEC = 2.5
DEFAULT_TIMEOUT_MS = 30_000
BASE_URL = "https://kenshoku-bank.com"
SEARCH_URL = f"{BASE_URL}/jobs/search"

JOB_PATH_RE = re.compile(r"^/jobs/(\d+)/?$")
EMPLOYEE_RE = re.compile(r"([\d,]+)\s*(?:人|名)")
ZIPCODE_RE = re.compile(r"〒?\d{3}-?\d{4}")

REAL_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
           "AppleWebKit/537.36 (KHTML, like Gecko) "
           "Chrome/147.0.0.0 Safari/537.36")

STEALTH_INIT = """
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
Object.defineProperty(navigator, 'languages', {get: () => ['ja-JP', 'ja', 'en-US', 'en']});
Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
window.chrome = window.chrome || { runtime: {} };
"""


def build_search_url(prefectures: list[str], page_num: int = 1) -> str:
    """検索結果ページのURLを構築する。

    建職バンクは jobs_search[prefecture_names]=県名,県名 形式。
    """
    pref_csv = ",".join(prefectures)
    params = [("jobs_search[prefecture_names]", pref_csv)]
    if page_num > 1:
        params.append(("page", str(page_num)))
    return f"{SEARCH_URL}?{urlencode(params, quote_via=quote)}"


async def _launch_browser(pw, headed: bool, use_real_chrome: bool):
    args = ["--disable-blink-features=AutomationControlled"]
    if use_real_chrome:
        try:
            return await pw.chromium.launch(channel="chrome",
                                            headless=not headed, args=args)
        except Exception as e:
            print(f"[warn] installed Chrome not available ({e}); "
                  f"falling back to Chromium", file=sys.stderr)
    return await pw.chromium.launch(headless=not headed, args=args)


async def collect_job_urls(page: Page, prefectures: list[str],
                           max_pages: int, delay: float) -> list[str]:
    """検索結果ページから求人URL（/jobs/{ID}）を収集する。"""
    job_ids: set[str] = set()
    for page_num in range(1, max_pages + 1):
        url = build_search_url(prefectures, page_num)
        try:
            await page.goto(url, wait_until="domcontentloaded")
        except Exception as e:
            print(f"[search p{page_num}] navigation failed: {e}",
                  file=sys.stderr)
            break
        hrefs = await page.eval_on_selector_all(
            'a[href^="/jobs/"]',
            "els => els.map(e => e.getAttribute('href'))",
        )
        new = 0
        for href in hrefs:
            if not href:
                continue
            m = JOB_PATH_RE.match(href.split("?")[0])
            if not m:
                continue
            jid = m.group(1)
            if jid not in job_ids:
                job_ids.add(jid)
                new += 1
        print(f"[search p{page_num}] +{new} (total={len(job_ids)})",
              file=sys.stderr)
        if new == 0:
            break
        await asyncio.sleep(delay)
    return [f"{BASE_URL}/jobs/{jid}" for jid in sorted(job_ids, key=int)]


def _clean_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _parse_employee_count(text: str) -> int | None:
    if not text:
        return None
    m = EMPLOYEE_RE.search(text)
    if not m:
        return None
    try:
        return int(m.group(1).replace(",", ""))
    except ValueError:
        return None


async def extract_company_info(page: Page, job_url: str) -> dict | None:
    """求人詳細ページの「会社概要」セクションから会社情報を抽出する。

    建職バンクの会社概要は、ラベル列+値列の表（dt/dd または th/td）構造。
    汎用的に拾うため、ラベル文字列をキーに探す。
    """
    try:
        await page.goto(job_url, wait_until="domcontentloaded")
    except Exception as e:
        print(f"[detail {job_url}] navigation failed: {e}", file=sys.stderr)
        return None

    # 「会社概要」セクション全体を取得。dt/dd でラベル+値が並ぶ構造を想定。
    # 失敗しても部分抽出できるよう、複数のセレクタを試す。
    rows = await page.eval_on_selector_all(
        "dl dt, dl dd, table th, table td",
        """els => {
            const out = [];
            for (let i = 0; i < els.length; i++) {
                out.push({ tag: els[i].tagName.toLowerCase(),
                           text: els[i].innerText || '',
                           href: els[i].querySelector('a') ?
                                 els[i].querySelector('a').href : '' });
            }
            return out;
        }""",
    )
    info: dict[str, str] = {}
    # dl: dt → dd, table: th → td の順で隣接ペアになる前提
    last_label: str | None = None
    last_tag: str | None = None
    for cell in rows:
        text = _clean_text(cell.get("text"))
        tag = cell.get("tag")
        if tag in ("dt", "th"):
            last_label = text
            last_tag = tag
        elif tag in ("dd", "td") and last_label:
            if last_label not in info:
                info[last_label] = text
                # 会社HP の <a> の href を優先採用
                if "HP" in last_label and cell.get("href"):
                    info[last_label] = cell.get("href")
            last_label = None
            last_tag = None

    if not info:
        return None

    company_name = (info.get("会社名") or info.get("社名") or "").strip()
    company_hp = (info.get("会社HP") or info.get("ホームページ") or "").strip()
    head_address = (info.get("住所") or info.get("本社所在地") or "").strip()
    employee_count = _parse_employee_count(info.get("従業員数", ""))
    capital = (info.get("資本金") or "").strip()
    founded = (info.get("設立") or info.get("創業") or "").strip()
    description = (info.get("詳細説明") or info.get("事業内容") or "").strip()

    # 勤務地（求人）は会社概要外。求人本体の方にある。
    workplace_address = await _extract_workplace_address(page)
    occupation = await _extract_occupation(page)

    if not company_name:
        return None

    return {
        "company_name": company_name,
        "company_hp": company_hp,
        "address": head_address,
        "workplace_address": workplace_address,
        "phone": "",
        "company_url": company_hp,
        "occupation": occupation,
        "representative": "",
        "representative_title": "",
        "business_content": "",
        "company_feature": "",
        "employee_count_total": employee_count,
        "employee_count_workplace": None,
        "employee_count_female": None,
        "employee_count_part_time": None,
        "capital": capital,
        "founded": founded,
        "description": description,
        "detail_url": job_url,
        "hello_work_company_id": "",
        "source_url": job_url,
    }


async def _extract_workplace_address(page: Page) -> str:
    """求人本体の「勤務地」「勤務地詳細」を取り出す。

    建職バンクは「勤務地」表示が短いことも多いので、より詳細な
    「勤務地詳細」「支店所在地」「アクセス」のうち住所らしいものを採用する。
    """
    try:
        candidates = await page.eval_on_selector_all(
            "section, div, td, dd",
            """els => {
                const out = [];
                for (const el of els) {
                    const t = (el.innerText || '').trim();
                    if (!t) continue;
                    if (t.length > 200) continue;
                    if (t.includes('〒') || t.match(/[都道府県].{0,15}[市区町村]/)) {
                        out.push(t);
                    }
                }
                return out.slice(0, 5);
            }""",
        )
    except Exception:
        return ""
    for c in candidates:
        m = ZIPCODE_RE.search(c)
        if m:
            return _clean_text(c)
    if candidates:
        return _clean_text(candidates[0])
    return ""


async def _extract_occupation(page: Page) -> str:
    """求人本体の職種を取得する（パンくず or ラベル）。"""
    try:
        text = await page.eval_on_selector(
            "nav, ol, .breadcrumb",
            "el => el ? (el.innerText || '') : ''",
        )
    except Exception:
        return ""
    if not text:
        return ""
    parts = [p.strip() for p in re.split(r"[>›/›\n]", text) if p.strip()]
    # 最後はその求人タイトル。最後から2番目あたりが職種カテゴリ。
    if len(parts) >= 2:
        return parts[-2]
    return ""


async def crawl(prefectures: list[str], max_pages: int, delay: float,
                headed: bool, use_real_chrome: bool,
                limit_jobs: int | None = None) -> list[dict]:
    results: list[dict] = []
    seen_companies: set[str] = set()
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

        print(f"[step1] collecting job URLs for {prefectures}", file=sys.stderr)
        job_urls = await collect_job_urls(page, prefectures, max_pages, delay)
        print(f"[step1] {len(job_urls)} job URLs collected", file=sys.stderr)

        if limit_jobs is not None:
            job_urls = job_urls[:limit_jobs]
            print(f"[step2] limited to first {len(job_urls)} jobs",
                  file=sys.stderr)

        print(f"[step2] extracting company info from {len(job_urls)} jobs",
              file=sys.stderr)
        for i, job_url in enumerate(job_urls, 1):
            info = await extract_company_info(page, job_url)
            if info is None:
                print(f"[detail {i}/{len(job_urls)}] skip "
                      f"(no info): {job_url}", file=sys.stderr)
                await asyncio.sleep(delay)
                continue
            name = info["company_name"]
            if name in seen_companies:
                if i % 20 == 0 or i == len(job_urls):
                    print(f"[detail {i}/{len(job_urls)}] dup company "
                          f"{name!r} (unique={len(results)})", file=sys.stderr)
            else:
                seen_companies.add(name)
                results.append(info)
                if i % 20 == 0 or i == len(job_urls):
                    print(f"[detail {i}/{len(job_urls)}] +{name!r} "
                          f"(unique={len(results)})", file=sys.stderr)
            await asyncio.sleep(delay)
        await browser.close()
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefecture", nargs="+", required=True,
                    help="都道府県名（漢字、例: 大阪府 京都府）。複数指定可")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--max-pages", type=int, default=100,
                    help="検索結果ページの上限（既定: 100）")
    ap.add_argument("--limit-jobs", type=int, default=None,
                    help="詳細クロールする求人数の上限（既定: 全件）")
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY_SEC)
    ap.add_argument("--headless", action="store_true",
                    help="ブラウザを表示せずに実行する。既定は headed")
    ap.add_argument("--no-real-chrome", action="store_true",
                    help="インストール済み Chrome ではなく Chromium を使う")
    args = ap.parse_args()

    data = asyncio.run(crawl(
        args.prefecture, args.max_pages, args.delay,
        headed=not args.headless,
        use_real_chrome=not args.no_real_chrome,
        limit_jobs=args.limit_jobs,
    ))
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"wrote {len(data)} companies → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
