# データパイプライン設計

媒体（Meta / TikTok / LINE Ads）の生データ → 集計レイヤ → 分析・ダッシュボードまでの標準アーキテクチャ。

## 1. 全体図

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Meta Ads   │ │ TikTok Ads  │ │ LINE Ads    │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │                │                │
       │ Marketing API  │ Reporting API  │ Ads API
       │ (日次自動)     │ (日次自動)     │ (手動or API)
       └────────┬───────┴────────┬───────┘
                ▼                ▼
       ┌────────────────────────────────────┐
       │   集計レイヤ (Google Sheets / BQ)   │
       │   - ad_daily_raw (日次×Ad単位)      │
       │   - exp_summary  (EXP-ID別集計)     │
       │   - creative_score (CRTVスコア)     │
       └─────────┬──────────────────────┘
                 │
       ┌─────────┼──────────────────────┐
       │         │                      │
       ▼         ▼                      ▼
  ┌────────┐ ┌─────────┐         ┌─────────────┐
  │  GA4   │ │  CRM /  │         │ Notion DB    │
  │ + BQ   │ │ Notion  │         │ (応募管理)   │
  └────────┘ └─────────┘         └─────────────┘
       │         │                      │
       └─────────┼──────────────────────┘
                 ▼
       ┌────────────────────────────────┐
       │   Looker Studio ダッシュボード  │
       │   - 日次トレンド                │
       │   - CRTV別パフォーマンス        │
       │   - EXP-ID別レポート            │
       │   - 訴求軸×LPマトリクス         │
       └────────────────────────────────┘
