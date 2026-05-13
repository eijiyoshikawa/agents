"""scrape_xwork.py の出力 JSON を DB_顧客管理 に取り込む。

突合キー:
  1) 正規化済み会社名（最優先・完全一致でマッチ確定）
  2) 正規化済み電話番号（あれば）
  3) 会社URL のホスト名（あれば）

挙動:
  - マッチあり → 既存ページの `掲載元メディア` に「クロスワーク」を追記
  - マッチなし → 新規ページ作成（掲載元メディア=クロスワーク, 業種=建設,
    確認状況=未確認）
  - 部分一致のみ → 新規作成 + `重複確認必要` を ON

CLI:
    python import_to_notion.py --input companies.json [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

from normalize import normalize_company_name, normalize_phone, normalize_url_host
from notion_client import NotionClient, media_of, text_prop, title_of

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
    for page in client.iter_pages():
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
    print(f"[index] fetched {total} existing customers", file=sys.stderr)
    return ExistingIndex(by_name, by_phone, by_host)


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


def build_new_props(item: dict, needs_review: bool) -> dict:
    props: dict = {
        "顧客名": {"title": [{"text": {"content": item.get("company_name", "")}}]},
        "掲載元メディア": {"multi_select": [{"name": MEDIA_TAG}]},
        "業種": {"select": {"name": DEFAULT_INDUSTRY}},
        "確認状況": {"select": {"name": "未確認"}},
        "重複確認必要": {"checkbox": needs_review},
    }
    if item.get("address"):
        props["住所"] = {"rich_text": [{"text": {"content": item["address"]}}]}
    if item.get("company_url"):
        props["会社URL"] = {"url": item["company_url"]}
    if item.get("phone"):
        props["電話番号"] = {"phone_number": item["phone"]}
    return props


def run(input_path: Path, dry_run: bool) -> dict:
    client = NotionClient()
    idx = build_index(client)
    items = json.loads(input_path.read_text(encoding="utf-8"))
    stats = {"match_name": 0, "partial_phone": 0, "partial_host": 0, "new": 0, "media_appended": 0}
    for item in items:
        kind, page = classify(item, idx)
        stats[kind] += 1
        if kind == "match_name" and page is not None:
            if append_media(client, page, dry_run):
                stats["media_appended"] += 1
            continue
        needs_review = kind in ("partial_phone", "partial_host")
        if dry_run:
            continue
        client.create_customer(build_new_props(item, needs_review))
    return stats


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var is required", file=sys.stderr)
        return 2
    stats = run(args.input, args.dry_run)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
