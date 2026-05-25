# LET データ連携セットアップ手順

> 適用: `playbooks/recruit_ads/04_measurement/data_pipeline.md`（Phase 1 即始める版）
> 目標: 配信開始（6/03）までに集計→ダッシュボードまで完成
> 担当: Engineer + Data Analyst

## 1. LET 案件の連携構成

```
[Meta Ads]  ──CSV──┐
[TikTok Ads] ──CSV──┤
[LINE Ads]  ──CSV──┤
                    ▼
            Google Sheets「LET 採用広告集計」
                    │ (3タブ)
                    │ ├ ad_daily_raw
                    │ ├ applications  ←┐
                    │ └ creative_scores│
                    │                   │
                    │           Notion DB「LET採用応募管理」
                    │           ↑   ↑
                    │      LINE OA  (手入力 or LINE Webhook→Notion)
                    ▼
            Looker Studio「LET ダッシュボード」
                    │
                    ├ Page 1: スプリント概要
                    ├ Page 2: CRTV ランキング
                    ├ Page 3: 訴求軸別
                    ├ Page 4: ファネル
                    └ Page 5: 採用KPI
```

## 2. LP 側のタグ追加（Engineer）

ユーザー回答: タグ追加可能。GTM 経由を推奨。

### 2.1 GTM コンテナ作成（10分）

1. https://tagmanager.google.com/ で新規アカウント作成
2. コンテナ名: `LET-Recruit`
3. Container ID（`GTM-XXXXXXX`）取得
4. LP-A / LP-B の `<head>` と `<body>` 直後に GTM スニペット追加（Next.js なら `_document.tsx` or `layout.tsx`）

### 2.2 タグ設定（30分）

GTM 管理画面で以下のタグを追加:

| タグ | トリガー | 設定 |
|---|---|---|
| GA4 設定タグ | All Pages | 既存の G-FMWMLCKLRZ / G-K2WV422BN8 を統合 → 新規プロパティ推奨 |
| Meta Pixel - PageView | All Pages | Pixel ID 設定後 |
| Meta Pixel - Lead | LINE友だち追加リンククリック | カスタムイベント |
| TikTok Pixel - PageView | All Pages | Pixel ID 設定後 |
| TikTok Pixel - ClickButton | LINE友だち追加リンククリック | カスタムイベント |
| LINE Tag - Conversion | LINE友だち追加リンククリック | LINE Tag ID 設定後 |
| GA4 Event - `line_friend_click` | 同上 | LINE誘導クリック計測 |

### 2.3 LINE 友だち追加クリックの捕捉

LP内の `lin.ee/QlrbDga`（LP-A）と `lin.ee/Qmxrf8O`（LP-B）へのクリックを GTM のトリガーで検出:

```
Trigger Type: Click - Just Links
This trigger fires on: Some Link Clicks
Click URL contains: lin.ee/
```

イベント発火時に `lp_id` (lp-a / lp-b) を dataLayer に push してアトリビューション可能に。

### 2.4 Test Events 確認

- Meta Events Manager → Test Events で `PageView` `Lead` 発火確認
- TikTok Events Manager → 同様
- LINE Tag Helper（Chrome拡張）で確認

## 3. 公式LINE アカウントの活用（1個・友だち追加URL 2本）

ユーザー回答: 公式LINE は 1個。`lin.ee/QlrbDga` と `lin.ee/Qmxrf8O` は同一アカウントの「流入元別追加URL」。

→ **LINE OA 側で「どのURLから友だち追加されたか」が記録可能**。これだけでLP-A/B別の友だち追加数を把握できる（媒体Pixel無しでも可）。

### 3.1 LINE Official Account Manager で確認すること

1. 友だち追加URLごとの統計（標準機能）
2. リッチメニューの設置状況
3. 自動応答メッセージ（友だち追加時・キーワード反応）
4. 応募完了の判定方法（特定キーワード送信時の自動応答 or オペレーター対応）

### 3.2 LINE → Notion 連携（推奨）

応募管理に Notion を使う場合:

**手順**:
1. Notion で「LET採用応募管理」DB作成（プロパティは下記）
2. LINE Webhook → Cloud Functions / Make / Zapier → Notion API で自動追加
3. または、LINE Manager の「友だち詳細」を日次で手動転記（小規模ならこれで十分）

**Notion DB プロパティ案**:
| プロパティ | 型 | 用途 |
|---|---|---|
| 応募者ID | Title (auto) | 主キー |
| 友だち追加日時 | Date | applied_at |
| 流入元LP | Select (lp-a/lp-b) | LP-A/B 判別 |
| 流入元URL | URL | lin.ee/QlrbDga or Qmxrf8O |
| 媒体推定 | Select (meta/tt/line/other) | LINE OA分析+UTMから推定 |
| EXP-ID | Text | 紐付け |
| ステータス | Select (lead/contacted/interview/offer/hire/declined/inactive) | ファネル |
| 連絡到達 | Checkbox | reachable |
| 面接日 | Date | interview_done |
| 内定日 | Date | offer |
| 採用日 | Date | hire |
| 90日定着 | Checkbox | retained_90d |
| 備考 | Text | |

