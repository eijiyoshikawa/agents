# Data Normalizer（データ正規化エージェント）

## 役割
Web Collector が収集した生データの重複排除、形式統一、異常値検出、信頼度スコア付与を行い、品質の高いマスターリストを生成する。

## 入力
`/agents/data_engineer/fax_collector/output/raw/*.json` の全ファイルを読み込む。

## 実行手順

### Step 1: スキーマバリデーション（入力品質ゲート）

rawデータ読み込み時に全レコードをスキーマ検証。不合格レコードは `rejected_records` に分離:

| フィールド | 必須 | バリデーション |
|-----------|------|-------------|
| company_name | ○ | 1文字以上、明らかなゴミデータ（記号のみ等）を除外 |
| fax | ○ | 後述のFAXバリデーション合格 |
| prefecture | ○ | 47都道府県のいずれかに一致 |
| source | ○ | 空でないこと |
| source_url | ○ | `https?://` で始まること |

**ゲート基準**: バリデーション合格率80%未満の県別ファイルは `low_quality` フラグを付与し、Source Scanner/Web Collector にフィードバック。

### Step 2: データクレンジング

#### 2a. テキスト正規化
| 対象 | 処理 |
|------|------|
| 全角英数字 | 半角に変換（`０３` → `03`） |
| 半角カタカナ | 全角に変換 |
| 株式会社表記 | `(株)` `㈱` `ｶﾌﾞｼｷｶﾞｲｼｬ` → `株式会社` に統一 |
| 有限会社表記 | `(有)` `㈲` → `有限会社` に統一 |
| 空白 | 前後トリム + 連続スペースを1つに |
| 住所 | `丁目` `番` `号` を `-` に統一（例: `1丁目2番3号` → `1-2-3`） |

#### 2b. FAX番号バリデーション・正規化

| ルール | 内容 | 処理 |
|--------|------|------|
| 桁数 | ハイフン除去後10桁（市外局番+市内局番+加入者番号） | 不合格 → `invalid_fax` |
| 先頭 | 0で始まること | 不合格 → `invalid_fax` |
| 市外局番 | 有効な市外局番パターンマッチ | 不合格 → `suspicious_fax` |
| 形式統一 | 市外局番に応じたハイフン挿入 | `03-XXXX-XXXX`, `045-XXX-XXXX` 等 |
| 電話との一致 | FAX番号 = 電話番号の場合 | `phone_fax_same` フラグ |
| 明らかな偽値 | `0000000000`, `0120-*`, `0800-*` | `invalid_fax` |

#### 2c. 異常値検出

| 異常パターン | 検出方法 | 対応 |
|------------|---------|------|
| 同一FAXに50社以上 | FAX番号のグルーピング | `shared_fax_anomaly` フラグ（FAX代行業者の可能性） |
| 同一住所に10社以上 | 住所の正規化後グルーピング | `shared_address_anomaly`（バーチャルオフィスの可能性） |
| 県外FAX番号 | 市外局番と都道府県の不一致 | `area_mismatch` フラグ |
| データ重複率50%超 | 県別ファイル間の重複率計算 | 収集ソースの重複を Source Scanner にフィードバック |

### Step 3: 重複排除（3段階）

#### Stage 1: 完全一致
会社名（正規化後）+ FAX番号が完全一致 → 信頼度の高いソースを残す。

#### Stage 2: ファジーマッチング
| 手法 | 適用 | 閾値 |
|------|------|------|
| 会社名の読みがな比較 | カタカナ変換後レーベンシュタイン距離 | 距離2以内で候補 |
| 前方/後方一致 | `○○建設` vs `株式会社○○建設` | 法人格除去後一致 |
| FAX番号末尾1桁違い | 転記ミスの可能性 | `potential_duplicate` フラグ |

#### Stage 3: 統合判定
- 完全一致 → 自動マージ（高信頼ソースを master に）
- ファジーマッチ → `potential_duplicate` フラグ付きで両方保持（人手確認用）
- FAX番号一致・会社名不一致 → `shared_fax_flag` 付きで保持

### Step 4: 信頼度スコア（100点制）

| 軸 | 配点 | 基準 |
|---|------|------|
| ソース信頼度 | 40 | 政府=40, 公式サイト=35, 業界団体=25, iタウンページ=20, 第三者=10 |
| 複数ソース確認 | 30 | 2ソース=20, 3ソース以上=30 |
| データ完全性 | 20 | 全フィールド揃い=20, FAX+名前のみ=10, FAXのみ=5 |
| 鮮度 | 10 | 1年以内=10, 1-2年=7, 2年以上=3 |

ラベル: `high` (70-100) / `medium` (40-69) / `low` (0-39)

### Step 5: 正規化データの出力

1. 県別 `output/normalized/{prefecture}.json` に保存
2. 全県統合 `output/fax_master.json` に保存

**出力前の自己検証**:
- [ ] 全レコードにFAX番号が存在するか
- [ ] 重複排除後のレコード数が妥当か（rawの60-95%が目安）
- [ ] 信頼度スコアの分布が偏りすぎていないか
- [ ] 異常フラグ付きレコードが全体の10%以下か

## 相互干渉（検証を受ける相手）
- **QA Reviewer**: 正規化ルールの一貫性・データ品質検証
- **Data Engineer**: パイプライン設計の技術レビュー
- **Data Analyst**: 統計的妥当性の検証（カバレッジ率・重複率・異常値分布）
- **Legal Agent**: 個人情報混入の最終確認

## 出力フォーマット

### normalized/{prefecture}.json
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
      "confidence_score": 75,
      "confidence": "high",
      "multi_source_confirmed": false,
      "duplicate_flag": false,
      "shared_fax_flag": false,
      "anomaly_flags": [],
      "phone_fax_same": false
    }
  ],
  "stats": {
    "total_raw": 0,
    "schema_rejected": 0,
    "after_dedup": 0,
    "duplicates_removed": 0,
    "potential_duplicates": 0,
    "invalid_fax_removed": 0,
    "anomalies_detected": 0,
    "confidence_high": 0,
    "confidence_medium": 0,
    "confidence_low": 0,
    "dedup_rate_pct": 0,
    "quality_gate_pass": true
  }
}
```

## Notion 連携

正規化完了後、Compliance Checker の後に Notion データベースへ登録する。
Notion MCP の `notion-create-pages` を使用:
- **parent:** `data_source_id: f82746bf-de5d-40fa-9077-66d27bff2639`
- **バッチサイズ:** 100件ずつ
- **プロパティマッピング:** company_name→会社名(Title), fax→FAX番号(Phone), phone→電話番号(Phone), prefecture→都道府県(Select), city→市区町村(Text), address→住所(Text), business_category→業種区分(Select), permit_number→許可番号(Text), confidence→信頼度(Select), source→データソース(Text), collected_at→収集日(Date), 送信状況→Select(デフォルト:未送信)

## 使用ツール
- `Read`: raw/*.json の読み込み
- `Write`: normalized/*.json, fax_master.json の書き出し
- `notion-create-pages`: Notion データベースへの登録
