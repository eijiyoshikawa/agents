# 警備Pro（仮称）

警備会社向けの統合業務管理クラウド。**受注 → 配置（シフト）→ 勤務実績 → 請求 → 入金** と
**勤務実績 → 給与** を、得意先 / 現場（配置先）/ 隊員 のマスタを起点に一元管理する SaaS。

> このREADMEは新リポジトリ用のテンプレートです。`/docs` に要件・設計（旧 `keibi-pro/` 一式）を移植して開発を開始します。

---

## ドキュメント

設計・要件は `docs/` を参照（旧 `keibi-pro/` から移植）:

- `docs/README.md` … サービス概要・座組
- `docs/01_domain-model.md` / `docs/12_data-model-erd.md` … ドメイン・ERD
- `docs/02_business-flows.md` … 業務フロー
- `docs/03_screen-inventory.md` / `docs/13_wireframes-and-navigation.md` / `docs/14_screen-specs.md` … 画面・API
- `docs/04_reports.md` / `docs/05_business-rules.md` … 帳票・業務ルール
- `docs/06_packaging-and-roadmap.md` … プロダクト構成・ロードマップ
- `docs/07_consolidation.md` … 既存機能の圧縮方針
- `docs/08_daily-report-and-drive.md` / `docs/09_permissions-and-employee-app.md` / `docs/10_uiux-accessibility.md`
- `docs/11_open-questions.md` … 論点（✅決定/◐仮決定/★要確認）
- `docs/15_jbca-catalog-findings.md` … ベンチマーク一次ソース
- `prisma/schema.prisma` … DBスキーマ（`docs/12` を実装化）
- `mockups/` … 配置ボード / モバイル日報の高忠実度モック（HTML）

---

## 技術スタック（想定 / `docs/06` 準拠）

| 層 | 採用 |
|----|------|
| フロント | Next.js（App Router）+ TypeScript + Tailwind（feerトークン） |
| バックエンド | Next.js Route Handlers or NestJS（REST）|
| DB | PostgreSQL + Prisma |
| 認証/権限 | セッション + ロール（owner/admin/dispatcher/accounting/branch_manager/site_leader/guard）|
| ストレージ | Google Drive 連携（日報写真・控え） |
| PDF/帳票 | サーバサイド生成（テンプレート駆動） |
| モバイル | PWA（隊員向け軽量アプリ） |
| インフラ | Vercel / Cloud（マルチテナント・RLS） |

---

## セットアップ

```bash
# 1. 依存
pnpm install

# 2. 環境変数（.env.example をコピー）
cp .env.example .env
#   DATABASE_URL / GOOGLE_* / NEXTAUTH_* などを設定

# 3. DB（PostgreSQL）
pnpm prisma migrate dev
pnpm prisma db seed   # サンプルデータ（モチベーションアップ㈱/1交差点 等）

# 4. 起動
pnpm dev              # http://localhost:3000
```

---

## 開発スコープ（Phase 1：請求が回る最小構成）

1. マスタ（自社/支店/得意先/配置先/隊員/勤務種別/単価）
2. 受注入力 → 配置予定入力（シフト）→ 勤務実績入力
3. 請求集計 → 請求書PDF（インボイス対応）
4. 入金入力・消込・売掛

詳細・受け入れ基準は `docs/06`・`docs/14`・`docs/10`（UX/アクセシビリティQA）。

---

## ブランチ / コミット規約

- ブランチ: `feature/<説明>` `fix/<説明>` `refactor/<説明>`
- コミット: Conventional Commits（`feat: / fix: / docs: / refactor: / test:` …）
- PR: タイトル70字以内 + Summary + Test Plan。テスト通過 + レビュー後マージ。

## 品質・セキュリティ基準（要約）

- 関数50行/ファイル800行/ネスト4段以内、テストカバレッジ80%目標、TDD。
- シークレットはハードコード禁止（`.env`/シークレットマネージャ）。
- 入力バリデーション・SQLi/XSS/CSRF対策・レート制限・監査ログ（金額/給与/単価）。
- 機微情報（単価・給与）はロールでマスキング（`docs/09`）。
