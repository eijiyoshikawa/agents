# Internal Console — AI Agent Organization

社内エージェント組織（46+ エージェント）の可視化・書類作成・分析を一元化する Next.js 静的サイト MVP。

## 機能

| ページ | 内容 |
|--------|------|
| `/` | KPI ダッシュボード（エージェント数 / プロジェクト / 出力済み / 平均相互干渉） |
| `/agents` | 全エージェント一覧（部門別グリッド） |
| `/agents/[id]` | 個別エージェント詳細（prompt.md + output.json + 相互干渉） |
| `/org` | 組織マップ（添付資料のような部門列＋カラー区分） |
| `/projects` | `agents/outputs/` 配下のプロジェクト横断ビュー |
| `/documents` | 書類テンプレート選択（提案書 / 補助金 / 戦略書 / Slides / SEO監査） |
| `/documents/new/[id]` | フォーム入力 → 担当エージェント向けブリーフ生成 |
| `/analytics` | 稼働率・相互干渉カバレッジ・部門別配分・レポート密度 |
| `/reports` | 日次レポート一覧 + 個別表示 |
| `/learnings` | インスティンクト・セッション学習ログ |

## データソース

ビルド前に `scripts/scan-repo.mjs` がリポジトリをスキャンし、`data/*.json` を生成:

- `agents.json` — `agents/<name>/prompt.md` + `output.json` を全件抽出。部門・相互干渉ネットワークを推測。
- `projects.json` — `agents/outputs/<project>/` 配下を walk。
- `reports.json` — `daily_reports/*.md` のメタデータ。
- `learnings.json` — `learnings/instincts/*.json`、`learnings/sessions/*.json`。
- `design-refs.json` — `design-md/<company>/DESIGN.md` のリスト。
- `templates.json` — 書類テンプレート定義。
- `kpis.json` — 集計済み KPI。

## ローカル開発

```bash
cd console
npm install
npm run dev        # http://localhost:4000
```

`npm run dev` の前に自動で `scan-repo.mjs` が走り、最新のリポジトリ状態を反映します。

## 静的サイトビルド

```bash
npm run build      # out/ に静的サイトを書き出し
```

`out/` を gh-pages / Vercel / Cloudflare Pages 等に配信。`next.config.mjs` で `output: "export"` を指定済み。

## デザインベース

`/design-md/feer/DESIGN.md` のトークン（ink / cream / brand / surface、easing standard/grow、grow-from-bottom）を `tailwind.config.ts` に焼き付け済み。社内コンソールの標準トーンとして使用。

## 今後の拡張

- React Flow による相互干渉グラフ（現在はリスト表示）
- 書類生成の実行（Claude Code MCP 呼び出し → PDF/PPTX 出力）
- Supabase 接続による書類保存・編集・履歴管理
- Google OAuth による社内ドメイン認証
