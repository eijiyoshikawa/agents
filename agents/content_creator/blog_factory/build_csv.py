#!/usr/bin/env python3
"""articles/*.md（YAML front-matter＋本文）を読み、納品用 articles.csv を生成する。

依存ライブラリなし（PyYAML不要）。front-matterは本ファクトリで使うサブセットのみ対応:
  - スカラー: key: value
  - リスト: 直後の行に "  - item" を並べる
本文は2つ目の "---" 以降すべて。
"""
import csv
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ARTICLES_DIR = os.path.join(HERE, "articles")
OUT_CSV = os.path.join(HERE, "articles.csv")
# 作業メンバーがGoogleスプレッドシートへ取り込み、コピペ作業しやすいよう
# 日本語ヘッダー＋作業列を付けた版
OUT_SHEET_CSV = os.path.join(HERE, "articles_for_sheets.csv")

# CSVの列順（WordPress入力時のマッピングは ARTICLE_TEMPLATE.md を参照）
COLUMNS = [
    "id", "category", "title", "subtitle", "slug",
    "target_keyword", "sub_keywords", "meta_description",
    "body", "caption", "tags", "area", "company", "status",
    "char_count",
]
# CSVではリストを "; " で連結する列
LIST_FIELDS = {"sub_keywords", "tags"}

# シート用CSVの列順と日本語ヘッダー（作業しやすい並び）。
# (内部キー, 表示ヘッダー) のタプル。"__check__" は空の作業列。
SHEET_COLUMNS = [
    ("id", "記事番号"),
    ("__check__", "入力済み"),
    ("category", "カテゴリ"),
    ("title", "記事タイトル"),
    ("subtitle", "サブタイトル"),
    ("body", "本文"),
    ("target_keyword", "メインキーワード"),
    ("sub_keywords", "サブキーワード"),
    ("meta_description", "メタディスクリプション"),
    ("caption", "キャプション(alt)"),
    ("tags", "タグ"),
    ("slug", "スラッグ"),
    ("char_count", "文字数"),
    ("area", "エリア"),
    ("status", "ステータス"),
]


def parse_front_matter(text):
    """先頭の --- ... --- を辞書に、本文を文字列に分解して返す。"""
    if not text.startswith("---"):
        raise ValueError("front-matter（先頭の ---）がありません")
    lines = text.splitlines()
    # 2つ目の "---" を探す
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        raise ValueError("front-matter の終端 --- が見つかりません")

    meta = {}
    current_list_key = None
    for raw in lines[1:end]:
        if not raw.strip():
            continue
        # リスト要素
        stripped = raw.strip()
        if stripped.startswith("- ") and current_list_key:
            meta[current_list_key].append(_unquote(stripped[2:].strip()))
            continue
        # key: value
        if ":" in raw:
            key, _, value = raw.partition(":")
            key = key.strip()
            value = value.strip()
            if value == "":
                meta[key] = []
                current_list_key = key
            else:
                meta[key] = _unquote(value)
                current_list_key = None
    body = "\n".join(lines[end + 1:]).strip()
    return meta, body


def _unquote(v):
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        return v[1:-1]
    return v


def jp_char_count(text):
    """本文の文字数（空白・改行を除外した総文字数）。日本語の「文字数」に相当。"""
    return sum(1 for ch in text if not ch.isspace())


def build():
    if not os.path.isdir(ARTICLES_DIR):
        print(f"記事ディレクトリがありません: {ARTICLES_DIR}", file=sys.stderr)
        return 1
    files = sorted(f for f in os.listdir(ARTICLES_DIR) if f.endswith(".md"))
    if not files:
        print("articles/ に .md がありません", file=sys.stderr)
        return 1

    rows = []
    for fn in files:
        path = os.path.join(ARTICLES_DIR, fn)
        with open(path, encoding="utf-8") as f:
            meta, body = parse_front_matter(f.read())
        row = {}
        for col in COLUMNS:
            if col == "body":
                row["body"] = body
            elif col == "char_count":
                row["char_count"] = jp_char_count(body)
            elif col in LIST_FIELDS:
                val = meta.get(col, [])
                row[col] = "; ".join(val) if isinstance(val, list) else val
            else:
                row[col] = meta.get(col, "")
        rows.append(row)
        cc = row["char_count"]
        flag = "" if 2500 <= cc <= 3200 else "  ← 文字数要確認"
        print(f"  {fn}: {cc}字{flag}")

    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)

    # 作業メンバー向け：日本語ヘッダー＋「入力済み」作業列のシート用CSV
    with open(OUT_SHEET_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow([header for _, header in SHEET_COLUMNS])
        for row in rows:
            writer.writerow([
                "" if key == "__check__" else row.get(key, "")
                for key, _ in SHEET_COLUMNS
            ])

    print(f"\n生成完了:")
    print(f"  {OUT_CSV}（{len(rows)}記事 / 全項目・英語ヘッダー）")
    print(f"  {OUT_SHEET_CSV}（{len(rows)}記事 / スプレッドシート用・日本語ヘッダー）")
    return 0


if __name__ == "__main__":
    sys.exit(build())
