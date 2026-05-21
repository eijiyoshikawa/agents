# 建設業FAX番号収集パイプライン 実行手順書

## 概要
公開データベースから建設業者のFAX番号を体系的に収集する4エージェントパイプライン。
都道府県単位で収集し、重複排除・法務チェックを経て営業利用可能なマスターリストを生成する。

## 前提条件
- Claude Code（Max プラン）で実行
- WebSearch / WebFetch が利用可能であること
- Notion MCP サーバーが接続済みであること

## Notion データベース
- **管理ページ:** `建設業FAX管理システム`（page_id: `343c57ee-1f60-8118-b00d-d81c1ce39752`）
- **FAX番号リスト DB:**（database_id: `a7cad0c3d570437ba99e3c5936458ba0`）
- **データソース ID:** `f82746bf-de5d-40fa-9077-66d27bff2639`

### ビュー構成
| ビュー名 | 種別 | 用途 |
|---------|------|------|
| デフォルト | テーブル | 全データ閲覧 |
| 送信管理ボード | ボード（送信状況別） | 未送信→送信済みのカンバン管理 |
| 未送信リスト | テーブル（フィルタ済み） | 送信対象の抽出 |
| 都道府県別 | ボード（都道府県別） | 地域ごとのデータ確認 |
| 送信済み一覧 | テーブル（フィルタ済み） | 送信履歴の確認 |

## パイプライン全体像

```
[都道府県 / 業種指定]
      │
      ▼
┌────────────────────────┐
│ 1. Source Scanner       │  ← 各県のデータソース可用性を調査
└─────┬──────────────────┘
      │
      ▼
┌────────────────────────┐
│ 2. Web Collector        │  ← WebSearch + WebFetch でFAX番号を収集
│   （県ごとに順次実行）    │     robots.txt遵守・リクエスト間隔を確保
└─────┬──────────────────┘
      │
      ▼
┌────────────────────────┐
│ 3. Data Normalizer      │  ← 重複排除・形式統一・信頼度スコア付与
└─────┬──────────────────┘
      │
      ▼
┌────────────────────────┐
│ 4. Compliance Checker   │  ← Legal Agent連携・特商法チェック
└─────┬──────────────────┘
      │
      ▼
[fax_master.json 出力]
      │
      ▼
[Sales Agent / Marketing Agent に引き渡し]
```

## データソース優先順位

| 優先度 | ソース | 方法 | 備考 |
|--------|--------|------|------|
| 1 | WebSearch集約 | 検索クエリで直接FAX番号付き一覧を取得 | 即時実行可能 |
| 2 | iタウンページ (itp.ne.jp) | WebSearch → WebFetch | FAX欄が明示的にある |
| 3 | 各都道府県建設業協会 | WebSearch → WebFetch | 会員名簿を公開している協会が多い |
| 4 | 政府オープンデータ | CSV/Excelダウンロード | 都道府県による |
| 5 | 国交省 建設業許可業者検索 | WebSearch経由（SPA直接不可） | JavaScript SPAのため直接取得困難 |

## 実行手順

### Step 0: 準備
対象都道府県と業種を確認する。
以下の手順では `{{都道府県}}` を実際の都道府県名に置き換えること。
初回はパイロットとして東京都1県で実行することを推奨。

---

### Step 1: Source Scanner（データソース調査）
**プロンプト:** `/agents/data_engineer/fax_collector/source_scanner/prompt.md`
**出力:** `/agents/data_engineer/fax_collector/source_scanner/output.json`

1. 対象都道府県で利用可能なデータソースを `WebSearch` で調査
2. 各データソースのURL・カバレッジ・FAX番号の有無を確認
3. `output.json` に保存

**完了条件:** 各都道府県に対し最低1つ以上のデータソースが特定されている

---

### Step 2: Web Collector（データ収集）
**プロンプト:** `/agents/data_engineer/fax_collector/web_collector/prompt.md`
**入力:** `/agents/data_engineer/fax_collector/source_scanner/output.json`
**出力:** `/agents/data_engineer/fax_collector/output/raw/{prefecture}.json`

