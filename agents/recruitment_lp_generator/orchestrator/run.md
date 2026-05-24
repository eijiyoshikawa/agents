# Recruitment LP Generator ワンショット実行プロンプト

以下のプロンプトをコピーし、`{{企業URL}}` を実際のURLに置き換えて Claude Code に貼り付けてください。

---

```
/agents/recruitment_lp_generator/orchestrator/PIPELINE.md の手順に従って、
企業URL「{{企業URL}}」から採用LPを生成し、Vercelにデプロイしてください。

テンプレートは {{auto | modern | classic | pop}} を使用してください。

実行後、以下を報告してください:
- 抽出した企業情報のサマリ
- 選択したテンプレート（autoの場合は判定理由も）
- Vercel公開URL
- 生成プロジェクトのパス
```

---

## 簡易実行（スクリプト）

```bash
bash scripts/generate-recruitment-lp.sh --url "https://example.com" --template auto
```
