# パイプライン実行ガイド（旧版）

> **[廃止] 2026-04-16: `/agents/orchestrator/PIPELINE.md` に統合されました。**
> 本ファイルの QA チェックポイント・COO ステップは正規版に移管済みです。
> 正規版: `/agents/orchestrator/PIPELINE.md`（CLAUDE.md から参照される公式版）

このドキュメントは、AIエージェント組織によるパイプライン実行の手順書です。
COO統括エージェントの管理下で、QA Reviewer による5段階の品質検証を含む形で実行されます。

## 全体フロー

```
Step 0: COO                → パイプライン実行準備・品質基準設定
           ↓
Step 1: Retriever          → 議事録取得・分解
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

## 組織体制

### 統括
- **COO** — 全体統括・品質管理・意思決定

### 品質管理部門
- **QA Reviewer** — 各工程の出力品質検証
- **Devil's Advocate** — 戦略の独立批判的検証

### 戦略提案部門
- **Retriever** — Notion議事録取得・構造化
- **Issue Structurer** — ビジネス課題の言語化・構造化
- **Market Researcher** — 市場・競合・顧客分析
- **Analogy Finder** — 異業種アナロジー事例収集
- **Strategist** — 戦略構築 + 内部Devil's Advocate
- **Report Builder** — Google Slides提案資料の構成作成

## 実行方法

### 一括実行
Claude Code に以下のように指示する:

```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「〇〇会議」からパイプラインを実行してください。
```

### ステップ別実行

#### Step 0: COO 実行準備
```
/agents/coo/prompt.md に従って、
パイプライン実行の準備と品質基準を設定してください。
```

#### Step 1: 議事録取得
```
/agents/retriever/prompt.md に従って、
Notion の「〇〇会議」議事録を取得・構造化してください。
```

#### QA Check 1: Retriever出力検証
```
/agents/qa_reviewer/prompt.md に従って、
retriever/output.json の品質を検証してください。
スコア70未満の場合、Step 1を再実行してください。
```

#### Step 2: イシュー構造化
```
/agents/issue_structurer/prompt.md に従って、
retriever の出力からイシューを構造化してください。
```

#### QA Check 2: Issue Structurer出力検証
```
/agents/qa_reviewer/prompt.md に従って、
issue_structurer/output.json の品質を検証してください。
```

#### Step 3: 並列リサーチ
```
以下の2つのエージェントを並列で実行してください:
- /agents/market_researcher/prompt.md
- /agents/analogy_finder/prompt.md
```

#### QA Check 3: リサーチ出力検証
```
/agents/qa_reviewer/prompt.md に従って、
market_researcher/output.json と analogy_finder/output.json の品質を検証してください。
```

#### Step 4: 戦略構築
```
/agents/strategist/prompt.md に従って、
全リサーチ結果を統合し戦略を構築してください。
```

#### Step 5: 独立批判的検証
```
/agents/devils_advocate/prompt.md に従って、
strategist/output.json の戦略を独立した視点で批判的に検証してください。
```

#### QA Check 4: 戦略＋検証結果の品質検証
```
/agents/qa_reviewer/prompt.md に従って、
strategist/output.json と devils_advocate/output.json の品質を検証してください。
robustness_scoreが60未満の場合、Strategistに修正を指示してください。
```

#### Step 6: 資料作成
```
/agents/report_builder/prompt.md に従って、
提案資料のスライド構成を作成してください。
Devil's Advocateの検証結果もリスクスライドに反映してください。
```

#### QA Check 5: 最終成果物検証
```
/agents/qa_reviewer/prompt.md に従って、
report_builder/output.json の最終品質を検証してください。
```

#### Step 7: COO最終レビュー
```
/agents/coo/prompt.md に従って、
パイプライン全体の実行結果をレビューし、最終承認を行ってください。
```

## データフロー

各エージェントの出力は以下のファイルに保存される:

```
agents/
├── coo/output.json                ← Step 0, 7 の出力
├── retriever/output.json          ← Step 1 の出力
├── issue_structurer/output.json   ← Step 2 の出力
├── market_researcher/output.json  ← Step 3 の出力
├── analogy_finder/output.json     ← Step 3 の出力
├── strategist/output.json         ← Step 4 の出力
├── devils_advocate/output.json    ← Step 5 の出力
├── qa_reviewer/output.json  ← 各QA Checkの出力
└── report_builder/output.json     ← Step 6 の出力
```

## 前提条件

1. **Notion MCP 接続済み**: Claude Code に Notion MCP が接続されていること
2. **Web検索 MCP 接続済み**: Web検索が使用可能であること
3. **議事録ページの共有**: Notion インテグレーションが議事録ページにアクセス可能であること
