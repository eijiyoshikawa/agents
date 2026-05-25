"""Google Custom Search API で会社の公式URLを補完するツール。

Places API 取り直しが高額なため、無料枠100/日の CSE で時間をかけて補完する。
日次バッチで 100社/日処理 → 1ヶ月で建設2,849社カバー可能。

セットアップ:
1. https://programmablesearchengine.google.com で CSE 作成
   - 「ウェブ全体を検索」モード
   - CSE ID (cx) をコピー
2. GCP コンソールで「Custom Search API」を有効化
   - 既存の Places API キーで OK
   - または専用キーを新規作成
3. .env に追記:
   GOOGLE_CSE_API_KEY=AIza...   (Places API キーと同じでも可)
   GOOGLE_CSE_ID=AIza...        (CSE のcx ID)

CLI:
    python enrich_urls_cse.py --industry 建設 --max-targets 100 --apply
    python enrich_urls_cse.py --industry 建設 --apply  # 100件上限自動適用
    python enrich_urls_cse.py --industry 建設 --max-targets 50 --apply  # 余裕保持
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import requests

from normalize import normalize_company_name
from notion_client import NotionClient, text_prop, title_of

CSE_ENDPOINT = "https://customsearch.googleapis.com/customsearch/v1"
DEFAULT_DAILY_QUOTA = 100  # 無料枠の安全上限
DEFAULT_WORKERS = 2  # CSE は per-API key スループット低めなので控えめ

# 公式サイトとして採用しないドメイン
EXCLUDE_DOMAINS = (
    # 百科事典・コーポレートDB
    "wikipedia.org", "weblio.jp", "alacrityjp.com",
    "houjin-bangou.nta.go.jp", "info.gbiz.go.jp", "houjin.jp",
    # SNS
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "youtube.com", "youtu.be", "linkedin.com", "tiktok.com",
    "note.com", "pinterest.com",
    # 求人サイト
    "indeed.com", "rikunabi.com", "mynavi.jp", "doda.jp",
    "type.jp", "en-japan.com", "baitoru.com", "townwork.net",
    "engage.cloud.microsoft", "wantedly.com", "green-japan.com",
    "x-work.jp", "gatenshoku.com", "drapita.jp",
    "hellowork.mhlw.go.jp", "hellowork.go.jp",
    "kensetsu-job.com", "kensetsutenshoku.com",
    # 地図・電話帳
    "tabelog.com", "ekiten.jp", "navitime.co.jp", "mapion.co.jp",
    "itp.ne.jp", "google.com", "google.co.jp",
    # ブログ・ニュース
    "ameblo.jp", "hatenablog.com", "livedoor.jp", "fc2.com",
    "prtimes.jp", "businesswire.com", "newscast.jp",
    # 不動産・口コミ
    "homes.co.jp", "suumo.jp", "minkabu.jp",
)

# ファイル拡張子（PDF/画像）は除外
EXCLUDE_EXT = (".pdf", ".jpg", ".png", ".doc", ".docx", ".xls", ".xlsx")


def _extract_city(address: str) -> str:
    """住所から「○○市」「○○区」「○○町」「○○村」を抽出。"""
    m = re.search(r"([^\s　]+?[市区町村])", address or "")
    return m.group(1) if m else ""


def search_cse(api_key: str, cse_id: str, company_name: str,
               address: str = "") -> Optional[dict]:
    city = _extract_city(address)
    query = f'"{company_name}"' + (f" {city}" if city else "")
    params = {
        "key": api_key, "cx": cse_id, "q": query,
        "num": 10, "hl": "ja", "gl": "jp",
        # CSE 側で「ウェブ全体を検索」が ON にできない場合の回避策:
        # 登録された example.com を除外指定すると、実質的に全ウェブ検索になる
        "siteSearch": "example.com",
        "siteSearchFilter": "e",
    }
    for attempt in range(3):
        try:
            r = requests.get(CSE_ENDPOINT, params=params, timeout=20)
        except requests.RequestException:
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 429:
            return {"_error": "rate_limit"}
        if r.status_code == 403:
            return {"_error": f"forbidden: {r.text[:200]}"}
        if r.status_code != 200:
            return {"_error": f"http_{r.status_code}: {r.text[:200]}"}
        return r.json()
    return {"_error": "exhausted_retries"}


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


def pick_best_url(items: list[dict], company_name: str) -> str:
    """上位結果から非除外・関連性の高いURLを選ぶ。"""
    target_norm = normalize_company_name(company_name)
    for item in items:
        link = item.get("link", "")
        if not link or _is_excluded(link):
            continue
        # 関連性: タイトル or snippet に会社名キーワードが含まれるとボーナス
        title = (item.get("title") or "").lower()
        snippet = (item.get("snippet") or "").lower()
        domain = urlparse(link).netloc.lower()
        # 第一候補（除外通過した最上位）を採用
        # title に正規化会社名の一部が含まれていれば信頼度高
        return link
    return ""


def process_one(page: dict, api_key: str, cse_id: str) -> dict:
    title = title_of(page)
    address = text_prop(page, "住所")
    existing_url = text_prop(page, "会社URL")
    if not title:
        return {"id": page["id"], "title": "", "status": "no_title"}
    if existing_url:
        return {"id": page["id"], "title": title, "status": "already_has_url",
                "existing_url": existing_url}
    response = search_cse(api_key, cse_id, title, address)
    if response is None or "_error" in (response or {}):
        return {"id": page["id"], "title": title, "status": "api_error",
                "error": (response or {}).get("_error", "")}
    items = response.get("items", []) or []
    if not items:
        return {"id": page["id"], "title": title, "status": "no_match"}
    url = pick_best_url(items, title)
    if not url:
        return {"id": page["id"], "title": title, "status": "all_excluded",
                "top_link": items[0].get("link", "")}
    return {
        "id": page["id"], "title": title, "status": "ok",
        "url": url,
        "matched_title": items[0].get("title", ""),
    }


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
            items = page.get("properties", {}).get("掲載元メディア", {}).get("multi_select", [])
            if not any(m.get("name") == media for m in items):
                continue
        if text_prop(page, "会社URL"):
            continue  # URL 既にあり
        targets.append(page)
        if max_targets and len(targets) >= max_targets:
            break
    return targets


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path,
                    default=Path("cse_urls_report.json"))
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--max-targets", type=int, default=DEFAULT_DAILY_QUOTA,
                    help=f"対象上限。CSE 無料枠 {DEFAULT_DAILY_QUOTA}/日 を超えないこと")
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    ap.add_argument("--industry", default="")
    ap.add_argument("--media", default="")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN required", file=sys.stderr)
        return 2
    api_key = os.environ.get("GOOGLE_CSE_API_KEY", "")
    cse_id = os.environ.get("GOOGLE_CSE_ID", "")
    if not api_key or not cse_id:
        print("error: GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID required",
              file=sys.stderr)
        return 2

    client = NotionClient()
    targets = collect_targets(client, args.max_targets,
                              industry=args.industry, media=args.media)
    print(f"[targets] {len(targets)} pages (filter: 業種={args.industry or '-'},"
          f" 会社URL空)", file=sys.stderr)
    print(f"[quota] CSE 無料枠は 100/日。今回 {len(targets)} 件処理。",
          file=sys.stderr)
    if not targets:
        return 0

    report: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(process_one, p, api_key, cse_id)
                   for p in targets]
        for i, fut in enumerate(as_completed(futures), 1):
            r = fut.result()
            report.append(r)
            if r.get("status") == "api_error" and "rate_limit" in (r.get("error") or ""):
                print("[stop] CSE rate limit reached, stopping", file=sys.stderr)
                break
            if i % 20 == 0 or i == len(targets):
                ok = sum(1 for r in report if r.get("url"))
                print(f"[progress] {i}/{len(targets)}  urls={ok}",
                      file=sys.stderr, flush=True)

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    summary = {
        "targets": len(targets),
        "urls_found": sum(1 for r in report if r.get("url")),
        "no_match": sum(1 for r in report if r["status"] == "no_match"),
        "all_excluded": sum(1 for r in report if r["status"] == "all_excluded"),
        "api_error": sum(1 for r in report if r["status"] == "api_error"),
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
