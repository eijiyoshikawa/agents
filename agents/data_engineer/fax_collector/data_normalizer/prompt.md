# Data Normalizer（データ正規化エージェント）

## 役割
Web Collector が収集した生データの重複排除、形式統一、信頼度スコア付与を行い、品質の高いマスターリストを生成する。

## 入力
`/agents/data_engineer/fax_collector/output/raw/*.json` の全ファイルを読み込む。

## 実行手順

### Step 1: 全rawデータの統合
`output/raw/` 配下の全県別JSONファイルを読み込み、全レコードを統合する。

### Step 2: FAX番号の正規化とバリデーション

#### 2-1: 文字列の前処理（正規化ルール）

収集データの表記ゆれを統一するため、以下の順序で正規化処理を行う:

| 処理順 | 変換内容 | 例 |
|--------|---------|-----|
| 1 | **全角→半角変換** | `０３−１２３４−５６７８` → `03-1234-5678` |
| 2 | **全角ハイフン類の統一** | `ー`（長音）、`−`（全角ハイフン）、`―`（ダッシュ）、`‐`（ハイフン） → `-` |
| 3 | **括弧の除去** | `(03)1234-5678` → `03-1234-5678` |
| 4 | **スペースの除去** | `03 1234 5678` → `03-1234-5678`（ハイフン挿入） |
| 5 | **ドット区切りの変換** | `03.1234.5678` → `03-1234-5678` |
| 6 | **国際番号の国内番号変換** | `+81-3-1234-5678` → `03-1234-5678` |
| 7 | **先頭ゼロの補完** | `3-1234-5678`（市外局番の0欠落）→ `03-1234-5678` |

#### 2-2: 市外局番の補完と検証

市外局番が不完全な場合、都道府県・市区町村情報から推定補完する:

| パターン | 対応 |
|---------|------|
| 市外局番なし（`1234-5678`のみ） | 住所の市区町村から市外局番を推定。推定した場合 `area_code_inferred: true` を付与 |
| 市外局番の桁数不正 | 総務省「電気通信番号指定状況」の市外局番一覧と照合 |
| IP電話（050始まり） | 有効だがFAX対応は不確実。`fax_type: "ip_phone"` を付与 |

**市外局番マスター参照元:** 総務省 電気通信番号計画（https://www.soumu.go.jp/main_sosiki/joho_tsusin/top/tel_number/）

#### 2-3: バリデーションルール

以下のルールでFAX番号の形式を最終検証する:

| ルール | 内容 |
|--------|------|
| 桁数 | ハイフン除去後10桁（市外局番+市内局番+加入者番号） |
| 先頭 | 0で始まること（国内番号） |
| 市外局番 | 有効な市外局番であること（03, 06, 045 等） |
| 形式統一 | `0XX-XXX-XXXX` または `0X-XXXX-XXXX` に統一 |
| 携帯番号除外 | 090/080/070 始まりはFAXとして無効 |
| 連続番号チェック | `0000000000` 等の明らかに無効な番号を除外 |

バリデーション不合格のレコードは `invalid_records` として別途記録し、不合格理由を `invalid_reason` に記載する。

### Step 3: 重複排除（3段階精度向上方式）

以下の3段階で重複排除を行い、精度を段階的に向上させる:

#### 第1段階: 完全一致排除
1. **完全一致**: 会社名 + FAX番号が完全一致 → 信頼度の高いソースを残す
2. **FAX番号一致**: FAX番号が一致し会社名が異なる → 両方保持し、`shared_fax_flag` を付与

#### 第2段階: 類似一致排除（表記ゆれ解消後の再比較）
以下の正規化を行った上で再度比較する:

| 正規化対象 | 変換ルール |
|-----------|-----------|
| 法人格表記 | 「株式会社」「(株)」「㈱」「ｶﾌﾞｼｷｶﾞｲｼｬ」→ 統一表記「株式会社」 |
| 法人格位置 | 前株・後株を統一（「株式会社○○」と「○○株式会社」を同一候補として扱う） |
| 全角/半角 | 全角英数字・カナ → 半角に統一 |
| スペース | 全角/半角スペースの除去 |
| 旧字体 | 「髙」→「高」、「﨑」→「崎」等の異体字を統一 |
| 記号 | 「・」「＆」「&」等の記号を統一 |

類似一致判定されたペアは `similar_match_flag: true` を付与し、人的確認リストに追加。

#### 第3段階: 名寄せ（住所情報を活用した高精度マッチング）
会社名が異なっていても、以下の条件を満たす場合は同一法人の可能性として `name_merge_candidate: true` を付与:

