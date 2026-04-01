# Strategy Agents Pipeline

## プロジェクト概要
会議の議事録から戦略提案資料を自動生成する7体AIエージェントパイプライン（8ステップ・2周リサーチ）。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## エージェント構成
各エージェントのプロンプトは `/agents/<agent_name>/prompt.md` に定義。
出力は `/agents/<agent_name>/output.json` に保存される。

1. **Retriever** — Notion議事録取得・構造化
2. **Issue Structurer** — ビジネス課題の言語化・構造化
3. **Market Researcher** — 市場・競合・顧客分析（並列実行）
3c. **Marketing Analyst** — 競合マーケティング施策・SNS・ファネル分析（並列実行）
4. **Analogy Finder** — 異業種アナロジー事例収集（並列実行）
5. **Strategist** — 戦略構築 + Devil's Advocate批判的検証
6. **Report Builder** — Google Slides提案資料の構成作成

## 実行方法

### 手順書を読んで実行する場合
```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「会議名」からパイプラインを実行してください。
```

### ワンショット実行（コピペ用プロンプト）
`/agents/orchestrator/run.md` にコピペ用プロンプトを用意。
`{{会議名}}` を置き換えて Claude Code に貼り付けるだけで全ステップが実行される。

### 他の人と共有する場合
1. このリポジトリを `git clone` する
2. Claude Code（Max プラン）を開く
3. MCP サーバーを設定する（Notion / Google Drive）
4. 上記いずれかの方法で実行

## 事業領域
- SNSマーケティング（Instagram, TikTok, YouTube 運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作
