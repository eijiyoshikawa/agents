# デプロイ手順（Vercel 即公開）

このフォルダ（`keibi-pro/`）は **ビルド不要の静的サイト**です。
新リポジトリに置いて Vercel に繋ぐだけで、「Phase1 ここまで動きます」のデモが即公開できます。

- トップ（`/`）= プロダクトデモのハブ（`index.html`）
- 各画面 = `mockups/*.html`
- LP = `sales/preview/lp.html` / 提案 = `sales/preview/proposal.html`

---

## A. 最短（推奨）：新リポジトリ直下に置く

```bash
# 1) 新リポジトリを作成（例 keibi-pro-demo）
# 2) この keibi-pro/ の中身をリポジトリ直下にコピー
#    （index.html がリポジトリのルートに来るように）
git init && git add . && git commit -m "init: 警備Pro demo"
git branch -M main
git remote add origin git@github.com:<owner>/keibi-pro-demo.git
git push -u origin main
```

Vercel:
1. New Project → 当リポジトリを Import
2. Framework Preset = **Other**（静的。Build Command 空 / Output 空でOK）
3. Deploy → 数十秒で公開URL発行

→ `https://<project>.vercel.app/` でデモ、`/sales/preview/lp.html` でLP。

## B. リポジトリ直下に置きたくない場合（サブフォルダ運用）

`keibi-pro/` をサブフォルダのまま push し、Vercel の
**Settings → Build & Development → Root Directory = `keibi-pro`** に設定。

## C. CLI で一発

```bash
npm i -g vercel
cd keibi-pro
vercel        # プレビュー
vercel --prod # 本番
```

---

## メモ
- `vercel.json` で cleanUrls 等を設定済（拡張子なしURLでもアクセス可）。
- 完全静的なので **環境変数・DB不要**。商談直前でも壊れません。
- 本番アプリ（Next.js + PostgreSQL + Google Drive 連携）へ発展させる場合は
  `STARTER/`（README/構成/.env.example/Phase1チケット）と `docs/` を土台に実装。
- カスタムドメインは Vercel の Domains から割当可能。
