"""gBizINFO API で建設業を都道府県別に discovery 検索する。

戦略 (gBizINFO API の制約に合わせて):
  1. List 検索 (prefecture + employee_number_from) で都道府県内の社を全件取得
     → ただし応答は最小情報 (corporate_number, name, location 等)
  2. 会社名キーワードで建設業を絞り込み (建設/工務/土木/施工/建築/建材/設備工事 等)
  3. 該当社のみ詳細 API (/hojin/{corp_no}) で従業員数・代表者・URL 等を取得
  4. companies JSON フォーマットで保存

CLI:
    export GBIZ_API_TOKEN=...
    python discovery_gbiz.py \\
      --prefectures 東京都 神奈川県 千葉県 埼玉県 \\
      --min-employees 30 \\
      --out batch/gbiz/kanto_construction.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import requests

BASE = "https://info.gbiz.go.jp/hojin/v1/hojin"
HEADER_NAME = "X-hojinInfo-api-token"
TIMEOUT = 30
SLEEP_SEC = 0.5
PAGE_LIMIT = 5000  # 1ページあたり最大
MAX_PAGES = 10     # gBizINFO 制限: page 1-10

# JIS X 0401 都道府県コード
PREFECTURE_CODES = {
    "北海道": "01", "青森県": "02", "岩手県": "03", "宮城県": "04",
    "秋田県": "05", "山形県": "06", "福島県": "07", "茨城県": "08",
    "栃木県": "09", "群馬県": "10", "埼玉県": "11", "千葉県": "12",
    "東京都": "13", "神奈川県": "14", "新潟県": "15", "富山県": "16",
    "石川県": "17", "福井県": "18", "山梨県": "19", "長野県": "20",
    "岐阜県": "21", "静岡県": "22", "愛知県": "23", "三重県": "24",
    "滋賀県": "25", "京都府": "26", "大阪府": "27", "兵庫県": "28",
    "奈良県": "29", "和歌山県": "30", "鳥取県": "31", "島根県": "32",
    "岡山県": "33", "広島県": "34", "山口県": "35", "徳島県": "36",
    "香川県": "37", "愛媛県": "38", "高知県": "39", "福岡県": "40",
    "佐賀県": "41", "長崎県": "42", "熊本県": "43", "大分県": "44",
    "宮崎県": "45", "鹿児島県": "46", "沖縄県": "47",
}

# 建設業を疑う会社名キーワード
CONSTRUCTION_NAME_RE = re.compile(
    r"(建設|建築|工務店|工務|土木|施工|住宅|ハウス|建材|設備工事|"
    r"電気工事|管工事|塗装|解体|ゼネコン|造園|舗装|鉄筋|基礎工事|"
    r"リフォーム|防水|内装|外装|タイル|サッシ|住設|住建|住宅設備|"
    r"建工|建装|建販)"
)

# 建設業から除外したいキーワード (老人ホーム/介護等)
EXCLUDE_NAME_RE = re.compile(
    r"(老人ホーム|介護|ケアハウス|デイサービス|福祉|"
    r"クリニック|病院|医院|診療所|薬局)"
)

# 事業概要から建設業を判定するためのキーワード
# (name フィルタで取りこぼした「○○商事」「○○工業」等を business_summary で救う)
CONSTRUCTION_SUMMARY_RE = re.compile(
    r"(建設業|建築業|建築工事|土木工事|建築設計|土木設計|施工管理|"
    r"電気工事|管工事|空調工事|設備工事|塗装工事|防水工事|内装工事|"
    r"鉄筋工事|解体工事|基礎工事|外構工事|サッシ工事|ガラス工事|"
    r"舗装工事|造園工事|タイル工事|内装仕上|防食工事|ハウスメーカー|"
    r"住宅メーカー|ハウスビルダー|リフォーム|戸建住宅|注文住宅|"
    r"建材|建築資材|建設機械|住宅設備|不動産開発|プラント建設|"
    r"ゼネコン|工務店|建設コンサルタント|建築コンサルタント|"
    r"総合建設|総合建築|住宅販売|建物管理)"
)


def is_construction_by_summary(summary: str) -> bool:
    """事業概要テキストから建設業判定。"""
    if not summary:
        return False
    if EXCLUDE_NAME_RE.search(summary):
        return False
    return bool(CONSTRUCTION_SUMMARY_RE.search(summary))


def _build_session(token: str) -> requests.Session:
    s = requests.Session()
    s.headers[HEADER_NAME] = token
    s.headers["Accept"] = "application/json"
    return s


def _get_with_retry(session: requests.Session, url: str,
                    params: dict | None = None) -> requests.Response:
    """5回までリトライ付き GET。429/5xx でバックオフ。"""
    for attempt in range(5):
        try:
            r = session.get(url, params=params, timeout=TIMEOUT)
        except requests.RequestException as e:
            wait = 2 ** attempt
            print(f"  [retry] request error: {e}, sleep {wait}s",
                  file=sys.stderr)
            time.sleep(wait)
            continue
        if r.status_code == 401:
            print(f"  [fatal] 401 unauthorized: GBIZ_API_TOKEN 確認",
                  file=sys.stderr)
            sys.exit(2)
        if r.status_code in (429, 500, 502, 503, 504):
            wait = 2 ** attempt
            print(f"  [retry] {r.status_code}, sleep {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        return r
    raise RuntimeError(f"GET failed after retries: {url}")


def list_search(session: requests.Session, pref_code: str,
                min_employees: int, page: int,
                max_employees: int | None = None) -> list[dict]:
    """都道府県+従業員数で list 検索。最小情報のみ。"""
    params = {
        "prefecture": pref_code,
        "employee_number_from": min_employees,
        "page": page,
        "limit": PAGE_LIMIT,
    }
    if max_employees is not None:
        params["employee_number_to"] = max_employees
    r = _get_with_retry(session, BASE, params=params)
    if r.status_code == 404:
        return []
    r.raise_for_status()
    data = r.json()
    return data.get("hojin-infos") or []


def fetch_detail(session: requests.Session, corp_no: str) -> dict | None:
    """法人番号で詳細情報取得。"""
    r = _get_with_retry(session, f"{BASE}/{corp_no}")
    if r.status_code == 404:
        return None
    r.raise_for_status()
    data = r.json()
    infos = data.get("hojin-infos") or []
    return infos[0] if infos else None


def is_construction_by_name(name: str) -> bool:
    """会社名から建設業っぽいか判定。"""
    if not name:
        return False
    if EXCLUDE_NAME_RE.search(name):
        return False
    return bool(CONSTRUCTION_NAME_RE.search(name))


def _format_record(hojin: dict, list_entry: dict) -> dict[str, Any]:
    """詳細 + list を companies JSON に変換。"""
    name = (hojin.get("name") if hojin else None) or list_entry.get("name", "")
    location = ((hojin.get("location") if hojin else None)
                or list_entry.get("location", ""))
    corp_no = (list_entry.get("corporate_number")
               or (hojin.get("corporate_number") if hojin else "") or "")

    def _get(k):
        return hojin.get(k) if hojin else None

    return {
        "company_name": name,
        "company_hp": _get("company_url") or "",
        "youtube_url": "",
        "address": location,
        "workplace_address": "",
        "phone": "",
        "company_url": _get("company_url") or "",
        "occupation": "",
        "industry_label": "建設業",
        "classification": "",
        "salary_range": "",
        "founded_year": _extract_founded_year(hojin or {}),
        "listing_class": "",
        "company_phase": "",
        "employee_count_total": _get("employee_number"),
        "average_age": "",
        "gender_ratio": "",
        "representative": _get("representative_name") or "",
        "representative_title": (
            _get("representative_title") or _get("representative_position") or ""
        ),
        "business_content": _get("business_summary") or "",
        "company_feature": "",
        "employee_count_workplace": None,
        "employee_count_female": (
            _get("female_worker_number")
            if isinstance(_get("female_worker_number"), int) else None
        ),
        "employee_count_part_time": None,
        "capital": _format_capital(_get("capital_stock")),
        "founded": (_get("date_of_establishment") or _get("founded_year") or ""),
        "description": _get("business_summary") or "",
        "detail_url": "",
        "hello_work_company_id": corp_no,
        "source_url": (f"https://info.gbiz.go.jp/hojin/ichiran/{corp_no}"
                       if corp_no else ""),
        "business_summary_gbiz": _get("business_summary") or "",
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
             out_path: Path, fetch_details: bool = True,
             max_details: int | None = None,
             full_scan: bool = False,
             concurrency: int = 5,
             max_employees: int | None = None) -> int:
    """都道府県別に list + name filter + detail を実行して JSON 保存。

    Args:
        full_scan: True なら名前フィルタを外し、全社の詳細を取得して
                   business_summary で建設業判定する（取りこぼし回収モード）。
        concurrency: 詳細取得の並列数（full_scan 時のみ意味あり）。
    """
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
            print(f"[resume] failed: {e}", file=sys.stderr)

    def _save():
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(records, ensure_ascii=False, indent=2),
            encoding="utf-8")

    try:
        for pref_name in prefectures:
            pref_code = PREFECTURE_CODES.get(pref_name)
            if not pref_code:
                print(f"[warn] unknown prefecture: {pref_name}",
                      file=sys.stderr)
                continue

            emp_range = (f"{min_employees}-{max_employees}"
                         if max_employees else f"{min_employees}+")
            print(f"\n[pref] {pref_name} (code={pref_code}) "
                  f"emp={emp_range} "
                  f"mode={'FULL_SCAN' if full_scan else 'name_filter'}",
                  file=sys.stderr)

            # Step 1: List endpoint で全社取得
            page_entries: list[dict] = []
            for page in range(1, MAX_PAGES + 1):
                infos = list_search(session, pref_code, min_employees, page,
                                    max_employees=max_employees)
                page_entries.extend(infos)
                print(f"  [list page {page}] +{len(infos)} "
                      f"(total in pref={len(page_entries)})", file=sys.stderr)
                if len(infos) < PAGE_LIMIT:
                    break
                time.sleep(SLEEP_SEC)

            # Step 2: 候補絞り込み
            if full_scan:
                # 全社対象（既処理 corp_no と除外名のみ skip）
                candidates = [
                    e for e in page_entries
                    if e.get("corporate_number") not in seen_corp_nums
                    and not EXCLUDE_NAME_RE.search(e.get("name", ""))
                ]
                print(f"  [filter] {len(page_entries)} → {len(candidates)} "
                      f"(全社対象, FULL_SCAN)", file=sys.stderr)
            else:
                candidates = [e for e in page_entries
                              if is_construction_by_name(e.get("name", ""))]
                print(f"  [filter] {len(page_entries)} → {len(candidates)} "
                      f"(建設名フィルタ後)", file=sys.stderr)

            # Step 3: 詳細取得
            if not fetch_details:
                for e in candidates:
                    cn = e.get("corporate_number", "")
                    if not cn or cn in seen_corp_nums:
                        continue
                    seen_corp_nums.add(cn)
                    records.append(_format_record({}, e))
                _save()
                print(f"  [save] +{len(candidates)} (詳細skip)",
                      file=sys.stderr)
                continue

            added = 0
            kept_construction = 0
            skipped_non_construction = 0

            if full_scan and concurrency > 1:
                # 並列詳細取得 (full_scan モードのみ)
                from concurrent.futures import ThreadPoolExecutor, as_completed
                pending = [e for e in candidates
                           if e.get("corporate_number")
                           and e.get("corporate_number") not in seen_corp_nums]
                if max_details:
                    pending = pending[:max_details]
                print(f"  [parallel] fetching details for {len(pending)} "
                      f"with concurrency={concurrency}", file=sys.stderr)
                done = 0
                with ThreadPoolExecutor(max_workers=concurrency) as ex:
                    fut_to_entry = {
                        ex.submit(fetch_detail, session,
                                  e["corporate_number"]): e
                        for e in pending
                    }
                    for fut in as_completed(fut_to_entry):
                        e = fut_to_entry[fut]
                        cn = e["corporate_number"]
                        done += 1
                        try:
                            detail = fut.result()
                        except Exception as exc:
                            print(f"    [detail {cn}] error: {exc}",
                                  file=sys.stderr)
                            seen_corp_nums.add(cn)
                            continue
                        seen_corp_nums.add(cn)
                        name = (detail or {}).get("name") or e.get("name", "")
                        summary = (detail or {}).get("business_summary") or ""
                        # 建設業判定: name OR summary のいずれか
                        if (is_construction_by_name(name)
                                or is_construction_by_summary(summary)):
                            records.append(_format_record(detail or {}, e))
                            added += 1
                            kept_construction += 1
                            if added % 20 == 0:
                                print(f"    [keep {added}] +{name[:30]} "
                                      f"(processed {done}/{len(pending)})",
                                      file=sys.stderr)
                        else:
                            skipped_non_construction += 1
                        if added > 0 and added % 50 == 0:
                            _save()
                            print(f"  [save] checkpoint {added}",
                                  file=sys.stderr)
                        if done % 500 == 0:
                            print(f"  [progress] {done}/{len(pending)} "
                                  f"processed, kept={kept_construction} "
                                  f"skipped={skipped_non_construction}",
                                  file=sys.stderr)
            else:
                # 直列詳細取得（従来のname_filterモード）
                for i, e in enumerate(candidates, 1):
                    cn = e.get("corporate_number", "")
                    if not cn or cn in seen_corp_nums:
                        continue
                    if max_details and added >= max_details:
                        break
                    detail = fetch_detail(session, cn)
                    seen_corp_nums.add(cn)
                    records.append(_format_record(detail or {}, e))
                    added += 1
                    if i % 20 == 0:
                        name = (detail or e).get("name", "")[:30]
                        print(f"  [detail {i}/{len(candidates)}] "
                              f"+{name} (unique={len(records)})",
                              file=sys.stderr)
                    if added % 50 == 0:
                        _save()
                        print(f"  [save] checkpoint {added}",
                              file=sys.stderr)
                    time.sleep(SLEEP_SEC)
            _save()
            if full_scan:
                print(f"  [save] pref {pref_name} done, +{added} kept "
                      f"(out of {kept_construction + skipped_non_construction} "
                      f"scanned, {skipped_non_construction} non-construction)",
                      file=sys.stderr)
            else:
                print(f"  [save] pref {pref_name} done, +{added} new",
                      file=sys.stderr)
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
    ap.add_argument("--max-employees", type=int, default=None,
                    help="従業員数の上限 (B/C候補用: 10-29名 等)")
    ap.add_argument("--out", type=Path,
                    default=Path("batch/gbiz/construction.json"))
    ap.add_argument("--no-detail", action="store_true",
                    help="詳細取得をスキップ（高速だが従業員数等が空）")
    ap.add_argument("--max-details", type=int, default=None,
                    help="詳細取得の上限（テスト用）")
    ap.add_argument("--full-scan", action="store_true",
                    help="名前フィルタを外して全社の詳細を取得し"
                         "business_summary で建設業判定（取りこぼし回収）")
    ap.add_argument("--concurrency", type=int, default=5,
                    help="詳細取得の並列数 (full_scan モード時)")
    args = ap.parse_args()

    token = os.environ.get("GBIZ_API_TOKEN", "")
    if not token:
        print("error: GBIZ_API_TOKEN env var required", file=sys.stderr)
        return 2

    total = discover(token, args.prefectures, args.min_employees,
                     args.out,
                     fetch_details=not args.no_detail,
                     max_details=args.max_details,
                     full_scan=args.full_scan,
                     concurrency=args.concurrency,
                     max_employees=args.max_employees)
    print(f"\n[done] {total} companies written → {args.out}",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
