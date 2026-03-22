# Strategy Agents Pipeline

会議の議事録から戦略提案資料を自動生成する6体AIエージェントパイプライン。

## アーキテクチャ

```
Step 1: Retriever          → 議事録取得・分解 (Notion + Google Drive)
Step 2: Issue Structurer   → イシュー言語化・構造化
Step 3: Market Researcher  ┐ 並列実行
        Analogy Finder     ┘
Step 4: Strategist         → 戦略構築 + Devil's Advocate批判的検証
Step 5: Report Builder     → Google Slides提案資料作成
```

## セットアップ

```bash
# 1. 依存関係インストール
pip install -e .

# 2. 環境変数設定
cp .env.example .env
# .env を編集して API キーを設定

# 3. Google OAuth2 認証情報を配置
# config/google_credentials.json に OAuth2 クライアント認証情報を配置

# 4. 実行
python -m orchestrator.main <NOTION_PAGE_ID> --drive-query "クライアント名"
```

## 必要なAPI設定

### Anthropic API
- https://console.anthropic.com/ でAPIキーを取得

### Notion API
1. https://www.notion.so/my-integrations でインテグレーション作成
2. 対象ページにインテグレーションを接続
3. `NOTION_API_TOKEN` に設定

### Google API
1. Google Cloud Console でプロジェクト作成
2. Drive API と Slides API を有効化
3. OAuth2 認証情報を作成 → `config/google_credentials.json` に配置
4. 初回実行時にブラウザ認証 → `config/google_token.json` が自動生成
