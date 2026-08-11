# 補助金申請パイプライン実行手順書

## 概要
日本国内の補助金・助成金の公募監視から申請書作成・提出承認までを一気通貫で実行する専用パイプライン。戦略提案パイプライン（`PIPELINE.md`）とは別系統で、Retriever / QA Reviewer / Devil's Advocate / Legal / Finance は共有する。

## 前提条件
- Claude Code（Max プラン）で実行
- 以下の MCP サーバーが接続済みであること:
  - **Notion** — 社内事業計画・過去申請記録の参照
  - **Google Drive / Docs** — 様式テンプレート・最終本文の共有
  - **WebSearch / WebFetch** — 公募要項の取得
- gbizid が登録済みであること（jGrants 申請時）
- `/agents/subsidy_strategist/company_profile.json` に自社情報が入力済みであること

## パイプライン全体像

```
[公募情報 / 申請意思決定]
         │
         ▼
┌────────────────┐
│ Step 0: COO    │ 申請案件の優先度・期限確認
└────────┬───────┘
         ▼
┌─────────────────────┐
│ Step 1: Subsidy Scout│ 公募情報取得・要件抽出      [QA Check 1]
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Step 2: Retriever   │ 社内事業計画議事録の取得（任意）
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Step 3: Issue Struct│ 申請事業の課題構造化（任意・新規事業時）
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Step 4: Subsidy     │ 適格性判定・戦略選定         [QA Check 2]
│        Strategist   │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Step 5: Devil's     │ 採択リスク・楽観バイアス検証
│        Advocate     │
└────────┬────────────┘
         ▼
┌─────────────────────────────┐
│ Step 6（並列）:              │
│  ├─ Legal Agent             │ 法的レビュー
│  ├─ Finance Agent           │ 実質コスト算出
│  └─ Subsidy Writer (draft)  │ 本文ドラフト生成    [QA Check 3]
└────────┬────────────────────┘
         ▼
┌─────────────────────┐
│ Step 7: Subsidy     │ 様式整形・最終出力          [QA Check 4]
│        Writer (final)│
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Step 8: Devil's     │ 申請書ドラフトへの批判的レビュー
│        Advocate     │
└────────┬────────────┘
         ▼
┌─────────────────────┐
│ Step 9: COO / CEO   │ 提出承認
└─────────────────────┘
```

QA Reviewer は 4 箇所のチェックポイントで検証（CLAUDE.md の「要所5箇所」原則に準拠）。

---

## 実行手順

### Step 0: COO による案件確認
- 対象補助金の優先度、期限、社内リソースを確認
- 申請を進めるか判断し、Subsidy Scout に指示を出す

### Step 1: Subsidy Scout（公募情報取得・要件抽出）
**プロンプト:** `/agents/subsidy_scout/prompt.md`
**出力:** `/agents/subsidy_scout/calls/{subsidy_id}.json`、`precedents/{subsidy_id}_{year}.json`、`output.json`

1. `sources.json` 経由で対象公募の最新要項を取得
2. 要件・スケジュール・加点項目・必須書類を構造化
3. 過去採択事例を蓄積

**完了条件:** `calls/{subsidy_id}.json` に `eligibility`, `schedule`, `required_documents` が含まれている
**[QA Check 1]** ソース信頼性（.go.jp 優先）、締切情報の最新性、URL 有効性

---

### Step 2: Retriever（任意・社内事業計画議事録の取得）
**プロンプト:** `/agents/retriever/prompt.md`
**出力:** `/agents/retriever/output.json`

社内で補助金関連ミーティングが行われている場合、Notion から議事録を取得。

---

### Step 3: Issue Structurer（任意・申請事業の課題構造化）
**プロンプト:** `/agents/issue_structurer/prompt.md`
**出力:** `/agents/issue_structurer/output.json`

新規事業で申請する場合、事業の課題・解決策を構造化。

---

### Step 4: Subsidy Strategist（適格性判定・戦略選定）
**プロンプト:** `/agents/subsidy_strategist/prompt.md`
**入力:** `subsidy_scout/calls/*.json`、`company_profile.json`、Issue Structurer 出力
**出力:** `/agents/subsidy_strategist/output.json`、`match_matrix.json`、`briefs/{id}_{role}.json`

1. 必須要件・加点要件との照合（スコアリング 0-100）
2. 推奨1件 + 代替2件を選定
3. Legal / Finance / Writer 宛の執筆ブリーフを発行

