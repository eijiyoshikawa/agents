# Internal Console — AI Agent Organization

社内エージェント組織（46+ エージェント）の可視化・書類作成・分析・Google Drive 連携を一元化する Next.js 静的サイト。

## 機能一覧

| URL | 内容 | 公開制御 |
|-----|------|---------|
| `/` | KPI ダッシュボード（エージェント数 / プロジェクト / 出力済み / 平均相互干渉） | 公開 |
| `/agents` | 全エージェント一覧（部門別グリッド・検索・フィルタ） | 公開 |
| `/agents/[id]` | 個別エージェント詳細（prompt.md / output.json / 相互干渉） | 公開（output は admin） |
| `/org` | 組織マップ（部門列・カラー区分） | 公開 |
| `/org/graph` | **React Flow による相互干渉グラフ**（ノードクリックでフォーカス） | 公開 |
| `/projects` | プロジェクト横断ビュー | 公開 |
| `/drive` | **Google Drive フォルダ構成・連携状態**（マニフェスト方式） | 公開 |
| `/documents` | 書類テンプレート選択 | 公開 |
| `/documents/new/[id]` | フォーム入力 → ブリーフ生成（生成自体は未実装、現状維持） | 公開 |
| `/analytics` | 稼働率・相互干渉カバレッジ・部門配分・レポート密度 | 公開 |
| `/reports` | 日次レポート一覧と Markdown→HTML 表示 | 公開 |
| `/learnings` | インスティンクト・セッション学習ログ | 公開 |
| `/costs` | **社内運用コスト試算 4プラン + 比較・ロードマップ** | 管理者のみ |
| `/admin` | 公開設定の管理（パスフレーズ保護） | 管理者のみ |

### ⌘K コマンドパレット
どのページでも **⌘K / Ctrl+K** で起動。エージェント・プロジェクト・レポート・書類テンプレ・Drive フォルダ・ページを横断検索して直接ジャンプできます。

### 管理者モード
`/admin` でパスフレーズを入力（デフォルト: `agents-2026`、`config/visibility.json` で変更可）。
ページ単位・セクション単位の公開/非公開をトグルでき、設定は localStorage に保存。
チーム全体に反映する場合は「visibility.json を書き出し」ボタンからダウンロードして `config/visibility.json` を上書き → ビルド。

## データソース

ビルド前に `scripts/scan-repo.mjs` がリポジトリと Drive マニフェストをスキャンし、`data/*.json` を生成:

- `agents.json` — `agents/<name>/prompt.md` + `output.json`
- `projects.json` — `agents/outputs/<project>/`
- `reports.json` — `daily_reports/*.md`
- `learnings.json` — `learnings/instincts/*.json`、`learnings/sessions/*.json`
- `design-refs.json` — `design-md/<company>/DESIGN.md`
- `templates.json` — 書類テンプレート定義
- `drive.json` — `config/drive-manifest.json` の内容
- `kpis.json` — 集計済み KPI
- `search-index.json` — ⌘K 検索用の統合インデックス

## ローカル開発

```bash
cd console
npm install --legacy-peer-deps
npm run dev        # http://localhost:4000
```

`npm run dev` の前に自動で `scan-repo.mjs` が走ります。

## 静的サイトビルド

```bash
npm run build      # out/ に静的サイトを書き出し
```

`out/` を gh-pages / Vercel / Cloudflare Pages 等に配信。`next.config.mjs` で `output: "export"` を指定済み。

## GitHub Pages 自動デプロイ

`.github/workflows/deploy-console.yml` を配置済み。
`main` ブランチに `console/`, `agents/`, `daily_reports/`, `learnings/`, `design-md/` 配下の変更が push されると自動でビルド・デプロイが走ります。

### 初回セットアップ
1. リポジトリの Settings → Pages → Source を **GitHub Actions** に設定
2. main に push すると初回ビルドが走り、`https://<org>.github.io/<repo>/` で公開
3. カスタムドメインを使う場合は `console/public/CNAME` を作成し、DNS 設定

`NEXT_PUBLIC_BASE_PATH` 環境変数で basePath を制御。リポジトリ名が `agents` の場合は自動で `/agents` が付きます。

## Google Drive 連携

### 現状（マニフェスト方式）
`config/drive-manifest.json` を手で編集して、Drive のフォルダ構造を静的に記述。

### 本番接続（Service Account 方式）
1. Google Cloud で Service Account を作成 → JSON キーをダウンロード
2. 共有ドライブのメンバーに Service Account のメールを **閲覧者** として追加
3. `.env.local` に資格情報を設定
4. `scripts/scan-drive.mjs`（後続実装）で `data/drive.json` を自動生成
5. GitHub Actions の cron で日次同期

詳細は `/drive` ページ → 「本番連携への切替手順」セクション参照。

## 運用コスト

- **MVP（現状）**: 0 円 / 月
- **自動 Drive 同期**: 0〜500 円 / 月
- **動的サイト + OAuth**: 2,500 円 / 月（無料枠で済む場合あり）
- **本格運用**: 12,000 円 / 月

詳細・他案比較・推奨ロードマップは `/costs` ページ参照。

## デザインベース

`/design-md/feer/DESIGN.md` のトークン（ink / cream / brand / surface、easing standard/grow、grow-from-bottom）を `tailwind.config.ts` に焼き付け済み。ダーク/ライト/システムテーマ切替に対応。

## 今後の拡張

- ✅ React Flow による相互干渉グラフ
- ⏸ 書類生成の実行（保留中）
- ✅ ⌘K コマンドパレット
- ✅ GitHub Actions 自動配信
- ✅ コスト試算
- ✅ Google Drive 連携（マニフェスト方式）
- 🚧 Drive API による自動同期（`scripts/scan-drive.mjs`）
- 🚧 Google OAuth による社内ドメイン認証
- 🚧 Supabase 接続による書類保存・編集・履歴管理
