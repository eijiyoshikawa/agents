# notion-mark-kansai-a

DB_顧客管理 から「関西・従業員30名以上」の企業を抽出して、`見込み度合い` を `A` に一括設定するスクリプト。

## 抽出条件

1. 従業員数 >= 30
2. 住所に「大阪府 / 京都府 / 兵庫県 / 滋賀県」のいずれかを含む
3. 住所に「東京都」を含まない（東京都府中市の誤検出回避）

## セットアップ

```bash
cd scripts/notion-mark-kansai-a
npm install
export NOTION_TOKEN=ntn_...   # DB_顧客管理 に接続済みのインテグレーションのシークレット
```

> 既に xwork_ingestion で使ってる NOTION_TOKEN（`~/agents/agents/data_engineer/xwork_ingestion/.env` 内）がそのまま使えます:
> ```bash
> export $(grep -v '^#' ~/agents/agents/data_engineer/xwork_ingestion/.env | xargs)
> ```

## 実行

### Dry-run（件数とサンプル5件だけ表示、書き込みなし）

```bash
DRY_RUN=1 node set-kansai-a.mjs
# または
npm run dry-run
```

### 本実行（Notion 書き込み）

```bash
node set-kansai-a.mjs
# または
npm run apply
```

## 設計のポイント

- **冪等性**: 既に `A` のページはスキップ。途中で止まっても再実行で続きから処理可能
- **レート制御**: 更新ごとに 350ms スリープ。429 は `Retry-After` 尊重、5xx は指数バックオフ最大5回
- **ログ**: 更新したページIDは `updated-log.csv` に追記（タイトル・前ランク・従業員数付き）

## 出力例

```
=== summary ===
total matched: 1234
already A:     60
to update:     1174
updated:       1174
failed:        0

rank breakdown (before update):
  (empty): 800
  A: 60
  B: 200
  C: 150
  D: 24
```
