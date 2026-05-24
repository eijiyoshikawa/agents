# Recruitment LP Generator — Claude Code プロジェクト指示

## プロジェクト概要
建設業界向けに採用LPを自動生成し、Vercelへデプロイするシステム。
企業のコーポレートサイトURL1つを入力として、3トーンのテンプレート（modern / classic / pop）から最適なものを選び、企業情報を差し込んで公開URLを発行する。

## 担当エージェント

| エージェント | 役割 | プロンプト |
|------------|------|-----------|
| `recruitment_lp_generator` | オーケストレーター | `agents/recruitment_lp_generator/prompt.md` |
| `company_scanner` | サブ: 企業情報抽出 | `agents/recruitment_lp_generator/company_scanner/prompt.md` |
| `lp_builder` | サブ: テンプレ差込 + ビルド | `agents/recruitment_lp_generator/lp_builder/prompt.md` |
| `deployer` | サブ: Vercel デプロイ | `agents/recruitment_lp_generator/deployer/prompt.md` |

詳細パイプライン: `agents/recruitment_lp_generator/orchestrator/PIPELINE.md`

## 実行フロー

```
[企業URL]
    ↓
[Company Scanner]  → 基本情報 / 事業 / 募集要項 / トーン判定
    ↓
[LP Builder]       → テンプレ選択 → data.json生成 → ビルド
    ↓
[Deployer]         → Vercel デプロイ → 公開URL取得
    ↓
[最終サマリ]
```

## ディレクトリ構造

```
.
├── agents/
│   └── recruitment_lp_generator/   # エージェント定義
├── templates/
│   └── recruitment-lp/             # Next.js テンプレート
│       ├── app/                    # Next.js App Router
│       ├── components/
│       │   ├── templates/          # 3トーン: Modern/Classic/Pop
│       │   └── common/             # 共通: ApplicationForm
│       ├── lib/                    # 型・データローダー
│       ├── data/company.json       # 差し込みデータ
│       └── previews/               # 各テンプレのプレビューPNG
├── scripts/
│   └── generate-recruitment-lp.sh  # オーケストレーター実行
└── outputs/
    └── recruitment-lp/<slug>/      # 生成物（gitignore対象）
```

## 重要なファイル

| 編集頻度 | ファイル |
|---------|---------|
| **高** | `templates/recruitment-lp/components/templates/*.tsx`（テンプレ調整） |
| **高** | `templates/recruitment-lp/tailwind.config.ts`（色味調整） |
| **中** | `agents/recruitment_lp_generator/company_scanner/prompt.md`（トーン判定ロジック） |
| **中** | `templates/recruitment-lp/components/common/ApplicationForm.tsx`（フォーム） |
| **低** | `agents/recruitment_lp_generator/orchestrator/PIPELINE.md`（パイプライン手順） |

## 開発標準

### コード品質
- 関数: 50行以内 / ファイル: 800行以内 / ネスト: 4段以内
- TypeScript strict / ESLint（next/core-web-vitals）
- 命名は意図が伝わるものに。略語は一般的なもののみ
- コメントは WHY のみ。WHAT はコードで表現

### TDD / テスト（将来）
現状ユニットテストは未整備。テンプレ追加時はビルドが通ることのみ確認。
本番運用時は Playwright で E2E（hero表示 / フォーム動作）の追加を推奨。

### Git ワークフロー
- ブランチ: `feature/<short-desc>` / `fix/<short-desc>` / `refactor/<short-desc>`
- コミット: Conventional Commits（`feat:` / `fix:` / `refactor:` / `chore:` / `docs:`）
- PR タイトルは 70 文字以内

## セキュリティ基準

### コミット前チェックリスト
- [ ] シークレット（API キー・トークン）のハードコードなし
- [ ] ユーザー入力のサニタイズ（フォーム本実装時）
- [ ] 抽出した企業ロゴ・写真の無断使用なし
- [ ] `.env*.local` が `.gitignore` 対象

### シークレット管理
- 環境変数で管理（Vercel ダッシュボード / `.env.local`）
- 漏洩時は即ローテーション

## トークン最適化

| コンポーネント | 上限目安 |
|-------------|---------|
| CLAUDE.md | 300行 |
| エージェントプロンプト | 200行/体 |
| output.json | 2000トークン |

各エージェントの出力は JSON で標準化済み。

## 実行コマンド早見表

```bash
# ローカル開発
cd templates/recruitment-lp && npm run dev    # http://localhost:3000

# ビルド検証
cd templates/recruitment-lp && npm run build  # 静的生成
cd templates/recruitment-lp && npm run lint   # ESLint
cd templates/recruitment-lp && npx tsc --noEmit  # 型チェック

# 採用LP生成（フルパイプライン）
bash scripts/generate-recruitment-lp.sh --url "https://example.com" --template auto
```

## 困ったときの対応

| 症状 | 確認場所 |
|------|---------|
| ビルドエラー | `templates/recruitment-lp/.next/build-trace` / `npm run build` 全文 |
| デプロイ失敗 | Vercel ダッシュボードのログ / `agents/recruitment_lp_generator/deployer/output.json` |
| テンプレ崩れ | `npm run dev` でローカル確認 → `components/templates/*.tsx` 該当箇所修正 |
| トーン判定が外れる | `agents/recruitment_lp_generator/company_scanner/prompt.md` のマトリクス見直し |
| 抽出情報が薄い | スキャナーのURL辿り深さ拡張（最大ページ数を変更） |

## 将来追加予定

- Notion DB 連携（生成LP管理）
- 応募フォームの本実装（Resend / Notion API）
- 4つ目以降のテンプレート

新機能追加時は本ファイルの「担当エージェント」「重要なファイル」を必ず更新すること。
