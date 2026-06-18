#!/usr/bin/env python3
"""articles/*.md から、各記事の画像回収ブリーフ（CSV）を生成する。

作業メンバーがフリー素材サイトで検索→ダウンロード→WordPressメディアに
アップロードしやすいよう、記事ごとに以下を出力する:
  - アイキャッチ画像のファイル名（slug基準・命名規則統一）
  - alt（記事の caption を流用）
  - 検索キーワード（日本語／英語）
  - 本文中に足す画像のヒント
依存ライブラリなし。build_csv.py の front-matter パーサを再利用する。
"""
import csv
import glob
import os
import re

from build_csv import parse_front_matter

HERE = os.path.dirname(os.path.abspath(__file__))
ARTICLES_DIR = os.path.join(HERE, "articles")
OUT_CSV = os.path.join(HERE, "articles_image_brief.csv")

# カテゴリ → (日本語の検索ベース語, 英語の検索ベース語)
# 英語はフリー素材サイト（Unsplash/Pexels/Pixabay）でヒットしやすい汎用語。
CATEGORY_KW = {
    "売買・購入": (["不動産", "マンション", "住宅購入"],
                "japanese couple home buying real estate apartment"),
    "売買・売却": (["不動産", "一戸建て", "住宅 売却"],
                "selling home japan real estate house key handover"),
    "お金・ローン": (["住宅ローン", "家計", "電卓 お金"],
                 "home loan finance money calculator financial planning"),
    "賃貸": (["賃貸 部屋", "引っ越し", "アパート"],
            "apartment rental moving japan room interior"),
    "エリア": (["東京 街並み", "住宅街", "駅前"],
             "tokyo japan cityscape residential neighborhood station"),
    "その他": (["住まい", "住宅", "リフォーム"],
             "house home japan living renovation"),
    "テナント仲介": (["店舗 テナント", "オフィス", "商業施設"],
                "storefront shop office commercial space tokyo business"),
}
DEFAULT_KW = (["不動産", "住まい"], "real estate japan property")


def primary_term(target_keyword):
    """狙うKWの先頭語を記事固有の主題語として取り出す。"""
    parts = target_keyword.replace("　", " ").split()
    return parts[0] if parts else ""


def build():
    files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "*.md")))
    rows = []
    for path in files:
        with open(path, encoding="utf-8") as f:
            meta, _ = parse_front_matter(f.read())
        cat = meta.get("category", "")
        ja_base, en_base = CATEGORY_KW.get(cat, DEFAULT_KW)
        term = primary_term(meta.get("target_keyword", ""))

        # 検索KW（日）= 記事固有語 + カテゴリベース語（重複除去・先頭3語）
        ja_terms = []
        for w in [term] + ja_base:
            if w and w not in ja_terms:
                ja_terms.append(w)
        ja_kw = " / ".join(ja_terms[:3])

        slug = meta.get("slug", "")
        idn = meta.get("id", "")
        rows.append({
            "記事番号": idn,
            "カテゴリ": cat,
            "記事タイトル": meta.get("title", ""),
            "画像枚数の目安": "アイキャッチ1枚（必須）＋本文中1枚（任意）",
            "アイキャッチ_ファイル名": f"{idn}-{slug}-hero.jpg",
            "アイキャッチ_alt": meta.get("caption", ""),
            "検索キーワード(日)": ja_kw,
            "検索キーワード(英)": en_base,
            "本文中画像のヒント": f"最初の見出し（##）付近に「{term}」に関する写真や図解を1枚（任意）。"
                            f"ファイル名例: {idn}-{slug}-01.jpg",
        })

    headers = ["記事番号", "カテゴリ", "記事タイトル", "画像枚数の目安",
               "アイキャッチ_ファイル名", "アイキャッチ_alt",
               "検索キーワード(日)", "検索キーワード(英)", "本文中画像のヒント"]
    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)
    print(f"生成完了: {OUT_CSV}（{len(rows)}記事）")
    return 0


if __name__ == "__main__":
    raise SystemExit(build())
