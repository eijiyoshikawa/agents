# Blog Factory — アークホーム（sumaiarchome.com）ブログ記事量産システム

不動産会社「アークホーム」（東京・首都圏）専用のブログ記事を、SEOを意識して
**100記事規模で量産**するための仕組み。
WordPress への入力は手動で行う前提のため、最終成果物は **CSV 一括ファイル**（`articles.csv`）。

## 何を生成するか
1記事あたり、以下をまとめて生成する。

| 項目 | 説明 |
|------|------|
| 記事タイトル（title） | H1＝titleタグ兼用。狙うKWを前方配置・32文字前後 |
| サブタイトル（subtitle） | リード前の補足見出し・導入の一文 |
| 本文（body） | **2,500〜3,000文字**。見出し（##/###）・表・リスト込みのMarkdown |
| キーワード（target_keyword / sub_keywords） | メインKW＋関連KW |
| メタディスクリプション（meta_description） | 検索結果用・110〜120文字 |
| キャプション（caption） | アイキャッチ画像のalt/キャプション案 |
| タグ（tags） | WordPressタグ |
| カテゴリ（category） | 売買・購入／売却／お金／賃貸／エリア／その他 |

## ディレクトリ構成
```
blog_factory/
├─ README.md            ← このファイル
├─ THEME_PLAN.md        ← 100記事の見出し・キーワード設計
├─ ARTICLE_TEMPLATE.md  ← 1記事の構成・品質基準（SEOチェックリスト準拠）
├─ build_csv.py         ← articles/*.md → articles.csv へコンパイル
├─ articles/            ← 1記事=1Markdown（YAML front-matter＋本文）
│   ├─ 001-*.md … 005-*.md   ← 見本5記事
│   └─ …                      ← 承認後に 006〜100 を追加
└─ articles.csv         ← 納品用CSV（build_csv.py が生成）
```

## ワークフロー
```
1. THEME_PLAN.md で100記事のテーマ・KWを確定
2. articles/NNN-slug.md を ARTICLE_TEMPLATE.md に沿って執筆
3. python3 build_csv.py で articles.csv を再生成
4. articles.csv を WordPress に手動入力（タイトル/本文/タグ/メタ等を該当欄へ）
```

## CSVの作り直し
```bash
cd agents/content_creator/blog_factory
python3 build_csv.py          # articles/ 全件 → articles.csv
```

## 会社情報・トーン（差し替え用）
- 会社名: **アークホーム**（front-matter `company`）
- 対応エリア: **東京・首都圏**（東京23区／多摩、神奈川・埼玉・千葉の近接エリア）
- トーン: 親しみやすさ＋専門的な信頼感。断定しすぎず、根拠と次の一歩を示す
- 社名・電話・キャンペーン等の最終事実確認は入力前に担当者が行うこと（本文はプレースホルダ/一般論ベース）

## 品質ガード（要約）
- 1ページ=1テーマ（SEOチェックリスト #33）
- H1＝title、狙うKWを前方配置（#43〜#45）
- h2/h3で構造化、各親に3つ以上（#41/#42/#48）
- 本文は最低でも目次設置レベルの分量（#29/#30）→ 2,500〜3,000字
- KWの乱用禁止・表記ゆれは自然に（#36/#37/#38）
- 表は表・リストはリストで（#53/#54）
- 詳細は ARTICLE_TEMPLATE.md / `/agents/seo_aieo/SEO_CHECKLIST_112.md`
