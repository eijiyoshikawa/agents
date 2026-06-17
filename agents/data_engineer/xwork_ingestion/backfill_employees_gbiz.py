"""Notion DB_顧客管理 で「従業員数=空欄 & 法人番号あり」のページを対象に、
gBizINFO API で従業員数を再取得して埋める。

CLI:
    export NOTION_TOKEN=...
    export GBIZ_API_TOKEN=...
    python backfill_employees_gbiz.py --report /tmp/backfill.json    # レポートのみ
    python backfill_employees_gbiz.py --apply                       # Notion 書き込み
    python backfill_employees_gbiz.py --max-targets 100 --apply     # 上限指定
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import requests

from gbiz_enrich import GBizClient
from notion_client import NotionClient

DATABASE_ID = "1ac3fae4-3499-4991-b465-e375bef7d66c"
SLEEP_SEC = 0.4  # Notion API: 3 req/sec → 0.4で安全マージン


def _get_text(page: dict, key: str) -> str:
    arr = page.get("properties", {}).get(key, {}).get("rich_text") or []
    return "".join(t.get("plain_text", "") for t in arr)


def _get_title(page: dict, key: str = "顧客名") -> str:
    arr = page.get("properties", {}).get(key, {}).get("title") or []
    return "".join(t.get("plain_text", "") for t in arr)


def _get_number(page: dict, key: str) -> int | None:
    return page.get("properties", {}).get(key, {}).get("number")


def fetch_targets(client: NotionClient, max_targets: int | None = None
                  ) -> list[dict]:
    """従業員数=空欄 & 法人番号あり のページを取得。"""
    targets: list[dict] = []
    cursor = None
    filt = {
        "and": [
            {"property": "従業員数", "number": {"is_empty": True}},
            {"property": "法人番号", "rich_text": {"is_not_empty": True}},
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
            corp_no = _get_text(page, "法人番号").strip()
            if not corp_no:
                continue
            targets.append({
                "id": page["id"],
                "title": _get_title(page),
                "corporate_number": corp_no,
            })
            if max_targets and len(targets) >= max_targets:
                return targets
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return targets


def update_employee_count(client: NotionClient, page_id: str, count: int
                          ) -> bool:
    """Notion ページの従業員数を更新。"""
    r = client.session.patch(
        f"https://api.notion.com/v1/pages/{page_id}",
        json={"properties": {"従業員数": {"number": count}}},
    )
    if r.status_code == 429:
        time.sleep(2)
        return update_employee_count(client, page_id, count)
    r.raise_for_status()
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="指定がなければ dry-run（Notion 書き込み無し）")
    ap.add_argument("--report", type=Path, default=Path("backfill_report.json"),
                    help="結果レポートの出力先")
    ap.add_argument("--max-targets", type=int, default=None)
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
    gbiz = GBizClient(gbiz_token)

    print("[targets] fetching from Notion...", file=sys.stderr)
    targets = fetch_targets(notion, max_targets=args.max_targets)
    print(f"[targets] {len(targets)} pages (employee_count empty, "
          f"corporate_number present)", file=sys.stderr)

    report: list[dict] = []
    updated = 0
    no_employee = 0
    failed = 0

    for i, t in enumerate(targets, 1):
        cn = t["corporate_number"]
        try:
            info = gbiz.fetch(cn)
        except Exception as e:
            failed += 1
            report.append({**t, "status": "gbiz_error", "error": str(e)})
            continue
        if not info:
            no_employee += 1
            report.append({**t, "status": "not_found"})
            continue
        emp = info.get("employee_number")
        if not isinstance(emp, int) or emp <= 0:
            no_employee += 1
            report.append({**t, "status": "no_employee_in_gbiz"})
            continue
        # update
        if args.apply:
            try:
                update_employee_count(notion, t["id"], emp)
                updated += 1
                report.append({**t, "status": "updated", "employee": emp})
                time.sleep(SLEEP_SEC)
            except Exception as e:
                failed += 1
                report.append({**t, "status": "notion_error",
                              "employee": emp, "error": str(e)})
        else:
            updated += 1
            report.append({**t, "status": "would_update", "employee": emp})

        if i % 50 == 0:
            print(f"[progress] {i}/{len(targets)} updated={updated} "
                  f"no_emp={no_employee} failed={failed}", file=sys.stderr)

    summary = {
        "targets": len(targets),
        "updated": updated,
        "no_employee_in_gbiz": no_employee,
        "failed": failed,
    }
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
