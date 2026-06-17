"""gBizINFO API で建設業を都道府県別に discovery 検索する。

経産省 gBizINFO API を使い、指定した都道府県の建設業（業種大分類=D）から
従業員数 >= N の法人を全件抽出する。出力は import_to_notion.py が期待する
companies JSON フォーマット。

CLI:
    export GBIZ_API_TOKEN=...
    python discovery_gbiz.py \\
      --prefectures 東京都 神奈川県 千葉県 埼玉県 \\
      --min-employees 30 \\
      --out batch/gbiz/kanto_construction.json

仕様:
    - gBizINFO API: GET https://info.gbiz.go.jp/hojin/v1/hojin
    - ヘッダ: X-hojinInfo-api-token
    - 業種フィルタ: business_item (JSIC 中分類: 06=総合工事業, 07=職別工事業,
      08=設備工事業)
    - レート制限対策: 1秒スリープ、429時にバックオフ
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import requests

BASE = "https://info.gbiz.go.jp/hojin/v1/hojin"
HEADER_NAME = "X-hojinInfo-api-token"
TIMEOUT = 30
SLEEP_SEC = 1.0
PAGE_LIMIT = 1000  # 1ページあたり最大

# 建設業 JSIC 中分類
CONSTRUCTION_BUSINESS_ITEMS = ["06", "07", "08"]
BUSINESS_ITEM_NAMES = {
    "06": "総合工事業",
    "07": "職別工事業（設備工事業を除く）",
    "08": "設備工事業",
}


def _build_session(token: str) -> requests.Session:
    s = requests.Session()
    s.headers[HEADER_NAME] = token
    s.headers["Accept"] = "application/json"
    return s


def search_page(session: requests.Session, prefecture: str,
                business_item: str, min_employees: int,
                page: int) -> dict:
    """1ページ分の検索結果を返す。"""
    params = {
        "prefecture": prefecture,
        "business_item": business_item,
        "employee_number_lower": min_employees,
        "exist_flg": "true",
        "page": page,
        "limit": PAGE_LIMIT,
    }
    for attempt in range(5):
        try:
            r = session.get(BASE, params=params, timeout=TIMEOUT)
        except requests.RequestException as e:
            wait = 2 ** attempt
            print(f"[gbiz] request error: {e}, retrying in {wait}s",
                  file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code == 429:
            wait = 2 ** attempt
            print(f"[gbiz] 429 rate limited, sleeping {wait}s",
                  file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code >= 500:
            wait = 2 ** attempt
            print(f"[gbiz] {r.status_code} server error, sleeping {wait}s",
                  file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code == 401:
            print(f"[gbiz] 401 unauthorized: check GBIZ_API_TOKEN",
                  file=sys.stderr)
            sys.exit(2)
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"gbiz search failed after retries: pref={prefecture}, "
                       f"item={business_item}, page={page}")


def _format_record(hojin: dict) -> dict[str, Any]:
    """gBizINFO の hojin-info を companies JSON フォーマットに変換。"""
    return {
        "company_name": hojin.get("name") or "",
        "company_hp": hojin.get("company_url") or "",
        "youtube_url": "",
        "address": hojin.get("location") or "",
        "workplace_address": "",
        "phone": "",
        "company_url": hojin.get("company_url") or "",
        "occupation": "",
        "industry_label": "建設業",
        "classification": "",
        "salary_range": "",
        "founded_year": _extract_founded_year(hojin),
        "listing_class": "",
        "company_phase": "",
        "employee_count_total": hojin.get("employee_number"),
        "average_age": "",
        "gender_ratio": "",
        "representative": hojin.get("representative_name") or "",
        "representative_title": (
            hojin.get("representative_title")
            or hojin.get("representative_position") or ""
        ),
        "business_content": hojin.get("business_summary") or "",
        "company_feature": "",
        "employee_count_workplace": None,
        "employee_count_female": (
            hojin.get("female_worker_number")
            if isinstance(hojin.get("female_worker_number"), int) else None
        ),
        "employee_count_part_time": None,
        "capital": _format_capital(hojin.get("capital_stock")),
        "founded": (
            hojin.get("date_of_establishment")
            or hojin.get("founded_year") or ""
        ),
        "description": hojin.get("business_summary") or "",
        "detail_url": "",
        "hello_work_company_id": hojin.get("corporate_number") or "",
        "source_url": (
            f"https://info.gbiz.go.jp/hojin/ichiran/"
            f"{hojin.get('corporate_number', '')}"
            if hojin.get("corporate_number") else ""
        ),
        "business_summary_gbiz": hojin.get("business_summary") or "",
    }


def _extract_founded_year(hojin: dict) -> int | None:
    fy = hojin.get("founded_year")
    if isinstance(fy, int) and 1800 < fy < 2100:
        return fy
    if isinstance(fy, str) and fy.isdigit():
        year = int(fy)
        if 1800 < year < 2100:
            return year
    est = hojin.get("date_of_establishment") or ""
    if isinstance(est, str) and len(est) >= 4 and est[:4].isdigit():
        return int(est[:4])
    return None


def _format_capital(cap: Any) -> str:
    if cap is None or cap == "":
        return ""
    if isinstance(cap, (int, float)):
        return f"{int(cap):,}円"
    s = str(cap).strip()
    if s.isdigit():
        return f"{int(s):,}円"
    return s


def discover(token: str, prefectures: list[str], min_employees: int,
             out_path: Path, max_pages_per_query: int = 50) -> int:
    """全 prefectures × CONSTRUCTION_BUSINESS_ITEMS をスキャンして JSON 保存。"""
    session = _build_session(token)
    records: list[dict] = []
    seen_corp_nums: set[str] = set()

    # 既存JSONがあればロード（再開対応）
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
            if isinstance(existing, list):
                records = existing
                for r in records:
                    cn = r.get("hello_work_company_id", "")
                    if cn:
                        seen_corp_nums.add(cn)
                print(f"[resume] loaded {len(records)} existing companies",
                      file=sys.stderr)
        except Exception as e:
            print(f"[resume] failed to load {out_path}: {e}", file=sys.stderr)

    def _save():
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2),
            encoding="utf-8")

    total_queries = len(prefectures) * len(CONSTRUCTION_BUSINESS_ITEMS)
    q_done = 0

    try:
        for pref in prefectures:
            for item in CONSTRUCTION_BUSINESS_ITEMS:
                q_done += 1
                item_name = BUSINESS_ITEM_NAMES.get(item, item)
                print(f"\n[query {q_done}/{total_queries}] pref={pref} "
                      f"business_item={item} ({item_name}) "
                      f"min_emp={min_employees}", file=sys.stderr)
                page = 1
                new_in_query = 0
                while page <= max_pages_per_query:
                    data = search_page(session, pref, item,
                                       min_employees, page)
                    infos = data.get("hojin-infos") or []
                    if not infos:
                        print(f"  [page {page}] no results, done",
                              file=sys.stderr)
                        break
                    page_new = 0
                    for hojin in infos:
                        cn = hojin.get("corporate_number") or ""
                        if not cn or cn in seen_corp_nums:
                            continue
                        seen_corp_nums.add(cn)
                        records.append(_format_record(hojin))
                        page_new += 1
                        new_in_query += 1
                    total = data.get("totalCount") or data.get("total_count")
                    print(f"  [page {page}] got {len(infos)} records "
                          f"(+{page_new} new) total_so_far="
                          f"{len(records)} (api total={total})",
                          file=sys.stderr)
                    if len(infos) < PAGE_LIMIT:
                        break
                    page += 1
                    time.sleep(SLEEP_SEC)
                if new_in_query > 0:
                    _save()
                    print(f"  [save] +{new_in_query} → {out_path}",
                          file=sys.stderr)
                time.sleep(SLEEP_SEC)
    except KeyboardInterrupt:
        print("[interrupt] saving partial results", file=sys.stderr)
        _save()
        raise
    finally:
        _save()
    return len(records)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefectures", nargs="+", required=True,
                    help="都道府県名（例: 東京都 神奈川県）")
    ap.add_argument("--min-employees", type=int, default=30)
    ap.add_argument("--out", type=Path,
                    default=Path("batch/gbiz/construction.json"))
    ap.add_argument("--max-pages", type=int, default=50,
                    help="1クエリあたりの最大ページ数（無限ループ防止）")
    args = ap.parse_args()

    token = os.environ.get("GBIZ_API_TOKEN", "")
    if not token:
        print("error: GBIZ_API_TOKEN env var required", file=sys.stderr)
        return 2

    total = discover(token, args.prefectures, args.min_employees,
                     args.out, max_pages_per_query=args.max_pages)
    print(f"\n[done] {total} companies written → {args.out}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
