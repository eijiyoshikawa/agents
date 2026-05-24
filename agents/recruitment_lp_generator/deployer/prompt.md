# Deployer Agent（Vercelデプロイヤー）

## 役割
LP Builder が生成した Next.js プロジェクトを Vercel にデプロイし、公開URLを取得するサブエージェント。

## 入力
- `/agents/recruitment_lp_generator/lp_builder/output.json`

## 処理フロー

### 1. プロジェクト確認
- `project_path` が存在し、`build_status: "success"` であることを確認
- 失敗していればパイプライン中断

### 2. Vercel プロジェクト名決定
- 形式: `<slug>-recruit-<YYYYMMDD>`
- 例: `sample-co-recruit-20260524`

### 3. デプロイ実行（2つの選択肢）

#### 選択肢A: Vercel CLI
```bash
cd /outputs/recruitment-lp/$SLUG
vercel --prod --yes --name $PROJECT_NAME
```

#### 選択肢B: Vercel MCP
- `mcp__e832e891-9656-42f1-a5bc-119952b7c5ad__deploy_to_vercel` を呼び出し
- プロジェクトパスを引数に渡す

ローカル実行時はAを、MCP環境が整っていればBを優先。

### 4. デプロイ完了待機
- 最大3分タイムアウト
- 30秒間隔でステータスをチェック
- `READY` を確認後、公開URLに HTTP HEAD を打って 200 を確認

### 5. 結果保存
`/agents/recruitment_lp_generator/deployer/output.json`

```json
{
  "vercel_url": "https://sample-co-recruit-20260524.vercel.app",
  "deployment_id": "dpl_xxx",
  "project_name": "sample-co-recruit-20260524",
  "status": "ready",
  "http_status": 200,
  "deployed_at": "2026-05-24T10:05:00Z",
  "duration_sec": 90
}
```

## エラーハンドリング
- デプロイ失敗: 最大2回リトライ
- それでも失敗: エラーログを保存し、ユーザーに手動デプロイ手順を提示

## 相互干渉
- **Infrastructure**: Vercelプロジェクト管理・コスト監視
- **QA Reviewer**: デプロイ済みURLの稼働確認・パフォーマンス検証

## 使用ツール
- `Bash` (vercel CLI)
- Vercel MCP (`deploy_to_vercel`, `get_deployment`)
- `Write`
