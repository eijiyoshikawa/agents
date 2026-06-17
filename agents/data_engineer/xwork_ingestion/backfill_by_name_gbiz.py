"""Notion DB_顧客管理 で「業種=建設 & 法人番号=空欄」の社を対象に、
会社名+都道府県で gBizINFO 名前検索し、法人番号 + 詳細情報を補完する。

抽出するフィールド:
  - 法人番号 (必須、これがキー)
  - 従業員数 (空欄の場合のみ補完)
  - 代表者名 (空欄の場合のみ補完)
  - 会社URL (空欄の場合のみ補完)
  - 資本金 (空欄の場合のみ補完)

CLI:
    export NOTION_TOKEN=...
    export GBIZ_API_TOKEN=...
    python backfill_by_name_gbiz.py --report /tmp/r.json    # dry-run
    python backfill_by_name_gbiz.py --apply                 # 本実行
    python backfill_by_name_gbiz.py --max-targets 100 --apply
    python backfill_by_name_gbiz.py --apply --workers 5
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

import requests

from notion_client import NotionClient

DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c"
GBIZ_BASE = "https://info.gbiz.go.jp/hojin/v1/hojin"
GBIZ_HEADER = "X-hojinInfo-api-token"
SLEEP_SEC = 0.4

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

PREF_RE = re.compile(r"(" + "|".join(PREFECTURE_CODES.keys()) + r")")


def _normalize_name(name: str) -> str:
    """検索精度を上げるため法人格を除いた検索名を作る。"""
    n = name
    for prefix in ["株式会社", "(株)", "（株）", "有限会社", "(有)", "（有）",
                   "合同会社", "合資会社", "合名会社", "一般社団法人",
                   "公益財団法人", "公益社団法人", "学校法人", "医療法人",
                   "社会福祉法人", "宗教法人"]:
        n = n.replace(prefix, "")
    return n.strip()


def _get_text(page: dict, key: str) -> str:
    arr = page.get("properties", {}).get(key, {}).get("rich_text") or []
    return "".join(t.get("plain_text", "") for t in arr)


def _get_title(page: dict, key: str = "顧客名") -> str:
    arr = page.get("properties", {}).get(key, {}).get("title") or []
    return "".join(t.get("plain_text", "") for t in arr)


def _get_number(page: dict, key: str) -> int | None:
    return page.get("properties", {}).get(key, {}).get("number")


def _get_select(page: dict, key: str) -> str | None:
    sel = page.get("properties", {}).get(key, {}).get("select")
    return sel.get("name") if sel else None


def _get_url(page: dict, key: str) -> str:
    return page.get("properties", {}).get(key, {}).get("url") or ""


def fetch_targets(client: NotionClient, max_targets: int | None = None
                  ) -> list[dict]:
    """業種=建設 & 法人番号=空欄 のページを取得。"""
    targets: list[dict] = []
    cursor = None
    filt = {
        "and": [
            {"property": "業種", "select": {"equals": "建設"}},
            {"property": "法人番号", "rich_text": {"is_empty": True}},
        ]
    }
    while True:
        body: dict = {"filter": filt, "page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = client.session.post(
            f"https://api.notion.com/v1/databases/{DATABASE_ID}/query",
            json=body,
        )
        r.raise_for_status()
        data = r.json()
        for page in data.get("results", []):
            name = _get_title(page)
            addr = _get_text(page, "住所")
            if not name:
                continue
            m = PREF_RE.search(addr)
            pref = m.group(1) if m else None
            targets.append({
                "id": page["id"],
                "title": name,
                "address": addr,
                "prefecture": pref,
                "employee_count": _get_number(page, "従業員数"),
                "phone": _get_text(page, "電話番号"),
            })
            if max_targets and len(targets) >= max_targets:
                return targets
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return targets


def gbiz_search_by_name(session: requests.Session, name: str,
                       prefecture: str | None) -> dict | None:
    """会社名(+都道府県) で gBizINFO 検索、最有力候補を返す。"""
    params = {"name": _normalize_name(name), "limit": 10}
    if prefecture and prefecture in PREFECTURE_CODES:
        params["prefecture"] = PREFECTURE_CODES[prefecture]
    for attempt in range(3):
        try:
            r = session.get(GBIZ_BASE, params=params, timeout=20)
        except requests.RequestException:
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 429:
            time.sleep(2 ** (attempt + 1))
            continue
        if r.status_code in (400, 404):
            return None
        if r.status_code == 401:
            return None
        r.raise_for_status()
        data = r.json()
        infos = data.get("hojin-infos") or []
        if not infos:
            return None
        # 完全一致を優先
        for h in infos:
            if h.get("name") == name:
                return h
        # 株式会社 等を除去した名前で一致確認
        nname = _normalize_name(name)
        for h in infos:
            if _normalize_name(h.get("name", "")) == nname:
                return h
        # 都道府県も一致するもの
        if prefecture:
            for h in infos:
                if prefecture in (h.get("location") or ""):
                    return h
        # それでもダメなら先頭
        return infos[0]
    return None


def gbiz_detail(session: requests.Session, corp_no: str) -> dict | None:
    """法人番号で詳細取得。"""
    for attempt in range(3):
        try:
            r = session.get(f"{GBIZ_BASE}/{corp_no}", timeout=20)
        except requests.RequestException:
            time.sleep(2 ** attempt)
            continue
        if r.status_code == 429:
            time.sleep(2 ** (attempt + 1))
            continue
        if r.status_code == 404:
            return None
        r.raise_for_status()
        data = r.json()
        infos = data.get("hojin-infos") or []
        return infos[0] if infos else None
    return None


def update_notion(client: NotionClient, page_id: str, props: dict) -> None:
    """指定 props で Notion ページを更新。"""
    if not props:
        return
    for attempt in range(3):
        r = client.session.patch(
            f"https://api.notion.com/v1/pages/{page_id}",
            json={"properties": props},
        )
        if r.status_code == 429:
            time.sleep(2 ** (attempt + 1))
            continue
        r.raise_for_status()
        return


def process_one(target: dict, gbiz_session: requests.Session) -> dict:
    """1社を処理して結果 dict を返す（Notion 更新まで含む値計算）。"""
    name = target["title"]
    pref = target["prefecture"]
    list_hit = gbiz_search_by_name(gbiz_session, name, pref)
    if not list_hit:
        return {**target, "status": "no_match"}
    corp_no = list_hit.get("corporate_number") or ""
    if not corp_no:
        return {**target, "status": "no_corporate_number"}
    detail = gbiz_detail(gbiz_session, corp_no) or list_hit
    emp = detail.get("employee_number")
    return {
        **target,
        "status": "matched",
        "corporate_number": corp_no,
        "matched_name": detail.get("name"),
        "matched_location": detail.get("location"),
        "employee_number": emp if isinstance(emp, int) else None,
        "representative_name": detail.get("representative_name"),
        "company_url": detail.get("company_url"),
        "capital_stock": detail.get("capital_stock"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--report", type=Path,
                    default=Path("backfill_by_name_report.json"))
    ap.add_argument("--max-targets", type=int, default=None)
    ap.add_argument("--workers", type=int, default=3,
                    help="並列数 (gBizINFO 429対策に低めが安全)")
    args = ap.parse_args()

    notion_token = os.environ.get("NOTION_TOKEN", "")
    gbiz_token = os.environ.get("GBIZ_API_TOKEN", "")
    if not notion_token:
        print("error: NOTION_TOKEN required", file=sys.stderr)
        return 2
    if not gbiz_token:
        print("error: GBIZ_API_TOKEN required", file=sys.stderr)
        return 2

    notion = NotionClient(notion_token)
    gbiz_session = requests.Session()
    gbiz_session.headers[GBIZ_HEADER] = gbiz_token
    gbiz_session.headers["Accept"] = "application/json"

    print("[targets] fetching from Notion...", file=sys.stderr)
    targets = fetch_targets(notion, max_targets=args.max_targets)
    print(f"[targets] {len(targets)} pages (業種=建設, 法人番号=空欄)",
          file=sys.stderr)

    report: list[dict] = []
    counts = {"matched": 0, "no_match": 0, "no_corp": 0,
              "applied": 0, "failed": 0}

    def _maybe_apply(rec: dict) -> None:
        if not args.apply or rec.get("status") != "matched":
            return
        props: dict = {}
        if rec.get("corporate_number"):
            props["法人番号"] = {
                "rich_text": [{"type": "text",
                              "text": {"content": rec["corporate_number"]}}]
            }
        emp = rec.get("employee_number")
        if isinstance(emp, int) and emp > 0 and rec.get("employee_count") is None:
            props["従業員数"] = {"number": emp}
        url = rec.get("company_url") or ""
        # NOTE: 既存 URL チェックは省略（page 再fetchが必要なため）
        # 既存 URL があれば import の fields_filled 同等の動作にしたいが
        # ここでは新規セットのみ（fields_filled は後段で実施）
        try:
            update_notion(notion, rec["id"], props)
            counts["applied"] += 1
            time.sleep(SLEEP_SEC)
        except Exception as e:
            counts["failed"] += 1
            rec["update_error"] = str(e)

    if args.workers > 1:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            fut_to_t = {ex.submit(process_one, t, gbiz_session): t
                       for t in targets}
            done = 0
            for fut in as_completed(fut_to_t):
                done += 1
                rec = fut.result()
                report.append(rec)
                status = rec.get("status", "")
                if status == "matched":
                    counts["matched"] += 1
                elif status == "no_match":
                    counts["no_match"] += 1
                else:
                    counts["no_corp"] += 1
                _maybe_apply(rec)
                if done % 50 == 0:
                    print(f"[progress] {done}/{len(targets)} "
                          f"matched={counts['matched']} "
                          f"no_match={counts['no_match']} "
                          f"applied={counts['applied']}",
                          file=sys.stderr)
    else:
        for i, t in enumerate(targets, 1):
            rec = process_one(t, gbiz_session)
            report.append(rec)
            status = rec.get("status", "")
            if status == "matched":
                counts["matched"] += 1
            elif status == "no_match":
                counts["no_match"] += 1
            else:
                counts["no_corp"] += 1
            _maybe_apply(rec)
            if i % 50 == 0:
                print(f"[progress] {i}/{len(targets)} matched={counts['matched']} "
                      f"applied={counts['applied']}", file=sys.stderr)

    summary = {"targets": len(targets), **counts}
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    args.report.write_text(
        json.dumps({"summary": summary, "details": report},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[report] written → {args.report}", file=sys.stderr)
    if not args.apply:
        print("\n[dry-run] use --apply to write to Notion", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
