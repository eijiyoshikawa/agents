"""会社名から公式URLを DuckDuckGo HTML 検索経由で推定する（無料）。

CSE が GCP設定問題で動かない・Places API が課金されすぎる、という背景で
無料の補完手段として実装。DuckDuckGo の HTMLエンドポイントを利用し、
上位結果から公式URLっぽいものを採用する。

- コスト ¥0
- 速度: 約 2〜4秒/件（delay 込み）
- 1日制限なし（ただし礼儀正しくクロール: delay + UA偽装）
- enrich_urls_cse.py と同じインターフェース（--apply / --max-targets / --industry / --media）

CLI:
    python enrich_urls_search.py --industry 建設 --media 建職バンク --max-targets 200
    python enrich_urls_search.py --industry 建設 --media 建職バンク --max-targets 200 --apply
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests

from normalize import normalize_company_name
from notion_client import NotionClient, text_prop, title_of

DDG_HTML_URL = "https://html.duckduckgo.com/html/"
DEFAULT_DELAY_SEC = 2.0
DEFAULT_WORKERS = 2
DEFAULT_MAX_TARGETS = 200

REAL_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/147.0.0.0 Safari/537.36"
)

# 公式サイトとして採用しないドメイン（enrich_urls_cse.py と同じ）
EXCLUDE_DOMAINS = (
    "wikipedia.org", "weblio.jp", "alacrityjp.com",
    "houjin-bangou.nta.go.jp", "info.gbiz.go.jp", "houjin.jp",
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "youtube.com", "youtu.be", "linkedin.com", "tiktok.com",
    "note.com", "pinterest.com",
    "indeed.com", "rikunabi.com", "mynavi.jp", "doda.jp",
    "type.jp", "en-japan.com", "baitoru.com", "townwork.net",
    "engage.cloud.microsoft", "wantedly.com", "green-japan.com",
    "x-work.jp", "gatenshoku.com", "drapita.jp",
    "kenshoku-bank.com",
    "hellowork.mhlw.go.jp", "hellowork.go.jp",
    "kensetsu-job.com", "kensetsutenshoku.com",
    "tabelog.com", "ekiten.jp", "navitime.co.jp", "mapion.co.jp",
    "itp.ne.jp", "google.com", "google.co.jp",
    "bing.com", "yahoo.co.jp", "yahoo.com",
    "duckduckgo.com",
    "ameblo.jp", "hatenablog.com", "livedoor.jp", "fc2.com",
    "prtimes.jp", "businesswire.com", "newscast.jp",
    "homes.co.jp", "suumo.jp", "minkabu.jp",
)

EXCLUDE_EXT = (".pdf", ".jpg", ".jpeg", ".png", ".gif",
               ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx")

# DDG HTML の検索結果リンク（result__a クラス）
DDG_RESULT_RE = re.compile(
    r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"',
    re.IGNORECASE,
)
# 「実体URL」が uddg= パラメータに入っている形式
DDG_REDIRECT_RE = re.compile(r"uddg=([^&]+)")


def _extract_city(address: str) -> str:
    m = re.search(r"([^\s　]+?[市区町村])", address or "")
    return m.group(1) if m else ""


def _is_excluded(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except Exception:
        return True
    domain = (parsed.netloc or "").lower()
    if domain.startswith("www."):
        domain = domain[4:]
    if any(ex in domain for ex in EXCLUDE_DOMAINS):
        return True
    path_lower = parsed.path.lower()
    if any(path_lower.endswith(ext) for ext in EXCLUDE_EXT):
        return True
    return False


def _resolve_ddg_redirect(href: str) -> str:
    """DDG HTML は href が //duckduckgo.com/l/?uddg=<URLエンコード> 形式。
    そのままだとリダイレクトURLなので、uddg を取り出してデコードする。"""
    if not href:
        return ""
    if href.startswith("//"):
        href = "https:" + href
    if "duckduckgo.com/l/" in href:
        m = DDG_REDIRECT_RE.search(href)
        if m:
            try:
                return unquote(m.group(1))
            except Exception:
                return ""
        return ""
    if href.startswith("http"):
        return href
    return ""


def search_ddg(company_name: str, city: str = "",
               timeout: int = 20,
               debug_path: Path | None = None) -> list[str]:
    """DuckDuckGo HTML検索で会社名から候補URLを取得（上位10件）。"""
    query_parts = [f'"{company_name}"']
    if city:
        query_parts.append(city)
    query_parts.append("公式")
    query = " ".join(query_parts)
    headers = {
        "User-Agent": REAL_UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.9",
        "Referer": "https://duckduckgo.com/",
    }
    data = {"q": query, "kl": "jp-jp"}
    for attempt in range(3):
        try:
            r = requests.post(DDG_HTML_URL, data=data,
                              headers=headers, timeout=timeout)
        except requests.RequestException:
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 202:
            time.sleep(2 + attempt * 2)
            continue
        if r.status_code != 200:
            return []
        if debug_path:
            debug_path.write_text(r.text, encoding="utf-8")
        urls: list[str] = []
        seen: set[str] = set()
        for href in DDG_RESULT_RE.findall(r.text):
            resolved = _resolve_ddg_redirect(href)
            if not resolved or resolved in seen:
                continue
            seen.add(resolved)
            urls.append(resolved)
            if len(urls) >= 10:
                break
        return urls
    return []


def pick_best_url(urls: list[str], company_name: str) -> str:
    """除外ドメインフィルタを掛けて、最初のURLを採用。"""
    for url in urls:
        if _is_excluded(url):
            continue
        return url
    return ""


def process_one(page: dict, delay: float,
                debug_dir: Path | None = None) -> dict:
    title = title_of(page)
    address = text_prop(page, "住所")
    existing_url = text_prop(page, "会社URL")
    if not title:
        return {"id": page["id"], "title": "", "status": "no_title"}
    if existing_url:
        return {"id": page["id"], "title": title,
                "status": "already_has_url", "existing_url": existing_url}
    city = _extract_city(address)
    # 礼儀正しいクロール: ランダム delay
    time.sleep(delay + random.uniform(0, 0.5))
    debug_path = None
    if debug_dir:
        debug_dir.mkdir(parents=True, exist_ok=True)
        safe = re.sub(r"[^\w\-]", "_", title)[:50]
        debug_path = debug_dir / f"{safe}.html"
    urls = search_ddg(title, city, debug_path=debug_path)
    if not urls:
        return {"id": page["id"], "title": title, "status": "no_match"}
    url = pick_best_url(urls, title)
    if not url:
        return {"id": page["id"], "title": title,
                "status": "all_excluded", "top_link": urls[0] if urls else ""}
    return {"id": page["id"], "title": title, "status": "ok", "url": url}


def collect_targets(client: NotionClient, max_targets: int,
                    industry: str, media: str) -> list[dict]:
    targets: list[dict] = []
    for page in client.iter_pages():
        if page.get("archived") or page.get("in_trash"):
            continue
        if industry:
            sel = page.get("properties", {}).get("業種", {}).get("select")
            if not sel or sel.get("name") != industry:
                continue
        if media:
            items = page.get("properties", {}).get(
                "掲載元メディア", {}).get("multi_select", [])
            if not any(m.get("name") == media for m in items):
                continue
        if text_prop(page, "会社URL"):
            continue
        targets.append(page)
        if max_targets and len(targets) >= max_targets:
            break
    return targets


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path,
                    default=Path("ddg_urls_report.json"))
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--max-targets", type=int, default=DEFAULT_MAX_TARGETS)
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY_SEC)
    ap.add_argument("--industry", default="")
    ap.add_argument("--media", default="")
    ap.add_argument("--debug-dir", type=Path, default=None,
                    help="各クエリのHTMLレスポンスを保存（構造確認用）")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN required", file=sys.stderr)
        return 2

    client = NotionClient()
    targets = collect_targets(client, args.max_targets,
                              industry=args.industry, media=args.media)
    print(f"[targets] {len(targets)} pages (filter: 業種={args.industry or '-'},"
          f" メディア={args.media or '-'}, 会社URL空)", file=sys.stderr)
    if not targets:
        return 0

    report: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(process_one, p, args.delay, args.debug_dir)
                   for p in targets]
        for i, fut in enumerate(as_completed(futures), 1):
            r = fut.result()
            report.append(r)
            if i % 10 == 0 or i == len(targets):
                ok = sum(1 for r in report if r.get("url"))
                print(f"[progress] {i}/{len(targets)}  urls={ok}",
                      file=sys.stderr, flush=True)

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    summary = {
        "targets": len(targets),
        "urls_found": sum(1 for r in report if r.get("url")),
        "no_match": sum(1 for r in report if r["status"] == "no_match"),
        "all_excluded": sum(1 for r in report
                            if r["status"] == "all_excluded"),
        "already_has_url": sum(1 for r in report
                               if r["status"] == "already_has_url"),
    }
    print(f"\n{json.dumps(summary, ensure_ascii=False, indent=2)}")
    print(f"[report] written → {args.report}")

    if not args.apply:
        print("\n[dry-run] use --apply to write to Notion")
        return 0

    print(f"\n[apply] writing URLs to Notion...")
    applied = 0
    errors = 0
    for r in report:
        if not r.get("url"):
            continue
        try:
            client.update_properties(r["id"], {
                "会社URL": {"url": r["url"]},
            })
            applied += 1
        except Exception as e:
            errors += 1
            print(f"[error] {r['title']}: {e}", file=sys.stderr)
    print(f"[apply] urls_applied={applied}, errors={errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

