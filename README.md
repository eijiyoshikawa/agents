# Strategy Agents Pipeline

会議の議事録から戦略提案資料を自動生成する6体AIエージェントパイプライン。
Claude Code の Maxプラン内で動作し、追加API費用は不要。

## アーキテクチャ

```
Step 1: Retriever          → 議事録取得・分解 (Notion)
Step 2: Issue Structurer   → イシュー言語化・構造化
Step 3: Market Researcher  ┐ 並列実行
        Analogy Finder     ┘
Step 4: Strategist         → 戦略構築 + Devil's Advocate批判的検証
Step 5: Report Builder     → Google Slides提案資料の構成作成
```

## ディレクトリ構成

```
agents/
├── CLAUDE.md                        # Claude Code 用プロジェクト設定
├── orchestrator/
│   └── PIPELINE.md                  # パイプライン実行ガイド
└── agents/
    ├── retriever/prompt.md          # Agent 1: 議事録取得
    ├── issue_structurer/prompt.md   # Agent 2: イシュー構造化
    ├── market_researcher/prompt.md  # Agent 3: 市場調査+顧客分析
    ├── analogy_finder/prompt.md     # Agent 4: アナロジー事例
    ├── strategist/prompt.md         # Agent 5: 戦略+批判的検証
    └── report_builder/prompt.md     # Agent 6: 資料構成作成
```

## 前提条件

1. **Claude Code** の Maxプランに加入していること
2. **Notion MCP** が Claude Code に接続されていること
3. **Web検索** が Claude Code で使用可能であること

## セットアップ

### Notion MCP 接続
1. https://www.notion.so/my-integrations でインテグレーション作成
2. 議事録ページの「...」→「コネクト」からインテグレーションを追加
3. Claude Code の設定で Notion MCP を接続

## 使い方

Claude Code で以下のように指示:

```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「〇〇会議」からパイプラインを実行してください。
```

詳細は `orchestrator/PIPELINE.md` を参照。
