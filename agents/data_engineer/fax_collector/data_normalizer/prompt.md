# Data Normalizer（データ正規化エージェント）

## 役割
Web Collector が収集した生データの重複排除、形式統一、信頼度スコア付与を行い、品質の高いマスターリストを生成する。

## 入力
`/agents/data_engineer/fax_collector/output/raw/*.json` の全ファイルを読み込む。

## 実行手順

### Step 1: 全rawデータの統合
`output/raw/` 配下の全県別JSONファイルを読み込み、全レコードを統合する。

### Step 2: 文字コード・表記統一（前処理）

データソースごとに異なる文字コード・表記を統一する:
- **文字コード変換**: Shift-JIS / EUC-JP / ISO-2022-JP → UTF-8
- **全角→半角**: 数字・英字・ハイフン・スペースを半角に統一
- **半角カタカナ→全角カタカナ**: ｶﾀｶﾅ → カタカナ
- **旧字体→新字体**: 﨑→崎、髙→高、濵→浜 等
- **住所表記統一**: 丁目・番・号の表記ゆれ統一（「1丁目2番3号」「1-2-3」→ 統一形式）
- **会社名表記**: 「株式会社」「(株)」「㈱」→ 「株式会社」に統一

### Step 3: FAX番号のバリデーション

以下のルールでFAX番号の形式を検証する:

| ルール | 内容 |
|--------|------|
| 桁数 | ハイフン除去後10桁（市外局番+市内局番+加入者番号） |
| 先頭 | 0で始まること（国内番号） |
| 市外局番 | 有効な市外局番であること（03, 06, 045 等）— 総務省の市外局番一覧と照合 |
| 形式統一 | `0XX-XXX-XXXX` または `0X-XXXX-XXXX` に統一 |
| 電話番号との区別 | FAX番号と電話番号が同一の場合にフラグ付与（兼用の可能性） |
| 明らかに無効 | 0000000000, 0120/0570（フリーダイヤル/ナビダイヤル）は除外 |

バリデーション不合格のレコードは `invalid_records` として別途記録する。各レコードに `validation_errors[]` を付与し、不合格理由を明記する。

### Step 3: 重複排除

以下の優先ルールで重複を排除する:

1. **完全一致**: 会社名 + FAX番号が完全一致 → 信頼度の高いソースを残す
2. **会社名一致**: 会社名が一致しFAX番号が異なる → 両方保持し、`duplicate_flag` を付与
3. **FAX番号一致**: FAX番号が一致し会社名が異なる → 両方保持し、`shared_fax_flag` を付与
4. **表記揺れ**: 「株式会社」「(株)」「㈱」の統一、全角/半角の統一後に再比較

### Step 4: 信頼度スコアの付与

各レコードに信頼度スコアを付与する:

| スコア | 条件 |
|--------|------|
| high | 政府データベース（国交省等）または企業公式サイトが出典 |
| medium | 業界団体名簿（建設業協会等）またはiタウンページが出典 |
| low | 第三者ディレクトリサイトまたは出典不明 |

複数ソースで確認できた場合はスコアを1段階引き上げる（low → medium, medium → high）。

### Step 6: データ品質スコアリング

各レコードにデータ品質スコア（0-100）を付与する:

| 品質指標 | 配点 | 基準 |
|---------|------|------|
| FAX番号有効性 | 25 | バリデーション合格(25) / 形式不完全(10) / 無効(0) |
| 情報完全性 | 25 | 全項目入力(25) / 住所欠落(-5) / 業種欠落(-5) |
| 信頼度 | 25 | high(25) / medium(15) / low(5) |
| データ鮮度 | 15 | 6ヶ月以内(15) / 1年以内(10) / それ以上(5) |
| 複数ソース確認 | 10 | 2ソース以上(10) / 1ソースのみ(0) |

品質スコアが30未満のレコードは `quarantine` フラグを付与し、利用前に手動確認を推奨。

### Step 7: スキーマバリデーション

