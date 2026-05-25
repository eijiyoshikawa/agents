"""Google Places API (New) で電話番号・公式URLを補完するツール。

x-work / gBizINFO で取れなかった会社の連絡先を、Google の公式API経由で
取得する。規約完全OKの代替手段（iタウンページなどの非公式スクレイプは
規約違反のため不採用）。

料金（2024時点）:
- Text Search Pro: $0.032/件（電話・URL含む詳細取得）
- 新規GCPプロジェクトに $200/月の無料クレジット → 約6,000件/月まで無料

API キーの取得手順:
1. https://console.cloud.google.com で新規プロジェクト作成
2. APIライブラリ → "Places API (New)" を有効化
3. 認証情報 → APIキー作成
4. .env に GOOGLE_PLACES_API_KEY=AIza... を追記

CLI:
    python enrich_places.py --industry 建設 --report places.json   # dry-run
    python enrich_places.py --industry 建設 --apply                # 本実行
    python enrich_places.py --industry 建設 --max-targets 100 --apply
    python enrich_places.py --include-with-phone-empty-url-only --apply  # URL空のみ
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

import requests

from normalize import normalize_company_name, normalize_phone
from notion_client import NotionClient, text_prop, title_of

PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.displayName,"
    "places.formattedAddress,"
    "places.nationalPhoneNumber,"
    "places.internationalPhoneNumber,"
    "places.websiteUri"
)
DEFAULT_WORKERS = 5
DEFAULT_TIMEOUT = 15.0
NAME_SIMILARITY_THRESHOLD = 0.6  # 結果名と問合せ名の類似度しきい値


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def search_place(api_key: str, company_name: str, address: str) -> dict | None:
    query_parts = [company_name]
    if address:
        query_parts.append(address)
    text_query = " ".join(query_parts)
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    body = {"textQuery": text_query, "languageCode": "ja", "regionCode": "JP"}
    for attempt in range(3):
        try:
            r = requests.post(PLACES_ENDPOINT, headers=headers, json=body,
                              timeout=DEFAULT_TIMEOUT)
        except requests.RequestException as e:
            if attempt == 2:
                return {"_error": f"request_failed: {e}"}
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 429:
            time.sleep(2 ** attempt)
            continue
        if r.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        if r.status_code != 200:
            return {"_error": f"http_{r.status_code}: {r.text[:200]}"}
        return r.json()
    return {"_error": "exhausted_retries"}


def pick_best_place(places: list[dict], target_name: str) -> dict | None:
    """戻り値の中で displayName が target_name に最も近いものを選ぶ。"""
    target_norm = normalize_company_name(target_name)
    best: dict | None = None
    best_score = 0.0
    for p in places:
        display = p.get("displayName", {}).get("text", "")
        if not display:
            continue
        score = similarity(normalize_company_name(display), target_norm)
        if score > best_score:
            best_score = score
            best = p
    if best is None:
        return None
    best["_similarity"] = best_score
    return best


def process_one(page: dict, api_key: str) -> dict:
    title = title_of(page)
    address = text_prop(page, "住所")
    existing_url = text_prop(page, "会社URL")
    if not title:
        return {"id": page["id"], "title": "", "status": "no_title",
                "existing_url": existing_url}
    response = search_place(api_key, title, address)
    if response is None or "_error" in (response or {}):
        return {
            "id": page["id"], "title": title, "status": "api_error",
            "error": response.get("_error", "") if response else "",
            "existing_url": existing_url,
        }
    places = response.get("places", [])
    if not places:
        return {"id": page["id"], "title": title, "status": "no_match",
                "existing_url": existing_url}
    best = pick_best_place(places, title)
    if best is None or best.get("_similarity", 0) < NAME_SIMILARITY_THRESHOLD:
        return {
            "id": page["id"], "title": title, "status": "low_similarity",
            "best_name": best.get("displayName", {}).get("text") if best else "",
            "similarity": best.get("_similarity") if best else 0,
            "existing_url": existing_url,
        }
    phone_raw = best.get("nationalPhoneNumber") or best.get("internationalPhoneNumber") or ""
    phone = normalize_phone(phone_raw)
    if phone and not phone.startswith("0"):
        phone = ""  # 国際表記が残った形は不採用
    return {
        "id": page["id"], "title": title, "status": "ok",
        "matched_name": best.get("displayName", {}).get("text"),
        "similarity": round(best.get("_similarity", 0), 2),
        "phone": phone,
        "phone_raw": phone_raw,
        "website": best.get("websiteUri", ""),
        "address_from_places": best.get("formattedAddress", ""),
    }


def collect_targets(client: NotionClient, max_targets: int, industry: str,
                    media: str, only_no_url: bool) -> list[dict]:
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
        phone = text_prop(page, "電話番号")
        if phone:
            continue
        url = text_prop(page, "会社URL")
        if only_no_url and url:
            continue
        targets.append(page)
        if max_targets and len(targets) >= max_targets:
            break
    return targets


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path,
                    default=Path("places_enrich_report.json"))
    ap.add_argument("--apply", action="store_true",
                    help="取得結果を Notion に書き込む（既定: dry-run）")
    ap.add_argument("--max-targets", type=int, default=0,
                    help="対象上限（0=無制限）。費用予防に使う")
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    ap.add_argument("--industry", default="",
                    help="業種で対象を絞る（例: 建設, 運輸・物流）")
    ap.add_argument("--media", default="",
                    help="掲載元メディアで対象を絞る（例: クロスワーク）")
    ap.add_argument("--include-with-phone-empty-url-only",
                    dest="only_no_url", action="store_true",
                    help="電話なし + 会社URLも空のページに絞る（enrich_phonesで取れない補集合）")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN required", file=sys.stderr)
        return 2
    api_key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not api_key:
        print("error: GOOGLE_PLACES_API_KEY required", file=sys.stderr)
        return 2

    client = NotionClient()
    targets = collect_targets(client, args.max_targets,
                              args.industry, args.media, args.only_no_url)
    filter_desc = []
    if args.industry:
        filter_desc.append(f"業種={args.industry}")
    if args.media:
        filter_desc.append(f"メディア={args.media}")
    if args.only_no_url:
        filter_desc.append("URL空のみ")
    suffix = f" (filter: {', '.join(filter_desc)})" if filter_desc else ""
    print(f"[targets] {len(targets)} pages with no phone{suffix}",
          file=sys.stderr)
    estimated_cost_usd = len(targets) * 0.032
    print(f"[estimate] ~${estimated_cost_usd:.2f} USD "
          f"(無料クレジット内なら実費0円)", file=sys.stderr)
    if not targets:
        return 0

    report: list[dict] = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(process_one, p, api_key) for p in targets]
        for i, fut in enumerate(as_completed(futures), 1):
            report.append(fut.result())
            if i % 50 == 0 or i == len(targets):
                ok = sum(1 for r in report if r.get("phone"))
                print(f"[progress] {i}/{len(targets)}  phones_found={ok}",
                      file=sys.stderr, flush=True)

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    summary = {
        "targets": len(targets),
        "phones_found": sum(1 for r in report if r.get("phone")),
        "websites_found": sum(1 for r in report if r.get("website")),
        "no_match": sum(1 for r in report if r["status"] == "no_match"),
        "low_similarity": sum(1 for r in report
                              if r["status"] == "low_similarity"),
        "api_error": sum(1 for r in report if r["status"] == "api_error"),
    }
    print(f"\n{json.dumps(summary, ensure_ascii=False, indent=2)}")
    print(f"[report] written → {args.report}")

    if not args.apply:
        print("\n[dry-run] use --apply to write to Notion")
        return 0

    print(f"\n[apply] writing phones/websites to Notion (only when empty)...")
    applied_phone = 0
    applied_url = 0
    errors = 0
    for r in report:
        props: dict = {}
        if r.get("phone"):
            props["電話番号"] = {"phone_number": r["phone"]}
        if r.get("website") and not r.get("existing_url"):
            props["会社URL"] = {"url": r["website"]}
        if not props:
            continue
        try:
            client.update_properties(r["id"], props)
            if "電話番号" in props:
                applied_phone += 1
            if "会社URL" in props:
                applied_url += 1
        except Exception as e:
            errors += 1
            print(f"[error] {r['title']}: {e}", file=sys.stderr)
    print(f"[apply] phones_applied={applied_phone}  urls_applied={applied_url}  errors={errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
