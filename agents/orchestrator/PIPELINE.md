# パイプライン実行手順書

## 概要
会議の議事録から戦略提案資料を自動生成する8段階パイプライン。
2周のリサーチサイクルで精度を高める。Claude Code 上で順番に実行する。

## 前提条件
- Claude Code（Max プラン）で実行
- 以下の MCP サーバーが接続済みであること:
  - **Notion** — 議事録の取得に使用
  - **Google Slides（Google Drive MCP）** — 過去資料の検索・スライド作成に使用

## パイプライン全体像

```
[Notion 議事録]
      │
      ▼
┌─────────────┐
│ 1. Retriever │  ← Notion MCP で議事録を取得・構造化
└─────┬───────┘
      ▼
┌──────────────────┐
│ 2. Issue Structurer │  ← ビジネス課題を言語化・検索クエリ生成
└─────┬────────────┘
      ├──────────────────┬──────────────────┐
      ▼                  ▼                  ▼
┌──────────────┐  ┌───────────────┐  ┌──────────────────┐
│ 3. Market    │  │    Analogy    │  │    Marketing     │  ← 1周目 並列実行
│   Researcher │  │    Finder     │  │    Analyst       │
└──────┬───────┘  └───────┬───────┘  └────────┬─────────┘
       └────────┬─────────┴───────────────────┘
                ▼
┌─────────────────┐
│ 4. Strategist   │  ← 戦略構築 + Devil's Advocate（批判的検証）
└─────┬───────────┘
      ▼
┌──────────────────┐
│ 5. Issue Structurer │  ← 再定義された課題を再構造化・新クエリ生成
└─────┬────────────┘
      ├──────────────────┬──────────────────┐
      ▼                  ▼                  ▼
┌──────────────┐  ┌───────────────┐  ┌──────────────────┐
│ 6. Market    │  │    Analogy    │  │    Marketing     │  ← 2周目 並列実行
│   Researcher │  │    Finder     │  │    Analyst       │
└──────┬───────┘  └───────┬───────┘  └────────┬─────────┘
       └────────┬─────────┴───────────────────┘
                ▼
┌─────────────────┐
│ 7. Strategist   │  ← 全情報を統合し最終戦略構築（批判的検証なし）
└─────┬───────────┘
      ▼
┌─────────────────┐
│ 8. Report Builder│  ← スライド構成を生成
└─────────────────┘
      │
      ▼
[Google Slides 提案資料]
```

## 実行手順

### Step 0: 準備
会議名（Notion の議事録ページ名）を確認する。
以下の手順では `{{会議名}}` を実際の会議名に置き換えること。

---

### Step 1: Retriever（議事録取得・構造化）
**プロンプト:** `/agents/retriever/prompt.md`
**出力:** `/agents/retriever/output.json`

1. `notion-search` で `{{会議名}}` を検索
2. 該当ページを `notion-fetch` で取得
3. 議事録を構造化し `output.json` に保存

**完了条件:** `retriever/output.json` に `title`, `key_points`, `raw_text` が含まれている

---

### Step 2: Issue Structurer（課題の言語化）
**プロンプト:** `/agents/issue_structurer/prompt.md`
**入力:** `/agents/retriever/output.json`
**出力:** `/agents/issue_structurer/output.json`

1. `retriever/output.json` を読み込む
2. ビジネス課題を構造化
3. リサーチクエリを 5-10 個生成
4. `output.json` に保存

**完了条件:** `core_question` と `research_queries` が含まれている

---

### Step 3: 1周目リサーチ（3エージェント並列実行）
**並列で 3 つのエージェントを同時実行する。**

#### Market Researcher
**プロンプト:** `/agents/market_researcher/prompt.md`（1周目）
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/market_researcher/output.json`

- `research_queries` を使って WebSearch を実行
- 市場・競合・ベンチマーク・顧客情報を収集

#### Marketing Analyst
**プロンプト:** `/agents/marketing_analyst/prompt.md`（1周目）
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/marketing_analyst/output.json`

- 競合のマーケティング施策（広告戦略、SNS運用、ファネル、キャンペーン）を深掘り調査
- 自社への転用可能なインサイトを抽出

