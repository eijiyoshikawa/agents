#!/usr/bin/env python3
"""articles_local/*.md（No.151〜300）を、既存スプレッドシート
「【ブログ更新用】アークホーム様」の18列に合わせた追記用CSVに変換する。

出力: articles_append_for_sheets.csv（そのままシートに追記インポートできる）
- 本文に「関連記事」は含めない前提（シート運用で削除されるため）
- No.=id、予約日/投稿日/納期/投稿者/予約済みは空欄（担当者が記入）
依存なし。build_csv.py のパーサを再利用。
"""
import csv
import glob
import os

from build_csv import parse_front_matter, jp_char_count

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "articles_local")
OUT_CSV = os.path.join(HERE, "articles_append_for_sheets.csv")

# 対象シートの列順（18列）
HEADERS = [
    "No.", "予約日", "投稿日", "納期", "投稿者", "予約済み",
    "カテゴリ", "記事タイトル", "サブタイトル", "本文",
    "メインキーワード（サブも入れる）", "サブキーワード",
    "メタディスクリプション", "タグ", "スラッグ", "文字数",
    "エリア", "ステータス",
]


def join_list(v):
    return "; ".join(v) if isinstance(v, list) else (v or "")


def build():
    files = sorted(glob.glob(os.path.join(SRC_DIR, "*.md")))
    if not files:
        print(f"{SRC_DIR} に .md がありません")
        return 1
    rows = []
    for path in files:
        with open(path, encoding="utf-8") as f:
            meta, body = parse_front_matter(f.read())
        cc = jp_char_count(body)
        rows.append({
            "No.": meta.get("id", ""),
            "予約日": "", "投稿日": "", "納期": "", "投稿者": "", "予約済み": "",
            "カテゴリ": meta.get("category", ""),
            "記事タイトル": meta.get("title", ""),
            "サブタイトル": meta.get("subtitle", ""),
            "本文": body,
            "メインキーワード（サブも入れる）": meta.get("target_keyword", ""),
            "サブキーワード": join_list(meta.get("sub_keywords", [])),
            "メタディスクリプション": meta.get("meta_description", ""),
            "タグ": join_list(meta.get("tags", [])),
            "スラッグ": meta.get("slug", ""),
            "文字数": cc,
            "エリア": meta.get("area", "東京・首都圏"),
            "ステータス": meta.get("status", "draft"),
        })
        flag = "" if 2500 <= cc <= 3200 else "  ← 文字数要確認"
        print(f"  No.{rows[-1]['No.']}: {cc}字{flag}")

    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)
    print(f"\n生成完了: {OUT_CSV}（{len(rows)}記事）")
    return 0


if __name__ == "__main__":
    raise SystemExit(build())
