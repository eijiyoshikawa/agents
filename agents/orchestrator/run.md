# パイプライン一括実行プロンプト

以下のプロンプトを Claude Code にそのまま貼り付けて実行してください。
`{{会議名}}` を実際の Notion 議事録ページ名に置き換えてから使ってください。

---

## 実行プロンプト

```
以下の6段階パイプラインを順に実行し、Notionの議事録「{{会議名}}」から
戦略提案資料を自動生成してください。

各エージェントのプロンプトは /agents/<agent_name>/prompt.md に定義されています。
各ステップで prompt.md を読み、指示に従って output.json を生成してください。

### 実行順序:

1. **Retriever**: Notion MCPで「{{会議名}}」を検索・取得し、構造化して
   /agents/retriever/output.json に保存

2. **Issue Structurer**: retriever/output.json を読み込み、
   ビジネス課題を構造化して /agents/issue_structurer/output.json に保存

3. **Market Researcher** と **Analogy Finder** を並列実行:
   - Market Researcher: WebSearchで市場調査 → /agents/market_researcher/output.json
   - Analogy Finder: WebSearchで異業種事例収集 → /agents/analogy_finder/output.json

4. **Strategist**: 全リサーチ結果を統合し、戦略オプション構築 + Devil's Advocate検証
   → /agents/strategist/output.json

5. **Report Builder**: スライド構成を設計
   → /agents/report_builder/output.json

6. **Google Slides 作成**: report_builder/output.json を基に
   Google Slides MCPで実際のプレゼンテーションを作成

各ステップ完了後、output.json の内容を簡潔に報告してから次に進んでください。
```
