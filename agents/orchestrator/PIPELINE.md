# パイプライン実行手順書

## 概要
会議の議事録から戦略提案資料を自動生成するパイプライン。
COO統括のもと、5つのQAチェックポイントを含む品質保証プロセス付きで実行される。
Claude Code 上で順番に実行する。

## 前提条件
- Claude Code（Max プラン）で実行
- 以下の MCP サーバーが接続済みであること:
  - **Notion** — 議事録の取得に使用
  - **Google Slides（Google Drive MCP）** — 過去資料の検索・スライド作成に使用

## パイプライン全体像

```
Step 0: COO                → パイプライン実行準備・品質基準設定
           ↓
Step 1: Retriever          → 議事録取得・構造化
           ↓
     QA Check Point 1      → Retriever出力の品質検証
           ↓
Step 2: Issue Structurer   → イシュー構造化
           ↓
     QA Check Point 2      → Issue Structurer出力の品質検証
           ↓
Step 3: Market Researcher  ┐
        Analogy Finder     ┘ 並列実行
           ↓
     QA Check Point 3      → リサーチ出力の品質検証（2件）
           ↓
Step 4: Strategist         → 戦略構築 + 内部批判的検証
           ↓
Step 5: Devil's Advocate   → 独立した批判的検証（外部）
           ↓
     QA Check Point 4      → 戦略＋検証結果の品質検証
           ↓
Step 6: Report Builder     → 提案資料作成
           ↓
     QA Check Point 5      → 最終成果物の品質検証
           ↓
Step 7: COO Final Review   → 最終レビュー・承認
```

## 実行手順

### Step 0: COO 実行準備
会議名（Notion の議事録ページ名）を確認する。
以下の手順では `{{会議名}}` を実際の会議名に置き換えること。

```
/agents/coo/prompt.md に従って、
パイプライン実行の準備と品質基準を設定してください。
```

---

### Step 1: Retriever（議事録取得・構造化）
**プロンプト:** `/agents/retriever/prompt.md`
**出力:** `/agents/retriever/output.json`

1. `notion-search` で `{{会議名}}` を検索
2. 該当ページを `notion-fetch` で取得
3. 議事録を構造化し `output.json` に保存

**完了条件:** `retriever/output.json` に `title`, `key_points`, `raw_text` が含まれている

---

### QA Check Point 1: Retriever出力検証
```
/agents/qa_reviewer/prompt.md に従って、
retriever/output.json の品質を検証してください。
スコア70未満の場合、Step 1を再実行してください。
```

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

### QA Check Point 2: Issue Structurer出力検証
```
/agents/qa_reviewer/prompt.md に従って、
issue_structurer/output.json の品質を検証してください。
スコア70未満の場合、Step 2を再実行してください。
```

---

### Step 3 & 4: Market Researcher + Analogy Finder（並列実行）
**並列で 2 つのエージェントを同時実行する。**

#### 3. Market Researcher
**プロンプト:** `/agents/market_researcher/prompt.md`
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/market_researcher/output.json`

- `research_queries` を使って WebSearch を実行
- 市場・競合・ベンチマーク・顧客情報を収集

#### 4. Analogy Finder
**プロンプト:** `/agents/analogy_finder/prompt.md`
**入力:** `/agents/issue_structurer/output.json`
**出力:** `/agents/analogy_finder/output.json`

- 異業種のアナロジー事例を 5-8 件収集
- 転用可能なインサイトを抽出

**完了条件:** 両方の `output.json` が保存されている

---

### QA Check Point 3: リサーチ出力検証
```
/agents/qa_reviewer/prompt.md に従って、
market_researcher/output.json と analogy_finder/output.json の品質を検証してください。
スコア70未満の場合、該当ステップを再実行してください。
```

---

### Step 5: Strategist（戦略構築 + 批判的検証）
**プロンプト:** `/agents/strategist/prompt.md`
**入力:** `issue_structurer`, `market_researcher`, `analogy_finder` の output.json
**出力:** `/agents/strategist/output.json`

1. 全リサーチ結果を統合
2. 戦略オプションを 3-5 個構築
3. Devil's Advocate で批判的検証
4. 最終推奨戦略を選定

**完了条件:** `recommended_strategy` と `critical_reviews` が含まれている

---

### Step 5b: Devil's Advocate（独立批判的検証）
```
/agents/devils_advocate/prompt.md に従って、
strategist/output.json の戦略を独立した視点で批判的に検証してください。
```

---

### QA Check Point 4: 戦略＋検証結果の品質検証
```
/agents/qa_reviewer/prompt.md に従って、
strategist/output.json と devils_advocate/output.json の品質を検証してください。
robustness_score が60未満の場合、Strategist に修正を指示してください。
```

---

### Step 6: Report Builder（提案資料の構成作成）
**プロンプト:** `/agents/report_builder/prompt.md`
**入力:** `issue_structurer`, `market_researcher`, `analogy_finder`, `strategist` の output.json
**出力:** `/agents/report_builder/output.json`

1. 10-15 枚のスライド構成を設計
2. 各スライドのタイトル・箇条書き・スピーカーノートを作成
3. `output.json` に保存

**完了条件:** `slides` 配列にスライドデータが含まれている

---

### QA Check Point 5: 最終成果物検証
```
/agents/qa_reviewer/prompt.md に従って、
report_builder/output.json の最終品質を検証してください。
スコア70未満の場合、Step 6を再実行してください。
```

---

### Step 7: COO 最終レビュー
```
/agents/coo/prompt.md に従って、
パイプライン全体の実行結果をレビューし、最終承認を行ってください。
```

---

### Step 8: Google Slides への反映（オプション）
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
