# Recruitment LP Generator パイプライン手順

## 入力
- `company_url`: 企業のコーポレートサイトURL（必須）
- `template`: `modern` / `classic` / `pop` / `auto`（省略時は `auto`）

## ステップ

### Step 1: Company Scanner（企業情報抽出）
**実行**: `/agents/recruitment_lp_generator/company_scanner/prompt.md`

**処理**:
1. `WebFetch` で企業URLのHTMLを取得
2. 以下の情報を抽出し `output.json` に保存:
   - 基本情報: 社名 / 事業内容 / 設立年 / 所在地 / 代表者
   - 事業・サービス: 主要サービス（最大3件）と説明
   - 募集要項: 職種 / 給与 / 勤務地 / 雇用形態（採用ページがあれば抽出、なければダミーで補完）
   - トーン判定: `modern` / `classic` / `pop` のいずれが最適か理由付きで判定
3. 企業スラッグ生成: 社名から英小文字スラッグを生成（例: `株式会社サンプル` → `sample-co`）

**出力**: `/agents/recruitment_lp_generator/company_scanner/output.json`

```json
{
  "company": {
    "name": "株式会社サンプル",
    "name_en": "Sample Inc.",
    "slug": "sample-co",
    "founded": "2020年4月",
    "address": "東京都千代田区...",
    "ceo": "山田太郎",
    "tagline": "ミッションを表す一文",
    "description": "事業概要"
  },
  "services": [
    {"name": "サービスA", "description": "..."},
    {"name": "サービスB", "description": "..."}
  ],
  "jobs": [
    {
      "title": "フロントエンドエンジニア",
      "employment_type": "正社員",
      "location": "東京都千代田区",
      "salary": "500万円〜800万円",
      "description": "...",
      "requirements": ["React 3年以上", "TypeScript経験"]
    }
  ],
  "recommended_template": "modern",
  "tone_reasoning": "IT/SaaS事業のため modern が最適",
  "source_url": "https://example.com",
  "scanned_at": "2026-05-24T10:00:00Z"
}
```

### Step 2: LP Builder（テンプレート差し込み）
**実行**: `/agents/recruitment_lp_generator/lp_builder/prompt.md`

**処理**:
1. テンプレート決定: ユーザー指定があればそれ、`auto` なら `recommended_template` を採用
2. プロジェクトコピー: `cp -r /templates/recruitment-lp/ /outputs/recruitment-lp/<slug>/`
3. データ書き込み: company_scanner の出力を `data/company.json` に保存（`template` フィールドを追加）
4. 依存インストール: `cd /outputs/recruitment-lp/<slug> && npm install`
5. ビルド検証: `npm run build`（失敗時はエラー内容を返す）

**出力**: `/agents/recruitment_lp_generator/lp_builder/output.json`

```json
{
  "selected_template": "modern",
  "project_path": "/outputs/recruitment-lp/sample-co/",
  "data_path": "/outputs/recruitment-lp/sample-co/data/company.json",
  "build_status": "success",
  "build_duration_sec": 45
}
```

### Step 3: Deployer（Vercelデプロイ）
**実行**: `/agents/recruitment_lp_generator/deployer/prompt.md`

**処理**:
1. Vercel CLI または Vercel MCP `deploy_to_vercel` でデプロイ
2. デプロイ完了を待機（最大3分タイムアウト）
3. 公開URL取得 → 200応答を確認
4. 結果を保存

**出力**: `/agents/recruitment_lp_generator/deployer/output.json`

```json
{
  "vercel_url": "https://sample-co-recruit.vercel.app",
  "deployment_id": "dpl_xxx",
  "status": "ready",
  "deployed_at": "2026-05-24T10:05:00Z"
}
```

### Step 4: 最終サマリ
オーケストレーター（recruitment_lp_generator/prompt.md）が3エージェントの出力を統合:

`/agents/recruitment_lp_generator/output.json`:
```json
{
  "company": { ... },
  "selected_template": "modern",
  "vercel_url": "https://sample-co-recruit.vercel.app",
  "generated_at": "...",
  "data_path": "...",
  "project_path": "...",
  "notion_record_id": null
}
```

## 実行コマンド（ヘルパースクリプト）

```bash
bash scripts/generate-recruitment-lp.sh \
  --url "https://example.com" \
  --template auto
```

スクリプトは上記3ステップを順次実行し、最終的にVercel URLを標準出力に表示する。

## エラーハンドリング
- **Step 1失敗（スキャン失敗）**: URLが無効/取得不可 → ユーザーに手動入力を促す
- **Step 2失敗（ビルド失敗）**: 直近のエラーログを返し、テンプレ修正に回す
- **Step 3失敗（デプロイ失敗）**: Vercelログを取得し、再試行（最大2回）

## 将来拡張: Step 5（Notion登録）
全工程成功後、Notion DB「採用LP管理」に1レコードを追加。
- DB未作成時は自動作成（プロパティ: 企業名/Slug/URL/テンプレ/Vercel URL/生成日時/ステータス）
- 失敗してもメインパイプラインは成功扱い（記録のみ後追い可能）
