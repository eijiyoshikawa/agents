"""x-work.jp 検索結果ページから企業情報を収集して JSON に書き出す。

利用規約の確認後に実行すること。レート制限はデフォルト 3 秒/ページ。

CLI:
    python scrape_xwork.py --url "<検索結果URL>" --out companies.json
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import Page, async_playwright

DEFAULT_DELAY_SEC = 3.0
DEFAULT_TIMEOUT_MS = 30_000


async def extract_companies_on_page(page: Page) -> list[dict]:
    """1ページ分の求人カードから企業情報を抽出する。

    NOTE: x-work.jp のセレクタは変更されうるため、最初の数件で要素を確認してから
    本番運用に入ること。現在のセレクタはプレースホルダで、初回実行時に
    --selector-debug で実HTMLを保存し、必要なら調整すること。
    """
    cards = await page.locator("[data-testid='job-card'], article, .job-card").all()
    out: list[dict] = []
    for card in cards:
        name = (await _text_or_empty(card, ".company-name, [data-company]")).strip()
        if not name:
            continue
        out.append({
            "company_name": name,
            "address": (await _text_or_empty(card, ".company-address, .location")).strip(),
            "occupation": (await _text_or_empty(card, ".occupation, .job-title")).strip(),
            "source_url": page.url,
        })
    return out


async def _text_or_empty(loc, selector: str) -> str:
    target = loc.locator(selector).first
    if await target.count() == 0:
        return ""
    return await target.inner_text()


async def crawl(start_url: str, max_pages: int, delay: float, headed: bool) -> list[dict]:
    results: list[dict] = []
    seen_names: set[str] = set()
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=not headed)
        ctx = await browser.new_context(locale="ja-JP")
        page = await ctx.new_page()
        page.set_default_timeout(DEFAULT_TIMEOUT_MS)
        await page.goto(start_url, wait_until="domcontentloaded")
        for i in range(max_pages):
            await page.wait_for_load_state("networkidle")
            page_items = await extract_companies_on_page(page)
            for item in page_items:
                if item["company_name"] in seen_names:
                    continue
                seen_names.add(item["company_name"])
                results.append(item)
            print(f"[page {i + 1}] +{len(page_items)} (total {len(results)})", file=sys.stderr)
            next_link = page.locator("a[rel='next'], .pagination-next, a:has-text('次へ')").first
            if await next_link.count() == 0:
                break
            await next_link.click()
            await asyncio.sleep(delay)
        await browser.close()
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True, help="x-work.jp 検索結果の起点URL")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--max-pages", type=int, default=50)
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY_SEC)
    ap.add_argument("--headed", action="store_true", help="ブラウザを表示する（初回検証用）")
    args = ap.parse_args()

    data = asyncio.run(crawl(args.url, args.max_pages, args.delay, args.headed))
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(data)} companies → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
