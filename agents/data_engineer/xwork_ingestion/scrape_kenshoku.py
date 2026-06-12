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
    `ver` パラメータが無いと page=2 以降のページネーションが効かない
    （1ページ目と同じ結果を返す）ことを確認済み。
    """
    pref_csv = ",".join(prefectures)
    params = [
        ("jobs_search[prefecture_names]", pref_csv),
        ("ver", "issue_4359"),
    ]
    if page_num > 1:
        params.append(("page", str(page_num)))
    return f"{SEARCH_URL}?{urlencode(params, quote_via=quote)}"


async def _next_page_url(page: Page) -> str | None:
    """「次のページ」リンクを抽出する（フォールバック用）。"""
    try:
        href = await page.evaluate("""() => {
            const sel = [
                'a[rel="next"]',
                'a.pagination__next',
                '.pagination a[href*="page="]:last-of-type',
                'a:has(span:contains("次"))',
            ];
            for (const s of sel) {
                try {
                    const el = document.querySelector(s);
                    if (el && el.href) return el.href;
                } catch (e) {}
            }
            // すべての /jobs/search?...&page=N のリンクから最大値を探す
            const links = Array.from(document.querySelectorAll(
                'a[href*="/jobs/search"][href*="page="]'));
            let maxP = 0, best = null;
            for (const l of links) {
                const m = l.href.match(/page=(\\d+)/);
                if (m) {
                    const p = parseInt(m[1], 10);
                    if (p > maxP) { maxP = p; best = l.href; }
                }
            }
            return best;
        }""")
        return href
    except Exception:
        return None


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
    """検索結果ページから求人URL（/jobs/{ID}）を収集する。

    1ページ目は build_search_url で構築。2ページ目以降は
    DOM 内の「次のページ」リンクを動的に辿る（クエリパラメータが
    隠れたセッショントークン optx_rd を必要とするため）。
    """
    job_ids: set[str] = set()
    url: str | None = build_search_url(prefectures, 1)
    for page_num in range(1, max_pages + 1):
        if not url:
            print(f"[search p{page_num}] no next URL; stop", file=sys.stderr)
            break
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
        # 次のページ URL を動的に取得（無ければ build_search_url にフォールバック）
        next_url = await _next_page_url(page)
        url = next_url if next_url else build_search_url(prefectures, page_num + 1)
        await asyncio.sleep(delay)
    return [f"{BASE_URL}/jobs/{jid}" for jid in sorted(job_ids, key=int)]


def _clean_text(text: str | None) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip()
    # ラベル値の末尾によく付くUI文字列を除去
    cleaned = re.sub(r"\s*(詳しく見る|もっと見る|もっと表示)\s*$", "",
                     cleaned).strip()
    return cleaned


def _parse_company_overview(body_text: str,
                            links: list[dict]) -> dict[str, str]:
    """ページテキストから「ラベル: 値」をスキャンする。

    建職バンクの会社概要は、ラベルと値が改行で並ぶことが多い。
    "会社名\\n株式会社XXX\\n会社HP\\nhttps://..." のような並び。
    """
    if not body_text:
        return {}
    # 会社概要セクション以降に絞ると精度が上がる
    section = body_text
    if "会社概要" in body_text:
        section = body_text.split("会社概要", 1)[1]
    # 後続セクションのノイズを切る
    for stop in ("条件が近いおすすめ求人", "同じ条件の求人を見る",
                 "建職バンクとは", "資格から探す"):
        if stop in section:
            section = section.split(stop, 1)[0]
            break

    lines = [l.strip() for l in section.splitlines() if l.strip()]
    info: dict[str, str] = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        # 「ラベル: 値」形式（同一行）
        m = re.match(r"^(会社名|社名|会社HP|ホームページ|住所|本社所在地|"
                     r"従業員数|資本金|設立|創業|詳細説明|事業内容)\s*[::]\s*(.+)$",
                     line)
        if m:
            info.setdefault(m.group(1), m.group(2).strip())
            i += 1
            continue
        # ラベル単独行 → 次の非空行が値
        if line in LABEL_KEYS and i + 1 < len(lines):
            value = lines[i + 1]
            if value not in LABEL_KEYS:
                info.setdefault(line, value)
                i += 2
                continue
        i += 1

    # 会社HP は body_text からのテキストだとリンクになっていない
    # 可能性があるので、links の中から「about / company / corporate」
    # に近いURLを採用する
    if "会社HP" not in info and links:
        for lk in links:
            href = lk.get("href", "")
            if any(k in href.lower() for k in
                   ("/about", "/company", "corporate", "profile")):
                info.setdefault("会社HP", href)
                break

    return info


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


LABEL_KEYS = ["会社名", "社名", "会社HP", "ホームページ", "住所",
              "本社所在地", "従業員数", "資本金", "設立", "創業",
              "詳細説明", "事業内容"]


async def extract_company_info(page: Page, job_url: str,
                               debug_dir: Path | None = None) -> dict | None:
    """求人詳細ページの「会社概要」セクションから会社情報を抽出する。

    DOM構造に依存せず、ページ全体テキストから「ラベル: 値」パターンで
    会社情報を取り出す方式。建職バンクのHTMLは構造化されているが、
    複数の表現パターン(dl/table/div) に汎用対応するためテキストベース。
    """
    try:
        await page.goto(job_url, wait_until="domcontentloaded")
    except Exception as e:
        print(f"[detail {job_url}] navigation failed: {e}", file=sys.stderr)
        return None

    # まず会社概要セクションが現れるまで少し待つ（クライアント側レンダリング対策）
    try:
        await page.wait_for_selector("text=会社概要", timeout=5000)
    except Exception:
        pass

    body_text = await page.evaluate("() => document.body.innerText || ''")

    # 「会社HP」直後にリンクが入る形式が多いため、a 要素のテキスト+href も収集
    links = await page.eval_on_selector_all(
        "a[href^='http']",
        "els => els.map(e => ({text: (e.innerText||'').trim(), href: e.href}))",
    )

    if debug_dir:
        debug_dir.mkdir(parents=True, exist_ok=True)
        job_id = job_url.rstrip("/").split("/")[-1]
        (debug_dir / f"job_{job_id}.txt").write_text(
            body_text or "(empty)", encoding="utf-8")
        (debug_dir / f"job_{job_id}_links.json").write_text(
            json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8")

    info = _parse_company_overview(body_text, links)

    if not info:
        return None

    company_name = (info.get("会社名") or info.get("社名") or "").strip()
    company_hp = (info.get("会社HP") or info.get("ホームページ") or "").strip()
    head_address = (info.get("住所") or info.get("本社所在地") or "").strip()
    employee_count = _parse_employee_count(info.get("従業員数", ""))
    capital = (info.get("資本金") or "").strip()
    founded = (info.get("設立") or info.get("創業") or "").strip()
    description = (info.get("詳細説明") or info.get("事業内容") or "").strip()

    if not company_name:
        # body_text の最初の方に「<東京>...」の前に会社名があるパターン
        company_name = info.get("_fallback_name", "").strip()

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

    会社概要セクションを除外したテキストから「勤務地詳細→支店所在地→勤務地」
    の順でラベル直後の値を取得する。本社住所と求人勤務地が違うことが多いため
    （本社=東京、求人=大阪 等）、別フィールドとして保持する。
    """
    body_text = await page.evaluate("() => document.body.innerText || ''")
    if not body_text:
        return ""
    # 会社概要セクションを除外（このセクション内の住所は本社住所であり、
    # 求人勤務地ではない）
    if "会社概要" in body_text:
        body_text = body_text.split("会社概要", 1)[0]

    for label in ("勤務地詳細", "支店所在地", "勤務地"):
        # ラベル直後の改行→値、または「ラベル: 値」形式
        pattern = rf"{label}\s*[::]?\s*\n?\s*([^\n]+(?:\n[^\n]+)?)"
        m = re.search(pattern, body_text)
        if not m:
            continue
        value = _clean_text(m.group(1))
        if value in ("", "詳しく見る"):
            continue
        return value[:200]
    return ""