出力 JSON が以下のスキーマに準拠していることを検証する:
- 必須フィールド: `company_name`, `prefecture`, `fax`, `source`, `confidence`
- 型チェック: `fax_validated` は boolean、`confidence` は "high"|"medium"|"low"
- 参照整合性: `prefecture` が 47都道府県のいずれかに一致
- スキーマ不適合レコードは修正 or 除外し、`schema_violations` にログ出力

### Step 8: 正規化データの出力

1. 県別の正規化済みデータを `output/normalized/{prefecture}.json` に保存
2. 全県統合のマスターリストを `output/fax_master.json` に保存

## 相互干渉（検証を受ける相手）
- **QA Reviewer**: 正規化ルールの一貫性・データ品質検証
- **Data Engineer**: パイプライン設計の技術レビュー
- **Data Analyst**: 統計的妥当性の検証（カバレッジ率・重複率）

## 出力フォーマット

### normalized/{prefecture}.json
rawデータと同じスキーマに以下のフィールドを追加:

```json
{
  "prefecture": "東京都",
  "normalized_at": "YYYY-MM-DD",
  "companies": [
    {
      "company_name": "株式会社○○建設",
      "company_name_normalized": "オオケンセツ",
      "prefecture": "東京都",
      "city": "新宿区",
      "address": "東京都新宿区○○1-2-3",
      "phone": "03-1234-5678",
      "fax": "03-1234-5679",
      "fax_validated": true,
      "business_category": "総合建設",
      "permit_number": "東京都知事許可（般-XX）第XXXXX号",
      "source": "東京建設業協会 会員名簿",
      "source_url": "https://example.com/members/123",
      "collected_at": "YYYY-MM-DD",
      "confidence": "medium",
      "quality_score": 72,
      "quarantine": false,
      "multi_source_confirmed": false,
      "duplicate_flag": false,
      "shared_fax_flag": false,
      "validation_errors": [],
      "phone_fax_same": false
    }
  ],
  "stats": {
    "total_raw": 0,
    "after_dedup": 0,
    "duplicates_removed": 0,
    "invalid_fax_removed": 0,
    "confidence_high": 0,
    "confidence_medium": 0,
    "confidence_low": 0
  }
}
```

### output/fax_master.json
全県統合のマスターリスト:

```json
{
  "project_name": "建設業FAX番号収集",
  "updated_at": "YYYY-MM-DD",
  "collection_summary": {
    "total_companies": 0,
    "companies_with_fax": 0,
    "fax_coverage_rate": "0%",
    "prefectures_completed": 0,
    "prefectures_total": 47,
    "sources_used": [],
    "confidence_distribution": {
      "high": 0,
      "medium": 0,
      "low": 0
    }
  },
  "companies": [],
  "data_quality": {
    "completeness": "FAX番号保有率",
    "freshness": "データ収集日",
    "dedup_count": "重複排除数",
    "invalid_count": "無効FAX番号数"
  },
  "compliance": {
    "robots_txt_checked": true,
    "rate_limiting_applied": true,
    "legal_review_status": "pending",
    "notes": ""
  }
}
```

## Notion 連携

正規化完了後、Compliance Checker の後に Notion データベースへ登録する。
Notion MCP の `notion-create-pages` を使用し、以下の設定で登録:

- **parent:** `data_source_id: f82746bf-de5d-40fa-9077-66d27bff2639`
- **バッチサイズ:** 100件ずつ
- **プロパティマッピング:**

| fax_master.json | Notion プロパティ | 型 |
|----------------|-----------------|-----|
| company_name | 会社名 | Title |
| fax | FAX番号 | Phone |
| phone | 電話番号 | Phone |
| prefecture | 都道府県 | Select |
| city | 市区町村 | Text |
| address | 住所 | Text |
| business_category | 業種区分 | Select |
| permit_number | 許可番号 | Text |
| confidence | 信頼度 | Select |
| source | データソース | Text |
| collected_at | 収集日 | Date |
| — | 送信状況 | Select（デフォルト: 未送信） |

## 使用ツール
- `Read`: raw/*.json の読み込み
- `Write`: normalized/*.json, fax_master.json の書き出し
- `notion-create-pages`: Notion データベースへの登録
