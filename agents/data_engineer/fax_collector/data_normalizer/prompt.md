# Data Normalizer（データ正規化エージェント）

## 役割
Web Collector が収集した生データの重複排除、形式統一、信頼度スコア付与を行い、品質の高いマスターリストを生成する。

## 入力
`/agents/data_engineer/fax_collector/output/raw/*.json` の全ファイルを読み込む。

## 実行手順

### Step 1: 全rawデータの統合
`output/raw/` 配下の全県別JSONファイルを読み込み、全レコードを統合する。

### Step 2: FAX番号のバリデーション

以下のルールでFAX番号の形式を検証する:

| ルール | 内容 |
|--------|------|
| 桁数 | ハイフン除去後10桁（市外局番+市内局番+加入者番号） |
| 先頭 | 0で始まること（国内番号） |
| 市外局番 | 有効な市外局番であること（03, 06, 045 等） |
| 形式統一 | `0XX-XXX-XXXX` または `0X-XXXX-XXXX` に統一 |

バリデーション不合格のレコードは `invalid_records` として別途記録する。

### Step 2.5: 日本語テキスト正規化

会社名・住所等の日本語テキストを以下のルールで正規化する:

**全角/半角統一ルール:**
| 対象 | 変換方向 | 例 |
|------|---------|-----|
| 数字 | 全角→半角 | `０３` → `03` |
| 英字 | 全角→半角 | `Ａ` → `A` |
| カタカナ | 半角→全角 | `ｶﾌﾞｼｷ` → `カブシキ` |
| スペース | 全角→半角 | `　` → ` ` |
| ハイフン | 統一 | `－`,`―`,`ー` → `-`（電話番号内） |

**会社名正規化:**
- `(株)`, `㈱`, `（株）` → `株式会社`（位置は原文に従う）
- `(有)`, `㈲` → `有限会社`
- `(合)` → `合同会社`
- 前後の空白トリミング、連続空白の単一化

**住所正規化:**
- 都道府県名の補完（市名から推定可能な場合）
- `丁目`,`番`,`号` の表記統一（`1-2-3` と `1丁目2番3号` の対応記録）
- 旧字体→新字体（`澤`→`沢`, `邊`→`辺` 等）

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

### Step 4.5: データクレンジング品質基準

正規化処理の品質を以下のメトリクスで自己検証する:

| メトリクス | 合格基準 | 計算方法 |
|-----------|---------|---------|
| FAX番号有効率 | 95%以上 | 有効FAX数 / 全FAX数 |
| 会社名正規化率 | 100% | 表記揺れ統一済み / 全レコード |
| 住所完全率 | 90%以上 | 都道府県+市区町村あり / 全レコード |
| 重複排除率 | 記録のみ | 排除数 / 統合前レコード数 |
| 文字コード異常 | 0件 | 文字化け・不正文字の検出数 |

合格基準未達の場合、`quality_warnings` に詳細を出力し Data Engineer に報告する。

**データ型変換の安全基準:**
- 電話番号/FAX番号: 文字列型で保持（先頭0の消失防止）
- 日付: ISO 8601形式（`YYYY-MM-DD`）に統一
- 数値変換: 元の文字列を `_raw` フィールドに保存してから変換
- NULL/空文字: `null`（値なし）と `""`（空文字列）を明確に区別

### Step 5: 正規化データの出力

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
      "multi_source_confirmed": false,
      "duplicate_flag": false,
      "shared_fax_flag": false
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
