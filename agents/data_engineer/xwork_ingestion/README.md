# xwork_ingestion

x-work.jp（クロスワーク）の検索結果に掲載されている企業を、`💼 DB_顧客管理` に重複排除しながら取り込むためのローカル実行ツール。

## 構成

| ファイル | 役割 |
|---|---|
| `normalize.py` | 会社名・電話・URLの正規化。Notion `顧客名（正規化）` formula と同期 |
| `notion_client.py` | Notion REST API クライアント（fetch all / 追記 / create） |
| `scrape_xwork.py` | Playwright で x-work.jp の検索結果を巡回し JSON 出力 |
| `gbiz_enrich.py` | 経産省 gBizINFO API で電話・URL を補完 |
| `import_to_notion.py` | JSON を読み込み、重複判定 → 既存追記 or 新規作成 |
| `prefecture_cities.py` | 大阪/京都/兵庫/奈良の市町村リスト |
| `run_batch.py` | 4府県一括取得→マージ→投入のオーケストレータ |

## 前提

1. **利用規約を確認済みであること**（x-work.jp / X Mile 株式会社）
2. Notion インテグレーションを `DB_顧客管理` に接続済みで、token を取得していること
3. Python 3.10+
4. **DB_顧客管理 に以下プロパティが追加されていること**（無い場合はインポート時に
   `[warn] DB property '...' not found; skipped` が出てスキップされる）:
   - `法人番号` (text)
   - `従業員数` (number)
   - `資本金` (text)
5. （任意）電話番号・公式URL補完を行う場合は経産省 gBizINFO の API トークン
   （https://info.gbiz.go.jp/api/index.html から申請、即時発行）

## セットアップ

```bash
cd agents/data_engineer/xwork_ingestion
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env  # NOTION_TOKEN を埋める
```

## 実行手順

### 1. 検索結果を収集

x-work.jp は Next.js で構築されており、`<script id="__NEXT_DATA__">` に
求人一覧の構造化データが埋め込まれている。本ツールは DOM セレクタではなく
この JSON を直接パースする方式のため、見た目の変更には強い。

```bash
export $(cat .env | xargs)
python scrape_xwork.py \
  --url "https://x-work.jp/search?occupations=...&cities=..." \
  --out companies.json \
  --max-pages 50 \
  --delay 3
```

初回や、ヒット件数が想定と合わない場合は構造ダンプを取って確認する:

```bash
python scrape_xwork.py --url "..." --out companies.json --debug-dir ./debug --max-pages 1
# ./debug/next_data_p1.json に __NEXT_DATA__ の生JSONが保存される
```

抽出ロジックの当たり判定キー（`COMPANY_NAME_KEYS` 等）は
`scrape_xwork.py` 冒頭の定数で調整できる。

### 2. 重複判定 + Notion 取り込み

まず dry-run で件数を確認:
```bash
python import_to_notion.py --input companies.json --dry-run
```

出力例:
```json
{
  "match_name": 12,    // 既存ページに「クロスワーク」追記対象
  "partial_phone": 3,  // 部分一致 → 新規 + 重複確認必要✅
  "partial_host": 1,
  "new": 84,
  "media_appended": 12,
  "gbiz_ok": 78,        // gBizINFO で補完成功（電話・URL 等）
  "gbiz_miss": 22       // 法人番号が gBizINFO に未登録 or トークン未設定
}
```

問題なければ本実行:
```bash
python import_to_notion.py --input companies.json
```

gBizINFO 補完を無効にしたい場合:
```bash
python import_to_notion.py --input companies.json --no-gbiz
```

## 一括実行（大阪・京都・兵庫・奈良の施工管理7職種）

```bash
export $(grep -v '^#' .env | xargs)
python run_batch.py
```

このコマンド1発で:

1. 4府県（大阪・京都・兵庫・奈良）の市町村 × 7職種 を順次スクレイプ
2. `batch/{osaka,kyoto,hyogo,nara}.json` に府県別 JSON を出力
3. 会社名でデデュプして `batch/all.json` にマージ
4. Notion 既存DB と突合して **dry-run 統計を表示**
5. そのまま本実行 → 既存マッチ29社にタグ追記 + 新規追加

オプション:

```bash
python run_batch.py --dry-run                   # 投入前で停止
python run_batch.py --prefectures osaka kyoto   # 府県を絞る
python run_batch.py --skip-scrape               # 既存JSONを再利用
python run_batch.py --use-gbiz                  # gBizINFOで電話・URL補完
```

