"""DB_顧客管理 全体の重複検出ツール。

複数のキー（法人番号 / 電話 / URLホスト / 厳格名 / 緩い名）で突合し、
重複候補グループをレポート出力する。--apply オプションを付けると、
非正本ページの「重複確認必要」をONにし、メモに正本情報を追記する。

正本（canonical）の選定ルール: グループ内で
  1. ステータスが 契約中/契約終了/失注 等の「進行中・確定」状態を優先
  2. 入力済みフィールド数が多い
  3. 作成日時が古い

CLI:
    python find_duplicates.py --report report.json         # 検出のみ
    python find_duplicates.py --report report.json --apply # フラグ更新も実施
    python find_duplicates.py --max-pairs 5000 --apply     # 大量DB対策
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from normalize import (
    normalize_company_name,
    normalize_company_name_loose,
    normalize_corp_no,
    normalize_phone,
    normalize_url_host,
)
from notion_client import NotionClient, text_prop, title_of

ACTIVE_STATUSES = {"契約中", "契約終了", "アポイント獲得", "商談中", "提案中",
                   "見込み客", "資料請求", "パートナー", "失注"}


@dataclass
class PageInfo:
    id: str
    title: str
    created: str
    phone: str = ""
    url_host: str = ""
    address: str = ""
    corp_no: str = ""
    media: list[str] = field(default_factory=list)
    status: str = ""
    industry: str = ""
    field_count: int = 0
    memo: str = ""


def page_to_info(page: dict) -> PageInfo:
    props = page.get("properties", {})
    media = [m["name"] for m in props.get("掲載元メディア", {}).get("multi_select", [])]
    status_obj = props.get("ステータス", {}).get("status")
    status = status_obj.get("name") if status_obj else ""
    industry_obj = props.get("業種", {}).get("select")
    industry = industry_obj.get("name") if industry_obj else ""
    info = PageInfo(
        id=page["id"],
        title=title_of(page),
        created=page.get("created_time", ""),
        phone=normalize_phone(text_prop(page, "電話番号")),
        url_host=normalize_url_host(text_prop(page, "会社URL")),
        address=text_prop(page, "住所"),
        corp_no=normalize_corp_no(text_prop(page, "法人番号")),
        media=media,
        status=status,
        industry=industry,
        memo=text_prop(page, "メモ"),
    )
    # 入力済みフィールド数 (canonical 選定に使用)
    info.field_count = sum(1 for v in [
        info.phone, info.url_host, info.address, info.corp_no, info.status,
        info.industry, info.memo,
    ] if v)
    return info


def build_indexes(infos: list[PageInfo]) -> dict[str, dict[str, list[PageInfo]]]:
    idx = {
        "corp_no": defaultdict(list),
        "phone": defaultdict(list),
        "url_host": defaultdict(list),
        "name_strict": defaultdict(list),
        "name_loose": defaultdict(list),
    }
    for info in infos:
        if info.corp_no:
            idx["corp_no"][info.corp_no].append(info)
        if info.phone:
            idx["phone"][info.phone].append(info)
        if info.url_host:
            idx["url_host"][info.url_host].append(info)
        name_strict = normalize_company_name(info.title)
        if name_strict:
            idx["name_strict"][name_strict].append(info)
        name_loose = normalize_company_name_loose(info.title)
        if name_loose and name_loose != name_strict:
            idx["name_loose"][name_loose].append(info)
    return idx


def canonical_score(info: PageInfo) -> tuple:
    """並べ替え用のスコア。大きいほど canonical 優先。"""
    is_active = 1 if info.status in ACTIVE_STATUSES else 0
    # created は ISO 文字列、辞書順で古い方を選ぶため負号反転
    return (is_active, info.field_count, -ord(info.created[0]) if info.created else 0)


def pick_canonical(group: list[PageInfo]) -> PageInfo:
    # 並び替えで最大のものを canonical に
    return max(group, key=canonical_score)


def detect_groups(idx: dict[str, dict[str, list[PageInfo]]]) -> list[dict]:
    """重複グループを confidence 別にまとめる。

    同じグループが複数キーでマッチした場合は confidence の高い方を採用。
    """
    grouped: dict[frozenset, dict] = {}
    for key, conf in [
        ("corp_no", "high"),
        ("phone", "high"),
        ("url_host", "high"),
        ("name_strict", "medium"),
        ("name_loose", "low"),
    ]:
        for value, members in idx[key].items():
            if len(members) < 2:
                continue
            members_key = frozenset(m.id for m in members)
            existing = grouped.get(members_key)
            if existing and _conf_rank(existing["confidence"]) >= _conf_rank(conf):
                existing["match_keys"].append({"key": key, "value": value})
                continue
            grouped[members_key] = {
                "confidence": conf,
                "match_keys": [{"key": key, "value": value}],
                "members": members,
            }
    return list(grouped.values())


def _conf_rank(c: str) -> int:
    return {"high": 3, "medium": 2, "low": 1}.get(c, 0)


def build_report(groups: list[dict]) -> list[dict]:
    report: list[dict] = []
    for g in groups:
        canonical = pick_canonical(g["members"])
        members_out = []
        for m in g["members"]:
            members_out.append({
                "id": m.id,
                "title": m.title,
                "created": m.created,
                "status": m.status,
                "industry": m.industry,
                "phone": m.phone,
                "url_host": m.url_host,
                "corp_no": m.corp_no,
                "media": m.media,
                "is_canonical": m.id == canonical.id,
            })
        report.append({
            "confidence": g["confidence"],
            "match_keys": g["match_keys"],
            "canonical_id": canonical.id,
            "canonical_title": canonical.title,
            "members": members_out,
        })
    # 並び替え: confidence 高 → メンバー数多 → 先頭
    rank = {"high": 0, "medium": 1, "low": 2}
    report.sort(key=lambda g: (rank[g["confidence"]], -len(g["members"])))
    return report


def apply_marks(client: NotionClient, report: list[dict], dry_run: bool) -> dict:
    """非正本ページに `重複確認必要` と `確認状況=重複（統合/既存に追記）` を立てる。

    既存の `メモ` は上書きせず保存。canonical の情報は JSON レポートで確認する。
    """
    stats = {"groups": 0, "marked": 0, "errors": 0}
    for g in report:
        stats["groups"] += 1
        for m in g["members"]:
            if m["is_canonical"]:
                continue
            props = {
                "重複確認必要": {"checkbox": True},
                "確認状況": {"select": {"name": "重複（統合/既存に追記）"}},
            }
            if dry_run:
                continue
            try:
                client.update_properties(m["id"], props)
                stats["marked"] += 1
            except Exception as e:
                print(f"[error] mark {m['id']}: {e}", file=sys.stderr)
                stats["errors"] += 1
    return stats


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path, default=Path("duplicates_report.json"),
                    help="重複レポートの出力先 JSON")
    ap.add_argument("--apply", action="store_true",
                    help="非正本に「重複確認必要」フラグを実際に立てる")
    ap.add_argument("--skip-loose", action="store_true",
                    help="名前の緩いマッチ (low confidence) を除外する")
    args = ap.parse_args()

    if "NOTION_TOKEN" not in os.environ:
        print("error: NOTION_TOKEN env var is required", file=sys.stderr)
        return 2

    client = NotionClient()
    infos: list[PageInfo] = []
    skipped_archived = 0
    for page in client.iter_pages():
        if page.get("archived") or page.get("in_trash"):
            skipped_archived += 1
            continue
        infos.append(page_to_info(page))
        if len(infos) % 1000 == 0:
            print(f"[fetch] {len(infos)} pages", file=sys.stderr, flush=True)
    print(f"[fetch] total {len(infos)} pages "
          f"(skipped {skipped_archived} archived)", file=sys.stderr)

    idx = build_indexes(infos)
    groups = detect_groups(idx)
    report = build_report(groups)
    if args.skip_loose:
        report = [g for g in report if g["confidence"] != "low"]

    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    summary = {
        "groups_total": len(report),
        "by_confidence": {
            "high": sum(1 for g in report if g["confidence"] == "high"),
            "medium": sum(1 for g in report if g["confidence"] == "medium"),
            "low": sum(1 for g in report if g["confidence"] == "low"),
        },
        "duplicate_pages_total": sum(len(g["members"]) - 1 for g in report),
    }
    print(f"\n[summary] {json.dumps(summary, ensure_ascii=False)}")
    print(f"[summary] report written → {args.report}")

    if args.apply:
        print(f"\n[apply] marking non-canonical pages...", file=sys.stderr)
        apply_stats = apply_marks(client, report, dry_run=False)
        print(json.dumps(apply_stats, ensure_ascii=False, indent=2))
    else:
        print("\n[apply] dry-run mode (use --apply to mark in Notion)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
