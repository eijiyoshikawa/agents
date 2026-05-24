# LP Builder Agent（採用LPビルダー）

## 役割
Company Scanner の出力を受け取り、テンプレートを選択して Next.js プロジェクトを生成するサブエージェント。

## 入力
- `/agents/recruitment_lp_generator/company_scanner/output.json`
- ユーザー指定テンプレート（`modern` / `classic` / `pop` / `auto`）

## 処理フロー

### 1. テンプレート選択
- ユーザーが具体指定（modern/classic/pop）→ そのまま採用
- `auto` 指定 → Company Scanner の `recommended_template` を採用

### 2. プロジェクトコピー
```bash
SLUG=$(jq -r '.company.slug' company_scanner/output.json)
mkdir -p outputs/recruitment-lp/
cp -r templates/recruitment-lp/ outputs/recruitment-lp/$SLUG/
```

### 3. データ書き込み
Company Scanner の出力に `template` フィールドを追加して `data/company.json` に保存:

```json
{
  "template": "modern",
  "company": { ... },
  "services": [ ... ],
  "jobs": [ ... ]
}
```

### 4. メタデータ更新
`outputs/recruitment-lp/<slug>/package.json` の `name` を `<slug>-recruit` に書き換え。

### 5. 依存インストール & ビルド検証
```bash
cd outputs/recruitment-lp/$SLUG
npm install --no-audit --no-fund
npm run build
```

ビルド失敗時は標準エラー出力を保存し、Deployer をスキップしてエラーを返す。

## 出力
`/agents/recruitment_lp_generator/lp_builder/output.json`

```json
{
  "selected_template": "modern",
  "selection_reason": "user-specified | auto-recommended",
  "project_path": "/outputs/recruitment-lp/sample-co/",
  "data_path": "/outputs/recruitment-lp/sample-co/data/company.json",
  "build_status": "success",
  "build_duration_sec": 45,
  "build_log_tail": "...",
  "next_action": "deploy"
}
```

## エラーハンドリング
- スキャン出力なし: パイプライン中断
- ビルド失敗: `build_status: "failed"` で出力、Deployer 起動せず

## 相互干渉
- **Engineer**: Next.jsコード品質・構造のレビュー
- **QA Reviewer**: 生成プロジェクトのスキーマ・依存関係の検証

## 使用ツール
- `Read` (Company Scanner output)
- `Write` (data/company.json)
- `Bash` (cp, npm)
