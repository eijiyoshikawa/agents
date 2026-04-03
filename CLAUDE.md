# Strategy Agents Pipeline

## プロジェクト概要
会議の議事録から戦略提案資料を自動生成する6体AIエージェントパイプライン。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## エージェント構成
各エージェントのプロンプトは `/agents/<agent_name>/prompt.md` に定義。
出力は `/agents/<agent_name>/output.json` に保存される。

1. **Retriever** — Notion議事録取得・構造化
2. **Issue Structurer** — ビジネス課題の言語化・構造化
3. **Market Researcher** — 市場・競合・顧客分析（並列実行）
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

---

# Web Builder Pipeline

## 概要
参考サイトのURLから高再現度のWebサイトを自動生成する8体AIエージェント + 2周イテレーションパイプライン。
Next.js + Tailwind CSS で実装し、Vercel に自動デプロイして品質検証まで自走する。

## エージェント構成
各エージェントのプロンプトは `/agents/web_builder/<agent_name>/prompt.md` に定義。
出力は `/agents/web_builder/<agent_name>/output.json` に保存される。

0. **Site Scanner** — 技術スタック検出・ページ構成・サイトマップ把握
1. **Structure Analyzer** — HTML構造・セクション構成・ナビゲーション解析（並列実行）
2. **Design Analyzer** — カラー・タイポグラフィ・スペーシング抽出（並列実行）
3. **Motion Analyzer** — アニメーション・トランジション・スクロールエフェクト特定（並列実行）
4. **Interaction Analyzer** — フォーム・モーダル・タブ・スライダー解析（並列実行）
5. **Asset Collector** — 画像・フォント・アイコン収集・代替戦略策定
6. **Builder** — 全解析結果を統合しNext.js + Tailwind CSSで実装
7. **QA Reviewer** — Vercelデプロイ → 参考サイト比較 → 修正指示生成

## 実行フロー
Scanner → 4エージェント並列解析 → Asset収集 → [Builder → QA] × 2周

## 実行方法

### 手順書を読んで実行する場合
```
/agents/web_builder/orchestrator/PIPELINE.md の手順に従って、
参考サイト「URL」からパイプラインを実行してください。
```

### ワンショット実行（コピペ用プロンプト）
`/agents/web_builder/orchestrator/run.md` にコピペ用プロンプトを用意。
`{{参考URL}}` を置き換えて Claude Code に貼り付けるだけで全ステップが実行される。

### 前提条件
- Claude Code（Max プラン）
- Vercel MCP サーバー接続済み
- Node.js 18+

---

## 事業領域
- SNSマーケティング（Instagram, TikTok, YouTube 運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作