### マッチした既存ページの挙動

既存DBにある会社名にマッチした場合:
- `掲載元メディア` に「クロスワーク」を追記（既存値は維持）
- `代表者名 / 部署/役職 / 住所 / 法人番号 / 従業員数 / 資本金 / 業種` の
  **空フィールドのみ** を x-work の値で埋める（既存値は上書きしない）

統計 JSON の `fields_filled` がフィールド埋め対象の件数を示す。

## データクリーニング（重複検出）

DB 内の重複を多面的に検出して JSON レポートを出力する。判定は機械的に行い、
最終的な「残す/捨てる」判断は Notion UI + Notion AI に委ねるハイブリッド設計。

### 検出キー

| キー | 信頼度 | 例 |
|---|---|---|
| 法人番号（13桁） | 高 | 「(株)ABC」と「ABC建設」が同番号 → 同会社 |
| 電話番号（数字化） | 高 | `03-1234-5678` と `(03)1234-5678` |
| 会社URLホスト | 高 | `example.com` と `www.example.com` |
| 正規化名（厳格） | 中 | 「株式会社ABC」と「(株)ABC」 |
| 正規化名（緩い） | 低 | 「ABC建設」と「ABC建設工業」（false positive あり） |

### 実行

```bash
# レポート出力のみ（推奨）
python find_duplicates.py --report duplicates_report.json

# 低信頼度（緩い名前マッチ）を除外
python find_duplicates.py --report duplicates_report.json --skip-loose

# Notion で「重複確認必要」フラグを実際に立てる
python find_duplicates.py --apply
```

### canonical（正本）の自動選定

各グループで以下の順序で最高スコアのページを残し、他にフラグを立てる:

1. ステータスが「契約中/契約終了/アポイント獲得/商談中」等の「進行中・確定」状態
2. 入力済みフィールド数が多い
3. 作成日時が古い

### 推奨ワークフロー

```
[Python] find_duplicates.py --apply
  ↓ 非正本に `重複確認必要 = ON` + `確認状況 = 重複（統合/既存に追記）`
[Notion UI でフィルタ]
  重複確認必要 = ☑
[Notion AI / 手動]
  契約中を優先、メモ統合、不要ページをアーカイブ
```

メモは絶対に上書きしない設計のため、過去の手入力情報は保護される。

## マッピング表（取得項目 → Notion DB プロパティ）

| JSON フィールド | Notion プロパティ | 補足 |
|---|---|---|
| `company_name` | 顧客名（title） | |
| `address` | 住所（text） | |
| `phone` | 電話番号（phone） | gBizINFO 由来（x-work には無い） |
| `company_url` | 会社URL（url） | gBizINFO 由来 |
| `representative` | 代表者名（text） | |
| `representative_title` | 部署/役職（text） | 例：代表取締役 |
| `hello_work_company_id` | 法人番号（text） | 13桁 |
| `employee_count_total` | 従業員数（number） | |
| `capital` | 資本金（text） | 例：5,000万円 |
| `detail_url` / `occupation` / `business_content` / `company_feature` / 内訳 | メモ（text） | 集約 |
| -（固定） | 業種＝建設 / 掲載元メディア＝クロスワーク / 確認状況＝未確認 | |

## 重複判定ルール

1. **正規化会社名** が一致 → **マッチ**（既存ページの `掲載元メディア` に「クロスワーク」を追記、`新規ページは作成しない`）
2. **電話番号**（数字のみ）が一致 → 部分一致（新規作成 + `重複確認必要=✅`）
3. **会社URLのホスト** が一致 → 部分一致（同上）
4. いずれも該当なし → 新規作成（`業種=建設`, `確認状況=未確認`）

`normalize.py` の `normalize_company_name` を改修した場合は Notion 側の `顧客名（正規化）` formula と必ず同期させること。

## レート制限・倫理ガイド

- **3秒/ページ以上**のディレイを既定値とする（`--delay 3`）
- 並列実行はしない（Playwright 1ブラウザ）
- 個人情報（応募者氏名・電話など）は取得しない
- 取得対象は法人として公開されている企業名・所在地・採用URLのみ

## 関連エージェント

- **Data Engineer**: 本ツールのオーナー、品質管理
- **Legal Agent**: 利用規約・著作権の最終チェック
- **Sales Agent**: 取り込まれた新規リードの活用
- **QA Reviewer**: 投入後のデータ品質レビュー