async def _extract_occupation(page: Page) -> str:
    """求人本体の職種を取得する（パンくず or 「職種」ラベル）。"""
    body_text = await page.evaluate("() => document.body.innerText || ''")
    if not body_text:
        return ""
    if "会社概要" in body_text:
        body_text = body_text.split("会社概要", 1)[0]
    m = re.search(r"職種\s*\n?\s*([^\n]+)", body_text)
    if m:
        value = _clean_text(m.group(1))
        if value not in ("", "詳しく見る"):
            return value[:80]
    return ""


async def crawl(prefectures: list[str], max_pages: int, delay: float,
                headed: bool, use_real_chrome: bool,
                limit_jobs: int | None = None,
                debug_dir: Path | None = None) -> list[dict]:
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
            info = await extract_company_info(page, job_url, debug_dir=debug_dir)
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
    ap.add_argument("--debug-dir", type=Path, default=None,
                    help="各求人ページの body text を保存（構造調査用）")
    args = ap.parse_args()

    data = asyncio.run(crawl(
        args.prefecture, args.max_pages, args.delay,
        headed=not args.headless,
        use_real_chrome=not args.no_real_chrome,
        limit_jobs=args.limit_jobs,
        debug_dir=args.debug_dir,
    ))
    args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"wrote {len(data)} companies → {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