→ Retriever Agent 経由で日次自動取得可能。

### 3.3 LINE か Notion かの判断

| 規模 | 推奨 |
|---|---|
| 月応募 < 10件 | LINE Manager + 手動 Excel | 
| 月応募 10-50件 | **Notion DB**（このプロジェクトに該当） |
| 月応募 50+件 | Notion + Cloud Functions 自動連携 |

→ **LET案件は当面 Notion DB 推奨**。

## 4. Google Sheets セットアップ（30分）

### 4.1 シート作成

1. Google Sheets で新規作成、名称: 「LET 採用広告集計 2026Q2」
2. 共有設定: 関係者のみ閲覧/編集
3. 3タブ作成

### 4.2 Tab1: `ad_daily_raw`

```
date | media | campaign | adset | ad | exp_id | lp_id |
imp | reach | freq | click | ctr | cpc | cost |
video_views_3s | video_view_rate_3s | save | share | comment
```

媒体別CSVを毎週火曜（Day0）に貼付・追記。

### 4.3 Tab2: `applications`

Notion DB を CSV エクスポート → 週次で貼付（または GAS で自動）。

```
applied_at | applicant_id | lp_id | line_friend_add_url |
exp_id | valid | reachable | interview_done |
offer | hire | retained_90d | notes
```

### 4.4 Tab3: `creative_scores`

`ad_daily_raw` を QUERY 関数で集計:

```excel
=QUERY(ad_daily_raw!A:T,
  "SELECT E, F, SUM(H), SUM(L), SUM(M)/SUM(H), SUM(N)/SUM(L)
   WHERE A >= date '" & TEXT(TODAY()-7, "yyyy-mm-dd") & "'
   GROUP BY E, F
   ORDER BY SUM(L) DESC")
```

→ Ad別の Hook率・CTR・CVR が出る。

## 5. Looker Studio ダッシュボード（60分）

### 5.1 接続

1. https://lookerstudio.google.com/ で新規レポート
2. データソース: Google Sheets コネクタ → 上記 Sheets の3タブを接続
3. （任意）GA4 コネクタも追加

### 5.2 ページ構成（最低限）

#### Page 1: スプリント概要
- スコアカード: 今週Cost / 応募数 / CPA（前週比）
- 媒体別 Cost & Apply の棒グラフ
- 進行中 EXP-ID テーブル

#### Page 2: CRTV ランキング
- Ad別 Hook率/CTR/CVR テーブル（カラースケール）
- 訴求軸 × 形式のピボット表

#### Page 3: ファネル
- imp → click → friend_add → apply → valid → hire のステップ
- LP-A vs LP-B の漏斗比較

#### Page 4: 訴求軸別
- H1〜H6 ごとの Cost/CTR/CVR
- 時系列推移

#### Page 5: 月次採用KPI
- CPA / CPH / CPRH トレンド
- 採用済社員の媒体・LP・訴求分布

### 5.3 共有

Looker Studio レポートURLを社内共有。閲覧権限のみで配布、編集は限定。

## 6. データ連携運用カレンダー

| 曜日 | アクション | 担当 | 所要 |
|---|---|---|---|
| 月朝 | LINE OA 友だち追加数チェック | Ad Ops | 5分 |
| 火朝 | 媒体CSVエクスポート → Sheets 貼付 | Ad Ops | 30分 |
| 火朝 | Notion DB → applications タブ更新 | Marketing | 15分 |
| 火午後 | creative_scores 確認・レトロ | Data Analyst | 30分 |
| 火午後 | Looker Studio 確認・レポート発行 | Data Analyst | 15分 |
| 毎日朝 | アラート閾値チェック（CPA異常） | Ad Ops | 5分 |

## 7. 自動化候補（Phase 2 移行時）

月予算20万円超 or 案件3つ以上から検討:

1. Apps Script で Meta / TikTok Marketing API 日次取得
2. LINE Webhook → Notion 自動投入
3. Notion → Sheets 自動同期
4. アラート Bot（Slack）

## 8. 配信前チェックリスト

- [ ] GTM コンテナ作成・両LP head に設置
- [ ] Meta Pixel 設定 + Test Events 確認
- [ ] TikTok Pixel 設定 + Test Events 確認
- [ ] LINE Tag 設定 + Tag Helper 確認
- [ ] `line_friend_click` イベント発火確認（LP-A/B別）
- [ ] Notion DB 作成・プロパティ設定
- [ ] Google Sheets 3タブ作成・列定義
- [ ] Looker Studio 5ページ雛形作成
- [ ] LINE OA 友だち追加URL別レポート画面の場所共有
- [ ] CAPI（Meta Conversions API）設定（後追いでOK、Phase 1は Pixel のみでも可）

## 9. ユーザーへの確認事項（残）

- [ ] 法人セールス JD 受領待ち
- [ ] 媒体アカウント（Meta BM / TikTok Ads / LINE Ads Platform）の有無
- [ ] 採用人数・期日
- [ ] 撮影協力可能な社員の有無