#### Analogy Finder
**プロンプト:** `/agents/analogy_finder/prompt.md`（1周目）
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/analogy_finder/output.json`

- 異業種のアナロジー事例を 5-8 件収集
- 転用可能なインサイトを抽出

**完了条件:** 3つすべての `output.json` が保存されている

---

### Step 4: Strategist — 1周目（戦略構築 + 批判的検証）
**プロンプト:** `/agents/strategist/prompt.md`（1周目）
**入力:** `issue_structurer`, `market_researcher`, `analogy_finder`, `marketing_analyst` の output.json
**出力:** `/agents/strategist/output.json`

1. 全リサーチ結果を統合
2. 戦略オプションを 3-5 個構築
3. Devil's Advocate で批判的検証
4. 課題を再定義（`redefined_issues`）

**完了条件:** `critical_reviews` と `redefined_issues` が含まれている

---

### Step 5: Issue Structurer — 2周目（課題の再構造化）
**プロンプト:** `/agents/issue_structurer/prompt.md`（2周目）
**入力:** `/agents/issue_structurer/output.json` + `/agents/strategist/output.json`
**出力:** `/agents/issue_structurer/output_r2.json`

1. Strategist の `redefined_issues` と `critical_reviews` を読み込む
2. 再定義された課題を構造化
3. 1周目で見落とされた観点を補う新しいリサーチクエリを生成
4. `output_r2.json` に保存

**完了条件:** `output_r2.json` に新しい `research_queries` が含まれている

---

### Step 6: 2周目リサーチ（3エージェント並列実行）
**並列で 3 つのエージェントを同時実行する。**

#### Market Researcher（2周目）
**プロンプト:** `/agents/market_researcher/prompt.md`（2周目）
**入力:** `/agents/issue_structurer/output_r2.json`
**出力:** `/agents/market_researcher/output_r2.json`

#### Marketing Analyst（2周目）
**プロンプト:** `/agents/marketing_analyst/prompt.md`（2周目）
**入力:** `/agents/issue_structurer/output_r2.json`
**出力:** `/agents/marketing_analyst/output_r2.json`

#### Analogy Finder（2周目）
**プロンプト:** `/agents/analogy_finder/prompt.md`（2周目）
**入力:** `/agents/issue_structurer/output_r2.json`
**出力:** `/agents/analogy_finder/output_r2.json`

**完了条件:** 3つすべての `output_r2.json` が保存されている

---

### Step 7: Strategist — 2周目（最終戦略構築）
**プロンプト:** `/agents/strategist/prompt.md`（2周目）
**入力:** 1周目 + 2周目の全 output.json（計9ファイル）
**出力:** `/agents/strategist/output_r2.json`

1. 1周目・2周目の全リサーチ結果と1周目の批判的検証を統合
2. 最終的な戦略オプションを構築
3. 最終推奨戦略を選定（Devil's Advocate は実施しない）

**完了条件:** `recommended_strategy` が含まれている

---

### Step 8: Report Builder（提案資料の構成作成）
**プロンプト:** `/agents/report_builder/prompt.md`
**入力:** 1周目 + 2周目の全 output.json（計10ファイル）
**出力:** `/agents/report_builder/output.json`

1. 11-16 枚のスライド構成を設計
2. 各スライドのタイトル・箇条書き・スピーカーノートを作成
3. `output.json` に保存

**完了条件:** `slides` 配列にスライドデータが含まれている

---

### Step 9: Google Slides への反映（オプション）
`report_builder/output.json` の内容を Google Slides MCP で実際のプレゼンテーションに変換する。

1. `createGoogleSlides` で新しいプレゼンテーションを作成
2. 各スライドを `createGoogleSlidesTextBox` で追加
3. スピーカーノートを `updateGoogleSlidesSpeakerNotes` で設定

---

## エラー時の対応

| 問題 | 対応 |
|------|------|
| Notion で議事録が見つからない | ページ名を確認し再検索。部分一致でも試す |
| WebSearch の結果が不十分 | クエリを変更して再実行 |
| output.json のフォーマット不正 | prompt.md の出力フォーマットに従って修正 |
| MCP サーバー未接続 | Claude Code の MCP 設定を確認 |

## 共有・再利用

このパイプラインを他の人が使う場合:

1. このリポジトリを `git clone` する
2. Claude Code（Max プラン）を開く
3. MCP サーバー（Notion, Google Drive）を設定する
4. 下記のコマンドで実行:

```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「会議名」からパイプラインを実行してください。
```

または、`/agents/orchestrator/run.md` のプロンプトを使って一括実行できる。