```

## 2. 3段階のロードマップ

予算・スキル・規模で段階的に進める。

| Phase | 集計レイヤ | 媒体連携 | ダッシュボード | コスト | 工数（初期） |
|---|---|---|---|---|---|
| **Phase 1: 即始める** | Google Sheets（手動転記+一部自動） | 媒体ダッシュボードからCSVエクスポート手動 | Looker Studio（Sheets連携） | 無料 | 2-4時間 |
| **Phase 2: 半自動化** | Sheets + Apps Script | Meta/TikTok API + Supermetrics 等 | Looker Studio | 月0-5,000円 | 1-2日 |
| **Phase 3: 完全自動化** | BigQuery | 全媒体API + GA4 BQ Export | Looker Studio Pro / Metabase | 月数千-数万円 | 1-2週間 |

**月予算5万円規模なら Phase 1 で十分**。Phase 2 への移行は月20万円超 or 案件3つ以上から検討。

## 3. Phase 1: Google Sheets + 手動エクスポート

### 3.1 Sheet 構成（4タブ）

#### Tab1: `ad_daily_raw`（生データ）

媒体ダッシュボードからCSVエクスポートして日次貼付。

```
date | media | campaign | adset | ad | exp_id | lp_id |
imp | reach | freq | click | ctr | cpc | cost |
video_views_3s | video_view_rate_3s | save | share | comment | profile_visit |
```

#### Tab2: `applications`（応募ログ）

LINE / Notion から日次転記。応募1件1行。

```
applied_at | applicant_id | utm_source | utm_campaign | utm_content | utm_term |
exp_id | lp_id | line_friend_add_url |
valid (Y/N) | reachable (Y/N) | interview_scheduled (date) |
interview_done (date) | offer (date) | hire (date) | retained_90d (Y/N) |
notes
```

#### Tab3: `exp_summary`（EXP集計・関数）

`ad_daily_raw` と `applications` を EXP-ID で JOIN した結果。Sheets の QUERY関数 or BigQuery で生成。

```
exp_id | period | imp | click | ctr | cost |
applications | valid_applications | hires |
cpa_apply | cpa_valid | cph | retention_rate
```

#### Tab4: `creative_scores`（CRTV別スコア）

Ad単位の集計。Hook率・CTR・CVR の総合スコア化。

```
ad_id | exp_id | crtv_format | hook_id | imp | hook_rate_3s | ctr | cvr |
relative_ctr (vs sprint avg) | relative_cvr | composite_score |
sprint_status (winner / loser / hold)
```

### 3.2 媒体側エクスポート手順

#### Meta Ads Manager
1. Ads Manager → 期間指定 → Campaign / Ad Set / Ad 単位を選択
2. Columns: Performance + Engagement + Video + Custom (`utm_source`, `utm_campaign`, `utm_content` をURLパラメータマクロで含める)
3. Export → CSV
4. Sheets の `ad_daily_raw` に追記

スケジュール: 月・木の朝に直近を取り込み

#### TikTok Ads Manager
1. Reporting タブ → Custom Report
2. Dimension: Campaign / Ad Group / Ad / Date
3. Metric: Impression / Click / Cost / 3s View / Completion / Engagement
4. Export → CSV
5. 同様に Sheets 追記

#### LINE Ads Platform
1. キャンペーン管理 → レポート
2. 期間指定 → 媒体別/キャンペーン別エクスポート
3. CSV ダウンロード

### 3.3 応募データの取り込み

#### LINE 公式アカウント → 応募ログ

応募導線が LINE 一本化の場合:
1. LINE Manager で友だち追加履歴 + メッセージログを定期エクスポート
2. または LINE Webhook で友だち追加・キーワード反応イベントを Webhook → GAS（Google Apps Script）→ Sheets 自動追記
3. 友だち追加URL別（`lin.ee/XXX`）で流入元LPを判別

#### Notion DB → 応募ログ

Notion で応募管理する場合:
1. Notion DB を作成（応募管理プロパティ）
2. Retriever Agent 経由で日次取得 → CSV 化 → Sheets `applications` タブに追記
3. または Notion API を直接 Sheets に連携（Apps Script / Zapier）

### 3.4 Looker Studio 接続

1. Google アカウントで Looker Studio (https://lookerstudio.google.com/) を開く
2. 新規レポート → データソースに Sheets を接続（`ad_daily_raw` / `exp_summary` / `creative_scores`）
3. ダッシュボード作成（次節）

## 4. ダッシュボード設計

最低限作るべき5つのページ。

### Page 1: スプリント概要
- 今週の総コスト・総応募・CPA（前週比）
- 媒体別パフォーマンス棒グラフ
- 進行中 EXP-ID の状況

### Page 2: CRTV ランキング
- Ad単位のテーブル: Hook率・CTR・CVR・Composite Score 降順
- 訴求軸 × 形式のヒートマップ
- 勝ち弾・負け弾のフラグ

### Page 3: 訴求軸別パフォーマンス
- H1〜H6 別の集計
- 業種 × エリア × 訴求のマトリクス
- 時系列での勝ち訴求の推移

### Page 4: ファネル分析
- imp → click → session → form_start → apply → valid → hire の漏斗図
- LP別 CVR 比較
- 媒体別ファネル

### Page 5: 採用最終KPI
- CPH / CPRH の月次トレンド
- 採用済社員の媒体・訴求・LP分布
- 90日定着率

## 5. Phase 2: API自動連携

### 5.1 選択肢

| ツール | 強み | 弱み | コスト |
|---|---|---|---|
| **Supermetrics** | Sheets連携最速、UI簡単 | 高価、API制限あり | 月5,000円〜 |
| **Funnel.io** | エンタープライズ、安定 | 高価 | 月数万〜 |
| **Looker Studio コネクタ** | 無料、公式 | データ加工は手前で必要 | 無料 |
| **自作 Python/GAS** | 完全カスタム、無料 | 開発・保守工数 | 無料（開発工数別） |

**推奨**: 自作 GAS（Google Apps Script）で十分。Meta Marketing API トークン + TikTok API トークンを設定し、cron で日次取得。

### 5.2 Meta Marketing API（無料）

```javascript
// Apps Script 例（疑似コード）
function fetchMetaAds() {
  const token = PropertiesService.getScriptProperties().getProperty('META_TOKEN');
  const adAccountId = 'act_XXXXXXXXX';
  const fields = 'campaign_name,adset_name,ad_name,impressions,clicks,spend,actions,video_p25_watched_actions';
  const url = `https://graph.facebook.com/v18.0/${adAccountId}/insights?level=ad&time_range={'since':'YYYY-MM-DD','until':'YYYY-MM-DD'}&fields=${fields}&access_token=${token}`;
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  // → Sheets に書き込み
}
```

### 5.3 TikTok Marketing API（無料・要承認）

TikTok Business Center → Developer 申請 → 承認後にトークン発行 → 同様に GAS で取得。

### 5.4 LINE Ads API

API 提供は限定的（媒体パートナー経由が多い）。当面は手動エクスポート継続が現実的。

## 6. Phase 3: BigQuery 集約

規模化したら BigQuery 中央集約。

- 媒体API → Cloud Functions → BigQuery
- GA4 BQ Export（自動）
- 応募CRM → Cloud Functions → BigQuery
- Looker Studio Pro / Metabase で可視化

## 7. Offline Conversion アップロード（採用CV連携）

これが効く。CRMで採用が決まった時点で、媒体側に CV データを返す。

### Meta
- Offline Conversions API or Ads Manager の手動アップロード
- `event_name: Hire` / `event_time` / `user_data` (email/phone hash)
- 媒体側で「採用」最適化が学習開始

### TikTok
- Events API の Offline Event 送信
- 同じく PII ハッシュ化

### LINE Ads
- Conversion API（順次提供）
- 利用可能なら設定

これにより「応募ジャンクに最適化されている」状態から「採用最適化」状態へ移行。CPH が 20-40% 改善する事例多数。

## 8. プライバシー・ガバナンス

- PII（個人特定情報）は集計レイヤに**直接保存しない**。応募ログ側はマスク or ハッシュ化
- Sheets / BQ の共有設定は最小権限
- API トークンは Apps Script Properties / Secret Manager に格納（リポジトリにコミットしない）

## 9. 担当エージェント

| 役割 | 担当 |
|---|---|
| パイプライン設計 | Data Engineer + Infrastructure |
| 媒体API連携 | Engineer + Ad Operations |
| ダッシュボード制作 | Data Analyst |
| 日次運用 | Ad Operations |
| 異常検知 | KPI Dashboard |
