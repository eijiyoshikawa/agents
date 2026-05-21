"""scrape_xwork.py の出力 JSON を DB_顧客管理 に取り込む。

突合キー:
  1) 正規化済み会社名（最優先・完全一致でマッチ確定）
  2) 正規化済み電話番号（あれば）
  3) 会社URL のホスト名（あれば）

挙動:
  - マッチあり → 既存ページの `掲載元メディア` に「クロスワーク」を追記
  - マッチなし → 新規ページ作成（掲載元メディア=クロスワーク, 業種=建設,
    確認状況=未確認）。gBizINFO トークンがあれば法人番号で補完を試みる
  - 部分一致のみ → 新規作成 + `重複確認必要` を ON

DB に存在しないプロパティへの書き込みは Notion API が 400 を返すので、
事前に schema を fetch して該当する場合のみセットする。

CLI:
    python import_to_notion.py --input companies.json [--dry-run]
    python import_to_notion.py --input companies.json --no-gbiz
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from gbiz_enrich import GBizClient, enrich
from normalize import normalize_company_name, normalize_phone, normalize_url_host
from notion_client import NotionClient, media_of, text_prop, title_of

import requests

MEDIA_TAG = "クロスワーク"
DEFAULT_INDUSTRY = "建設"


@dataclass
class ExistingIndex:
    by_name: dict[str, dict]
    by_phone: dict[str, dict]
    by_host: dict[str, dict]


def build_index(client: NotionClient) -> ExistingIndex:
    by_name: dict[str, dict] = {}
    by_phone: dict[str, dict] = {}
    by_host: dict[str, dict] = {}
    total = 0
    skipped_archived = 0
    for page in client.iter_pages():
        if page.get("archived") or page.get("in_trash"):
            skipped_archived += 1
            continue
        total += 1
        name_key = normalize_company_name(title_of(page))
        if name_key:
            by_name.setdefault(name_key, page)
        phone_key = normalize_phone(text_prop(page, "電話番号"))
        if phone_key:
            by_phone.setdefault(phone_key, page)
        host_key = normalize_url_host(text_prop(page, "会社URL"))
        if host_key:
            by_host.setdefault(host_key, page)
    print(f"[index] fetched {total} existing customers "
          f"(skipped {skipped_archived} archived)", file=sys.stderr)
    return ExistingIndex(by_name, by_phone, by_host)


def fetch_db_properties(client: NotionClient) -> set[str]:
    db = client._request("GET", f"/databases/{client.db_id}")
    return set((db.get("properties") or {}).keys())


def classify(item: dict, idx: ExistingIndex) -> tuple[str, dict | None]:
    name_key = normalize_company_name(item.get("company_name", ""))
    if name_key and name_key in idx.by_name:
        return "match_name", idx.by_name[name_key]
    phone_key = normalize_phone(item.get("phone"))
    if phone_key and phone_key in idx.by_phone:
        return "partial_phone", idx.by_phone[phone_key]
    host_key = normalize_url_host(item.get("company_url"))
    if host_key and host_key in idx.by_host:
        return "partial_host", idx.by_host[host_key]
    return "new", None


def append_media(client: NotionClient, page: dict, dry_run: bool) -> bool:
    current = media_of(page)
    if MEDIA_TAG in current:
        return False
    if dry_run:
        return True
    client.update_media(page["id"], current + [MEDIA_TAG])
    return True


def _page_number(page: dict, key: str) -> float | int | None:
    return page.get("properties", {}).get(key, {}).get("number")


def _page_select(page: dict, key: str) -> str:
    sel = page.get("properties", {}).get(key, {}).get("select")
    return sel.get("name") if sel else ""


def fill_empty_on_match(item: dict, page: dict, db_props: set[str], industry: str) -> dict:
    """マッチした既存ページの空フィールドだけ x-work / gBizINFO の値で埋める。

    既存値が入っている場合は触らない。
    """
    additions: dict = {}
    rich_pairs = [
        ("代表者名", "representative"),
        ("部署/役職", "representative_title"),
        ("住所", "address"),
        ("法人番号", "hello_work_company_id"),
        ("資本金", "capital"),
    ]
    for prop_name, item_key in rich_pairs:
        if prop_name not in db_props:
            continue
        value = item.get(item_key)
        if not value or text_prop(page, prop_name):
            continue
        additions[prop_name] = _rich(value)
    if "会社URL" in db_props and item.get("company_url"):
        if not page.get("properties", {}).get("会社URL", {}).get("url"):
            additions["会社URL"] = {"url": item["company_url"]}
    if "電話番号" in db_props and item.get("phone"):
        if not page.get("properties", {}).get("電話番号", {}).get("phone_number"):
            additions["電話番号"] = {"phone_number": item["phone"]}
    if "従業員数" in db_props and item.get("employee_count_total") is not None:
        if _page_number(page, "従業員数") is None:
            additions["従業員数"] = {"number": item["employee_count_total"]}
    if "業種" in db_props and not _page_select(page, "業種"):
        additions["業種"] = {"select": {"name": industry}}
    return additions


def _rich(content: str) -> dict:
    return {"rich_text": [{"text": {"content": content}}]}


def build_memo(item: dict) -> str:
    lines: list[str] = []
    if item.get("detail_url"):
        lines.append(f"クロスワーク求人: {item['detail_url']}")
    if item.get("hello_work_company_id"):
        lines.append(f"法人番号: {item['hello_work_company_id']}")
    if item.get("representative_title"):
        lines.append(f"代表者役職: {item['representative_title']}")
    if item.get("occupation"):
        lines.append(f"職種: {item['occupation']}")
    if item.get("business_content"):
        lines.append(f"事業内容: {item['business_content']}")
    if item.get("company_feature"):
        lines.append(f"会社の特長: {item['company_feature']}")
    if item.get("business_summary_gbiz"):
        lines.append(f"事業概要(gBizINFO): {item['business_summary_gbiz']}")
    parts = []
    for key, label in [("employee_count_workplace", "就業場所"),
                       ("employee_count_female", "うち女性"),
                       ("employee_count_part_time", "うちパート")]:
        v = item.get(key)
        if v is not None:
            parts.append(f"{label}{v}人")
    if parts:
        lines.append("従業員内訳: " + " / ".join(parts))
    if item.get("gbiz_status"):
        lines.append(f"gBizINFO: {item['gbiz_status']}")
    return "\n".join(lines)


def build_new_props(item: dict, needs_review: bool, db_props: set[str],
                    industry: str) -> dict[str, Any]:
    props: dict[str, Any] = {
        "顧客名": {"title": [{"text": {"content": item.get("company_name", "")}}]},
        "掲載元メディア": {"multi_select": [{"name": MEDIA_TAG}]},
        "業種": {"select": {"name": industry}},
        "確認状況": {"select": {"name": "未確認"}},
        "重複確認必要": {"checkbox": needs_review},
    }
    optional: dict[str, Any] = {}
    if item.get("address"):
        optional["住所"] = _rich(item["address"])
    if item.get("company_url"):
        optional["会社URL"] = {"url": item["company_url"]}
    if item.get("phone"):
        optional["電話番号"] = {"phone_number": item["phone"]}
    if item.get("representative"):
        optional["代表者名"] = _rich(item["representative"])
    if item.get("representative_title"):
        optional["部署/役職"] = _rich(item["representative_title"])
    if item.get("hello_work_company_id"):
        optional["法人番号"] = _rich(item["hello_work_company_id"])
    if item.get("employee_count_total") is not None:
        optional["従業員数"] = {"number": item["employee_count_total"]}
    if item.get("capital"):
        optional["資本金"] = _rich(item["capital"])
    memo = build_memo(item)
    if memo:
        optional["メモ"] = _rich(memo)
    for key, val in optional.items():
        if key in db_props:
            props[key] = val
        else:
            print(f"[warn] DB property {key!r} not found; skipped", file=sys.stderr)
    return props


def run(input_path: Path, dry_run: bool, use_gbiz: bool,
        industry: str = DEFAULT_INDUSTRY) -> dict:
    client = NotionClient()
    db_props = fetch_db_properties(client)
    idx = build_index(client)
    items = json.loads(input_path.read_text(encoding="utf-8"))
    gbiz = GBizClient() if use_gbiz else None
    if use_gbiz and not (gbiz and gbiz.token):
        print("[warn] GBIZ_API_TOKEN not set; gBizINFO enrichment disabled",
              file=sys.stderr)
        gbiz = None
    stats = {"match_name": 0, "partial_phone": 0, "partial_host": 0,
             "new": 0, "media_appended": 0, "fields_filled": 0,
             "gbiz_ok": 0, "gbiz_miss": 0, "errors": 0}
    total = len(items)
    label = "dry-run" if dry_run else "writing"
    for i, item in enumerate(items, 1):
        if i % 50 == 0 or i == total:
            print(f"[{label}] {i}/{total}  matched={stats['match_name']}  "
                  f"new={stats['new']}  appended={stats['media_appended']}  "
                  f"filled={stats['fields_filled']}  errors={stats['errors']}",
                  file=sys.stderr, flush=True)
        if gbiz:
            enrich(item, gbiz)
            stats["gbiz_ok" if item.get("gbiz_status") == "ok" else "gbiz_miss"] += 1
        kind, page = classify(item, idx)
        stats[kind] += 1
        try:
            _process_item(client, item, kind, page, db_props, industry,
                          dry_run, stats)
        except (requests.HTTPError, RuntimeError) as e:
            stats["errors"] += 1
            body = ""
            if isinstance(e, requests.HTTPError) and e.response is not None:
                body = e.response.text[:200]
            print(f"[error] {item.get('company_name', '?')!r}: {e} {body}",
                  file=sys.stderr, flush=True)
    return stats


def _process_item(client: NotionClient, item: dict, kind: str, page: dict | None,
                  db_props: set[str], industry: str, dry_run: bool,
                  stats: dict) -> None:
    if kind == "match_name" and page is not None:
        if append_media(client, page, dry_run):
            stats["media_appended"] += 1
        additions = fill_empty_on_match(item, page, db_props, industry)
        if additions:
            stats["fields_filled"] += 1
            if not dry_run:
                client.update_properties(page["id"], additions)
        return
    if dry_run:
        return
    needs_review = kind in ("partial_phone", "partial_host")
    client.create_customer(build_new_props(item, needs_review, db_props, industry))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-gbiz", action="store_true",
                    help="gBizINFO による電話・URL 補完を無効化")
    args = ap.parse_args()
    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var is required", file=sys.stderr)
        return 2
    stats = run(args.input, args.dry_run, use_gbiz=not args.no_gbiz)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