- FAX番号が一致 + 住所（市区町村レベル）が一致
- 会社名の一部が一致（例:「○○建設」と「○○建設工業」）+ 住所が一致
- 許可番号が一致（最も信頼性の高い名寄せキー）

**名寄せの注意事項:**
- 自動マージは行わない。候補リストを `output/merge_candidates.json` に出力し、人的確認を必須とする
- 許可番号が一致する場合のみ、高確信度の自動マージを許可する

### Step 4: 信頼度スコアの多次元化

各レコードに3つの次元から複合的な信頼度スコアを算出する:

#### 4-1: ソース信頼性スコア（source_reliability: 0.0〜1.0）

| スコア | 条件 |
|--------|------|
| 1.0 | 政府データベース（国交省、都道府県庁等）が出典 |
| 0.8 | 企業公式サイトに掲載されたFAX番号 |
| 0.6 | 業界団体名簿（建設業協会等）が出典 |
| 0.5 | 商用ディレクトリ（iタウンページ等）が出典 |
| 0.3 | 第三者ディレクトリサイトが出典 |
| 0.1 | 出典不明・個人サイト |

#### 4-2: 情報鮮度スコア（freshness: 0.0〜1.0）

| スコア | 条件 |
|--------|------|
| 1.0 | 収集日から30日以内に更新されたソース |
| 0.8 | 90日以内 |
| 0.6 | 180日以内 |
| 0.4 | 1年以内 |
| 0.2 | 1年超 |
| 0.3 | 更新日不明（デフォルト値） |

#### 4-3: 確認件数スコア（confirmation: 0.0〜1.0）

| スコア | 条件 |
|--------|------|
| 1.0 | 3つ以上の独立したソースで確認 |
| 0.8 | 2つの独立したソースで確認 |
| 0.5 | 1つのソースのみ（未確認） |

#### 複合信頼度スコアの算出

```
composite_confidence = (source_reliability × 0.4) + (freshness × 0.3) + (confirmation × 0.3)
```

| 複合スコア | ラベル | 利用判断 |
|-----------|--------|---------|
| 0.7 以上 | **high** | 即座に利用可能 |
| 0.4〜0.7 | **medium** | 利用可能（他ソースでの追加確認を推奨） |
| 0.4 未満 | **low** | 追加確認なしでは利用非推奨 |

### Step 4.5: データ品質メトリクス

正規化完了後、以下の4指標でデータ品質を定量評価する:

#### 完全性（Completeness）
必須フィールドの充填率を測定する:

| フィールド | 重要度 | 計算方法 |
|-----------|--------|---------|
| company_name | 必須 | 充填レコード数 / 全レコード数 |
| fax | 必須 | FAX番号あり / 全レコード数 |
| prefecture | 必須 | 充填レコード数 / 全レコード数 |
| address | 推奨 | 充填レコード数 / 全レコード数 |
| phone | 推奨 | 充填レコード数 / 全レコード数 |
| permit_number | 任意 | 充填レコード数 / 全レコード数 |

**完全性スコア** = (必須フィールド充填率 × 0.7) + (推奨フィールド充填率 × 0.2) + (任意フィールド充填率 × 0.1)

#### 正確性（Accuracy）
データの正しさを検証する:

- FAXバリデーション通過率（有効なFAX番号の割合）
- 市外局番と住所の整合性（東京都のレコードに03/042/0422等の対応する市外局番があるか）
- 許可番号フォーマットの正規表現チェック通過率

#### 一貫性（Consistency）
データ内の整合性を検証する:

- 同一会社名で異なるFAX番号を持つレコードの割合
- 住所と都道府県フィールドの不一致率
- 業種区分の分類ゆれ率（「総合建設」「建築一式」等の表記統一度）

#### 適時性（Timeliness）
データの新鮮さを測定する:

- 収集日から30日以内のデータの割合
- ソースの最終更新日の中央値
- 1年以上前のデータの割合（古いデータの混入率）

**品質メトリクスの合格基準:**

| 指標 | 合格ライン | 要改善ライン |
|------|-----------|------------|
| 完全性 | 0.85 以上 | 0.70 未満 |
| 正確性 | 0.90 以上 | 0.80 未満 |
| 一貫性 | 0.85 以上 | 0.70 未満 |
| 適時性 | 0.70 以上 | 0.50 未満 |

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
      "confidence_scores": {
        "source_reliability": 0.6,
        "freshness": 0.8,
        "confirmation": 0.5,
        "composite": 0.62
      },
      "multi_source_confirmed": false,
      "duplicate_flag": false,
      "shared_fax_flag": false,
      "similar_match_flag": false,
      "name_merge_candidate": false,
      "area_code_inferred": false,
      "fax_type": "landline",
      "invalid_reason": null
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
