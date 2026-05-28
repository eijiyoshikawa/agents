# 株式会社一二三 採用LP — Vercelデプロイ手順

このディレクトリには3パターンの採用LPプロジェクトが格納されています。
1コマンドで全てをVercelにデプロイできます。

## ディレクトリ

| パターン | パス | 想定用途 |
|---------|------|---------|
| modern | `hifumi-123-modern/` | DX推進・大手ゼネコン風 |
| classic | `hifumi-123-classic/` | 老舗・王道採用LP（推奨） |
| pop | `hifumi-123-pop/` | 若手職人募集向け |

各プロジェクトに `previews/` 画像が同梱されています。

---

## デプロイ手順（初回）

### 1. Vercel CLI セットアップ（初回のみ）

```bash
npm install -g vercel
vercel login
```

→ ブラウザが開くのでGitHub/Google等でログイン。

### 2. 一発デプロイ

```bash
# リポジトリのルートで実行
bash scripts/deploy-hifumi-vercel.sh
```

→ 3つのVercelプロジェクトが新規作成され、それぞれのURLが返ります。
所要時間: 3〜5分（3パターン合計）

---

## 出力例

```
====================================================
  デプロイ完了サマリ
====================================================
  modern   : https://hifumi-123-modern.vercel.app
  classic  : https://hifumi-123-classic.vercel.app
  pop      : https://hifumi-123-pop.vercel.app

  結果ファイル: outputs/recruitment-lp/deployment-urls.json
====================================================
```

URLは `outputs/recruitment-lp/deployment-urls.json` にも保存されます。

---

## 再デプロイ（コード変更後）

初回デプロイ時に各ディレクトリに `.vercel/project.json` が作られ、
2回目以降は同じVercelプロジェクトに紐づいて再デプロイされます。

```bash
bash scripts/deploy-hifumi-vercel.sh
```

特定パターンだけ再デプロイ:

```bash
bash scripts/deploy-hifumi-vercel.sh --only classic
```

---

## 手動デプロイ（任意の1つだけ）

```bash
cd outputs/recruitment-lp/hifumi-123-classic
vercel --prod --yes
```

---

## ローカル確認

```bash
cd outputs/recruitment-lp/hifumi-123-classic
npm install
npm run dev    # → http://localhost:3000
```

---

## 注意事項

- 応募フォームは**ダミーUI**です（実送信なし、提案デモ用途）
- 企業ロゴ・写真は使用せず、Tailwindで構築
- 本実装時は `components/common/ApplicationForm.tsx` に送信処理を追加
- 各プロジェクトには Next.js 14.2 が含まれます（パッチ済みバージョン）
