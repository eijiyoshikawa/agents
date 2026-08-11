# LET 求人票ジェネレーター

<<<<<<< HEAD
株式会社LET 専用の社内ツール。**他社求人URLの貼り付け**または**素案テキストの入力**から、
AIが内容を読み取り、転職エージェント仕様の詳細求人票へ整理します。Web上で確認でき、
ブラウザの印刷機能から**PDF出力**も可能です。

> デプロイ: `let-hyoka` ブランチへのpushでVercelに自動デプロイされます。
=======
株式会社LET 専用の社内ツール。**他社求人ページのURLを貼り付けるだけ**で、AIが内容を読み取り、
LETデザイン（feerベースの和文B2Bトーン）の求人票へ統合します。Web上で確認でき、そのまま**PDF出力**も可能です。
>>>>>>> claude/evaluation-finance-dashboard-50w8t9

## 特徴

- **URL → 求人票**: 複数の他社求人URL（最大8件）を1枚の求人票にAI統合
- **Web = PDF の完全一致**: 求人票は単一のHTML/CSS（`src/lib/template.ts`）から生成され、
  Webプレビュー（iframe）とPDF（Puppeteer）が同じ見た目になる
- **編集可能**: 抽出結果は出力前に画面上で微調整できる
- **LETブランド**: 色・ロゴ・連絡先は `src/lib/company.ts` の1ファイルで一元管理（確定後に差し替え）

## アーキテクチャ

```
URL入力 ─▶ /api/extract ─▶ ① HTML取得(fetch-html) ─▶ ② AI統合抽出(extract-job, Claude)
                                                          │
                          編集(JobEditor) ◀── 求人票JSON ─┘
                                │
       プレビュー(JobPreview/iframe) ── 同じHTML ── /api/pdf ─▶ Puppeteer ─▶ PDF
                                         (template.ts)
```

| 層 | ファイル |
|----|---------|
| 求人票デザイン（単一ソース） | `src/lib/template.ts` |
| 型・スキーマ（zod） | `src/lib/types.ts` |
| 自社情報・ブランド | `src/lib/company.ts` |
| URL取得・本文整形 | `src/lib/fetch-html.ts` |
| AI抽出（Claude） | `src/lib/extract-job.ts` / `src/lib/prompt.ts` |
| PDF生成 | `src/lib/pdf.ts` |
| API | `src/app/api/extract`・`src/app/api/pdf` |
| 画面 | `src/app/page.tsx`・`src/components/*` |

## セットアップ

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY を設定
npm run dev                  # http://localhost:3000
```

### 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `ANTHROPIC_API_KEY` | ✅ | 求人情報のAI抽出に使用 |
| `ANTHROPIC_MODEL` | – | 抽出モデル（既定 `claude-sonnet-4-6`） |
| `PUPPETEER_EXECUTABLE_PATH` | – | ローカルでPDF生成する場合のChromeパス。本番は不要 |

> ローカルでPDFを出すには Chrome/Chromium が必要です（`PUPPETEER_EXECUTABLE_PATH` を指定）。
> Vercel等のサーバーレスでは `@sparticuz/chromium` が自動的に使われます。

## コマンド

```bash
npm run dev      # 開発サーバー
npm run build    # 本番ビルド
npm run test     # テスト(vitest)
npm run lint     # ESLint
```

## ブランド情報の更新

ロゴ・指定カラー・住所などが確定したら `src/lib/company.ts` の `LET_COMPANY` を更新するだけで、
Web/PDF両方の求人票に反映されます。

## 注意

- 他社求人の文章をそのまま転載しないよう、AIには「要点を再構成する」よう指示しています。
  最終的な内容は必ず人の目で確認してください（編集パネルで調整可）。
- 求人ページによってはbot対策等でHTML取得に失敗する場合があります（取得結果は画面に表示されます）。