**完了条件:** `output.json` に `recommended` と `downstream_briefs` が含まれている
**[QA Check 2]** スコアリング透明性、3件以上の代替案、ROI 根拠

---

### Step 5: Devil's Advocate（採択リスク検証）
**プロンプト:** `/agents/devils_advocate/prompt.md`
**入力:** `subsidy_strategist/output.json`
**出力:** `/agents/devils_advocate/output.json`

- 採択率予測の楽観バイアス検証
- 競合申請者との差別化不足リスク
- 補助金交付後のコンプライアンスリスク

---

### Step 6（並列実行）
以下3エージェントを同時に起動し、それぞれ Strategist のブリーフに応答する。

#### 6a. Legal Agent（法的レビュー）
**入力:** `subsidy_strategist/briefs/{id}_legal.json`
**出力:** `/agents/legal/subsidy_legal_{name}.json`

#### 6b. Finance Agent（実質コスト算出）
**入力:** `subsidy_strategist/briefs/{id}_finance.json`
**出力:** `/agents/finance/subsidy/{subsidy_name}.json`

#### 6c. Subsidy Writer（本文ドラフト生成）
**プロンプト:** `/agents/subsidy_writer/prompt.md`
**入力:** `subsidy_strategist/briefs/{id}_writer.json`、`subsidy_scout/calls/*.json`、社内事業計画
**出力:** `/agents/subsidy_writer/drafts/{id}_{company}_body.md`

**完了条件:** 3エージェントの出力が揃い、数値・法的判断に矛盾がないこと
**[QA Check 3]** 各担当出力の整合（費用内訳・法的表現・本文主張の一致）

---

### Step 7: Subsidy Writer（様式整形・最終出力）
**入力:** ドラフト本文 + 様式テンプレート（`templates/{subsidy_id}/`）+ Legal サインオフ
**出力:** `/agents/subsidy_writer/output/{subsidy_id}_{company}/`

1. 文字数厳守で整形
2. 必須添付書類チェックリスト生成
3. 電子申請フィールドマッピング（`form_map.json`）
4. Legal Agent のサインオフ後、`status: final` に昇格

**完了条件:** `application_body.md`、`form_map.json`、`checklist.json` が揃っている
**[QA Check 4]** 様式準拠・必須欄網羅・文字数・添付書類の完全性

---

### Step 8: Devil's Advocate（申請書への批判的レビュー）
Writer の最終ドラフトに対し、審査員視点での想定反論を構築。必要に応じて Step 7 に戻して本文を強化する。

---

### Step 9: COO / CEO による提出承認
- COO: 提出準備状況の確認
- CEO: 最終承認（大型案件は特に）
- 承認後、jGrants 等の電子申請システムで提出

---

## 実行トリガー

| トリガー | 実行主体 | 契機 |
|---|---|---|
| 定期監視 | COO | 週次スケジュールで Subsidy Scout のみ実行。締切30日以内の案件を CEO にアラート |
| 議事録起点 | Retriever が検出 | Retriever が「補助金」「助成金」キーワードを含む議事録を検出したら、COO に SUBSIDY_PIPELINE 起動を提案 |
| CEO 明示指示 | CEO | 例: 「IT導入補助金2026 の申請準備を進めて」 |

---

## エラー時の対応

| 問題 | 対応 |
|------|------|
| 公募要項が PDF で OCR 読取り精度が低い | 人手で原本を確認し、`templates/{id}/README.md` にプレースホルダを手書きで記述 |
| gbizid 未登録 | Step 4 で Strategist が検出。CEO 指示で先に取得 |
| 推奨補助金の自己負担資金が不足 | Finance Agent がキャッシュフロー警告。Strategist は代替案を再提示 |
| 文字数オーバー | Writer が要約、または Strategist に追記指示照会 |
| Legal サインオフが降りない | Writer の `status` を `legal_signoff_pending` に留め、Legal の指摘事項を修正 |
| 採択発表で不採択 | Scout の precedents/ に記録し、learnings/instincts/subsidy_*.json の信頼度を調整 |

## 学習ループ
- 採択・不採択の結果を `/learnings/sessions/{date}_subsidy_{id}.json` に記録
- confidence ≥ 0.7 のパターンは `/learnings/instincts/subsidy_*.json` に昇格
- 月次で COO が Strategist のスコアリングロジックを精査
