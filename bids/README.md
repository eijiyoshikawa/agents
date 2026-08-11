# 入札案件ウォッチ（AI / SNS）

日本国内の **AI関連** および **SNS関連** の公共入札・公募型プロポーザル案件を定期収集し、
週次で Gmail に通知することを目的としたウォッチ運用のディレクトリ。

担当エージェント想定: **Subsidy Scout** の入札版（将来 `bid_scout` として切り出し可）。
本フェーズは「まず1回分のリストを作って判断」段階のため、**手動収集 + Markdown 出力**で運用する。

---

## スコープ（対象範囲）

| 軸 | 対象 |
|----|------|
| 領域 | ① AI / 生成AI 活用・導入・運用 ② SNS 運用・広告・プロモーション |
| 発注主体 | **国の機関**（省庁・独立行政法人）＋ **主要自治体**（都道府県・政令市中心） |
| 案件種別 | 一般競争入札 / 指名競争入札 / 公募型プロポーザル / 企画競争 / 企画提案募集 |
| ステータス | 公告中（受付中）を優先。直近の終了案件は「傾向把握」用に参考掲載 |

将来的に市区町村まで対象拡張・通知頻度変更が可能（後述「拡張プラン」）。

---

## 検索キーワード

`keywords.md` を正本とする。要点:

- **AI系**: `生成AI` / `AI活用` / `AIチャットボット` / `RAG` / `LLM` / `AI-OCR` / `機械学習` / `データ分析 AI`
- **SNS系**: `SNS運用` / `SNS広告` / `Instagram` / `TikTok` / `YouTube` / `X (Twitter)` / `デジタルマーケティング` / `シティプロモーション` / `動画制作`

機関ごとに案件名の表記ゆれが大きいため、複数キーワードの OR 検索 + 仕様書本文の確認を前提とする。

---

## 監視する情報源（週次チェック先）

### 国の機関（横断ポータル）
| 名称 | URL | 備考 |
|------|-----|------|
| 調達ポータル（GEPS / デジタル庁運営） | https://www.p-portal.go.jp/ | 国の物品・役務調達の正本 |
| 官公需情報ポータルサイト | https://www.kkj.go.jp/ | 国・独法・地方公共団体を横断 |

### 国の機関（個別）
| 機関 | URL |
|------|-----|
| デジタル庁 調達情報 | https://www.digital.go.jp/ |
| IPA（情報処理推進機構） | https://www.ipa.go.jp/choutatsu/nyusatsu/index.html |
| 総務省 調達情報・電子入札 | https://www.soumu.go.jp/menu_sinsei/cyoutatsu/index.html |
| 文部科学省 調達情報 | https://pf.mext.go.jp/gpo3/kanpo/gpoindex.asp |
| NICT（情報通信研究機構）公募 | https://www.nict.go.jp/tender/puro.html |

### 主要自治体
| 機関 | URL |
|------|-----|
| 東京都 電子調達システム | https://www.e-procurement.metro.tokyo.lg.jp/ |
| 各道府県・政令市の入札/委託公募ページ | （個別巡回。本リスト下部に実績先を蓄積） |

### 横断サービス（任意・有料含む）
| 名称 | URL | 備考 |
|------|-----|------|
| NJSS（入札情報速報サービス） | https://www.njss.info/ | 国内最大級・横断。AI/SNS で絞込可（有料） |
| Labid（AI入札プラットフォーム） | https://labid.jp/ | 自治体プロポも収録 |
| 観光専門 入札セレクト（TravelVoice） | https://www.travelvoice.jp/tenders | 観光SNS案件に強い |

---

## 運用フロー（Notion 正本 + 週次 Slack 通知）

案件は **Notion DB を正本（master）** とし、週次で **Slack に全件サマリ**を自動通知する。

```
[毎週 月曜 08:00 JST] GitHub Actions が起動
  1. scripts/bid_collect.py  — 官公需情報ポータルAPIから直近14日の AI/SNS 案件を収集し、
                               URL で重複排除して Notion DB に新規案件だけを「未着手」で追記
  2. scripts/bid_watch_notify.py — Notion DB を全件取得し AI系/SNS系に分類、締切間近を抽出
  3. 全件サマリを Slack（Incoming Webhook 先のチャンネル）へ投稿
```

- **Notion DB**: 🏛️ 入札案件ウォッチDB（AI/SNS）— 「営業管理DB｜全体ハブ」配下
- **収集スクリプト**: [`scripts/bid_collect.py`](../scripts/bid_collect.py)
- **通知スクリプト**: [`scripts/bid_watch_notify.py`](../scripts/bid_watch_notify.py)
- **ワークフロー**: [`.github/workflows/bid-watch.yml`](../.github/workflows/bid-watch.yml)（cron `0 23 * * 0` = 月 08:00 JST）

### 自動収集の情報源
- **官公需情報ポータルサイト 検索API**（中小企業庁・無料・認証不要・XML応答）
  - エンドポイント: `https://www.kkj.go.jp/api/` ／ ガイド: https://www.kkj.go.jp/doc/ja/api_guide.pdf
  - 国・独立行政法人・地方自治体の入札情報を**横断**。`bid_collect.py` の `AI_KEYWORDS` / `SNS_KEYWORDS` で検索。
  - NJSS 等の有料横断サービスを足したい場合は、`bid_collect.py` に source adapter を追加すればよい設計。

### セットアップ（GitHub Secrets を3つ登録するだけ）
リポジトリの Settings → Secrets and variables → Actions に以下を登録:

| Secret 名 | 内容 |
|-----------|------|
| `NOTION_TOKEN` | Notion インテグレーションのトークン（DB を共有しておく） |
| `NOTION_DATABASE_ID` | 入札案件ウォッチDB の database id（`774ab0e09e12473392f9c3ba5db17a77`） |
| `SLACK_WEBHOOK_URL` | 通知先チャンネルに紐づく Slack Incoming Webhook URL |

> 通知先チャンネルは **Webhook 作成時に選んだチャンネル**になる。変更時は Webhook を作り直すだけ。
> 手動テストは GitHub Actions の「Run workflow」(workflow_dispatch) から即時実行できる。

#### Slack Incoming Webhook の作り方（5分）
1. https://api.slack.com/apps → **Create New App** → **From scratch**
2. App 名（例: `入札ウォッチ`）と対象ワークスペースを選択 → Create
3. 左メニュー **Incoming Webhooks** → トグルを **On**
4. **Add New Webhook to Workspace** → 通知したい**チャンネルを選択** → 許可
5. 生成された **Webhook URL**（`https://hooks.slack.com/services/...`）をコピー
6. GitHub の `SLACK_WEBHOOK_URL` Secret に貼り付け → 完了

#### Notion トークンの作り方
1. https://www.notion.so/my-integrations → **New integration** → 作成しトークンを取得
2. 入札案件ウォッチDB のページで **「…」→ Connections → 作成した integration を接続**（共有）
3. トークンを `NOTION_TOKEN`、DB id（`774ab0e09e12473392f9c3ba5db17a77`）を `NOTION_DATABASE_ID` に登録

### 新着収集の自動化（次フェーズ）
現状スクリプトは「Notion → Slack」通知のみ自動。案件の**収集**は手動/エージェント追記。
調達ポータル(GEPS)・NJSS 等の自動スクレイピングは別 step として追加可能。

---

## ファイル構成

```
bids/
├── README.md          ← 本ファイル（運用・情報源・フロー）
├── keywords.md        ← 検索キーワード正本
└── YYYY-MM-DD.md      ← 週次の収集リスト（最新が当週分）
```

最新リスト: [`2026-06-09.md`](./2026-06-09.md)
