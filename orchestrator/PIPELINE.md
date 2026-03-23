# パイプライン実行ガイド

このドキュメントは、6体のAIエージェントを順番に実行するための手順書です。
Claude Code 上で以下の指示を出すことで、パイプラインを実行できます。

## 全体フロー

```
Step 1: Retriever          → 議事録取得・分解
           ↓
Step 2: Issue Structurer   → イシュー構造化
           ↓
Step 3: Market Researcher  ┐
        Analogy Finder     ┘ 並列実行
           ↓
Step 4: Strategist         → 戦略構築 + 批判的検証
           ↓
Step 5: Report Builder     → 提案資料作成
```

## 実行方法

### 一括実行
Claude Code に以下のように指示する:

```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「〇〇会議」からパイプラインを実行してください。
```

### ステップ別実行

#### Step 1: 議事録取得
```
/agents/retriever/prompt.md に従って、
Notion の「〇〇会議」議事録を取得・構造化してください。
```

#### Step 2: イシュー構造化
```
/agents/issue_structurer/prompt.md に従って、
retriever の出力からイシューを構造化してください。
```

#### Step 3: 並列リサーチ
```
以下の2つのエージェントを並列で実行してください:
- /agents/market_researcher/prompt.md
- /agents/analogy_finder/prompt.md
```

#### Step 4: 戦略構築
```
/agents/strategist/prompt.md に従って、
全リサーチ結果を統合し戦略を構築してください。
```

#### Step 5: 資料作成
```
/agents/report_builder/prompt.md に従って、
提案資料のスライド構成を作成してください。
```

## データフロー

各エージェントの出力は以下のファイルに保存される:

```
agents/
├── retriever/output.json          ← Step 1 の出力
├── issue_structurer/output.json   ← Step 2 の出力
├── market_researcher/output.json  ← Step 3 の出力
├── analogy_finder/output.json     ← Step 3 の出力
├── strategist/output.json         ← Step 4 の出力
└── report_builder/output.json     ← Step 5 の出力
```

## 前提条件

1. **Notion MCP 接続済み**: Claude Code に Notion MCP が接続されていること
2. **Web検索 MCP 接続済み**: Web検索が使用可能であること
3. **議事録ページの共有**: Notion インテグレーションが議事録ページにアクセス可能であること