1. source_scanner の結果に基づき、優先度の高いソースから順に収集
2. `WebSearch` で建設会社リストを検索
3. `WebFetch` で個別ページからFAX番号を抽出
4. 県ごとに `output/raw/{prefecture}.json` に保存

**完了条件:** 対象県のrawデータが保存されている。FAX番号が1件以上含まれる

**注意:**
- robots.txt を遵守すること
- WebFetch のリクエスト間隔を空けること（連続アクセスしない）
- 1県あたりの処理が完了してから次の県に進むこと

---

### Step 3: Data Normalizer（データ正規化）
**プロンプト:** `/agents/data_engineer/fax_collector/data_normalizer/prompt.md`
**入力:** `/agents/data_engineer/fax_collector/output/raw/*.json`
**出力:**
- `/agents/data_engineer/fax_collector/output/normalized/{prefecture}.json`
- `/agents/data_engineer/fax_collector/output/fax_master.json`

1. 全rawデータを読み込み
2. 会社名 + 住所で重複を排除
3. 電話番号・FAX番号の形式を統一（0XX-XXX-XXXX）
4. 信頼度スコア（high/medium/low）を付与
5. 正規化済みデータと統合マスターリストを出力

**完了条件:** fax_master.json にスキーマ準拠のデータが格納されている

---

### Step 4: Compliance Checker（法務チェック）
**プロンプト:** `/agents/data_engineer/fax_collector/compliance_checker/prompt.md`
**入力:** `/agents/data_engineer/fax_collector/output/fax_master.json`
**出力:** `/agents/data_engineer/fax_collector/compliance_checker/output.json`（+ fax_master.json のcompliance欄更新）

1. 収集データの法的適合性を確認
2. 特定商取引法に基づくFAX DM送信要件を整理
3. 個人事業主データの個人情報保護法リスクを評価
4. fax_master.json の `compliance` セクションを更新

**完了条件:** compliance_checker/output.json に法的注意事項が記載されている

---

---

### Step 5: Notion 登録
**出力先:** Notion「建設業FAX番号リスト」データベース

1. `fax_master.json` の全レコードを Notion データベースに登録
2. Notion MCP の `notion-create-pages` を使用
3. 各レコードを以下のプロパティにマッピング:
   - `会社名` → 会社名（Title）
   - `fax` → FAX番号
   - `phone` → 電話番号
   - `prefecture` → 都道府県（Select）
   - `city` → 市区町村
   - `address` → 住所
   - `business_category` → 業種区分（Select）
   - `permit_number` → 許可番号
   - `confidence` → 信頼度（Select）
   - `source` → データソース
   - `collected_at` → 収集日
   - 送信状況 → 「未送信」をデフォルト設定
4. 登録時は100件ずつバッチで実行
5. parent は `data_source_id: f82746bf-de5d-40fa-9077-66d27bff2639` を指定

**完了条件:** Notion DB にデータが登録され、各ビューで閲覧可能

---

## 完了後

1. Notion の「送信管理ボード」で送信状況を管理
2. FAX送信後に「送信状況」を「送信済み」に変更し「送信日」を記入
3. 送信停止要求があった場合は「停止要求」に変更
4. FAX DM送信前に必ず弁護士等の専門家に法的確認を実施
5. 送信時は特定商取引法に基づく表示義務を遵守（送信者名・連絡先・停止方法）

## 運用フロー

```
パイプライン実行 → Notion DB に自動登録
                        │
                        ▼
              ┌─────────────────┐
              │ 「未送信リスト」  │ ← 都道府県でフィルタして送信対象を選定
              │   ビューで確認    │
              └────┬────────────┘
                   │ FAX送信
                   ▼
              ┌─────────────────┐
              │「送信管理ボード」 │ ← 送信状況を「送信済み」に更新
              │  で進捗管理      │    送信日を記入
              └────┬────────────┘
                   │
                   ▼
              ┌─────────────────┐
              │「送信済み一覧」   │ ← 送信履歴の確認・レポート
              │  で実績確認      │
              └─────────────────┘
```
