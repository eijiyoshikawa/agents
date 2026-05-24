# Recruitment LP Generator

建設業界向け 採用LP自動生成システム。

企業のコーポレートサイトURLを入力するだけで、3つのデザインテンプレート（modern / classic / pop）から最適なものを選び、企業情報を差し込んで採用LPを生成、Vercelへ自動デプロイしてURLを発行します。提案デモ用途に最適化。

---

## 概要

- **入力**: 企業のコーポレートサイトURL（1つ）
- **出力**: VercelにデプロイされたNext.js製の採用LP（URL）
- **所要時間**: 約3〜5分（スキャン1分 + ビルド1〜2分 + デプロイ1〜2分）
- **動作環境**: Claude Code（Maxプラン推奨）

## 3つのテンプレート

| トーン | 想定クライアント | ビジュアル |
|--------|----------------|-----------|
| **modern** | 大手ゼネコン / DX推進ゼネコン / 大手ハウスメーカー | スレートグレー + セーフティオレンジ + 図面風グリッド |
| **classic** | 老舗ゼネコン / 地場の創業○十年クラス工務店 | ディープネイビー + 真鍮ゴールド + クリーム（Noto Serif JP） |
| **pop** | 若手職人募集 / 採用強化中の新興工務店 | コンストラクションイエロー + ブラック + カウションテープ |

プレビュー画像は `templates/recruitment-lp/previews/` を参照。

---

## クイックスタート

### 1. 依存をインストール（初回のみ）

```bash
cd templates/recruitment-lp
npm install
cd ../..
```

### 2. Claude Code を起動

ターミナルで:
```bash
claude
```

### 3. スタータープロンプトを貼り付け

`START_PROMPT.md` の内容をコピーして Claude Code に貼り付けてください。
以降は「採用LPを作って: https://example.com」と依頼するだけです。

---

## ディレクトリ構造

```
.
├── README.md                            # このファイル
├── CLAUDE.md                            # Claude Code 用プロジェクト指示
├── START_PROMPT.md                      # Claude Code 起動時に貼り付けるプロンプト
├── .claude/
│   └── settings.json                    # Claude Code 設定（hooks / permissions）
├── agents/
│   └── recruitment_lp_generator/
│       ├── prompt.md                    # オーケストレーター本体
│       ├── orchestrator/
│       │   ├── PIPELINE.md              # パイプライン詳細手順
│       │   └── run.md                   # ワンショット実行プロンプト
│       ├── company_scanner/prompt.md    # サブ: 企業情報抽出
│       ├── lp_builder/prompt.md         # サブ: テンプレ差込・ビルド
│       └── deployer/prompt.md           # サブ: Vercelデプロイ
├── templates/
│   └── recruitment-lp/
│       ├── app/                         # Next.js App Router
│       ├── components/
│       │   ├── templates/               # 3トーンのテンプレ実装
│       │   └── common/                  # 共通コンポーネント
│       ├── lib/                         # 型定義・データローダー
│       ├── data/company.json            # サンプルデータ（差し込み用）
│       ├── previews/                    # プレビューPNG（12枚）
│       └── README.md
├── scripts/
│   └── generate-recruitment-lp.sh       # オーケストレーター実行スクリプト
└── outputs/
    └── recruitment-lp/                  # 生成LPの保存先（git管理外）
```

---

## 使い方

### Claude Code から（推奨）

```
採用LPを作ってください: https://example.com
```

→ 自動で以下が走ります:
1. Company Scanner が企業情報を抽出
2. LP Builder がテンプレを選択・差込・ビルド
3. Deployer が Vercel にデプロイ
4. 公開URLを返却

### スクリプト直接実行

事前に Company Scanner エージェントを実行して `agents/recruitment_lp_generator/company_scanner/output.json` を生成してから:

```bash
bash scripts/generate-recruitment-lp.sh \
  --url "https://example.com" \
  --template auto
```

オプション:
- `--template auto | modern | classic | pop`（デフォルト: auto）
- `--slug custom-slug`（出力ディレクトリ名を上書き）
- `--skip-deploy`（Vercelデプロイをスキップ）
- `--skip-install`（npm install をスキップ）

---

## テンプレートのローカル確認

```bash
cd templates/recruitment-lp
npm run dev
# → http://localhost:3000
```

`data/company.json` の `template` フィールドを `modern` / `classic` / `pop` に書き換えるとデザインが切り替わります。

---

## Vercel デプロイ

スクリプトは `vercel` CLI が入っていれば自動デプロイします。

```bash
npm install -g vercel
vercel login
```

代替として Vercel MCP（`mcp__..._deploy_to_vercel`）も利用可能です。

---

## 提案デモ用途の制限

- 応募フォームは**ダミーUI**です（実送信なし）。本実装時は `components/common/ApplicationForm.tsx` に Resend / SendGrid / Notion などの送信処理を追加してください。
- 企業ロゴ・写真は無断使用しません（テンプレ側ではプレースホルダーのみ）。
- 抽出情報は表示用途のみ。商用利用時は対象企業の許諾を確認してください。

---

## 開発・カスタマイズ

### コード品質チェック

```bash
cd templates/recruitment-lp
npm run lint        # ESLint
npx tsc --noEmit    # TypeScript
npm run build       # 本番ビルド
```

### 新テンプレ追加

1. `components/templates/<NewName>Template.tsx` を作成
2. `app/page.tsx` の switch に追加
3. `lib/types.ts` の `TemplateName` に追加
4. `agents/recruitment_lp_generator/company_scanner/prompt.md` のトーン判定マトリクスを更新

### 色味調整

- カスタムカラーは `templates/recruitment-lp/tailwind.config.ts`
- 全テンプレで共通する設定は `templates/recruitment-lp/app/globals.css`

---

## 将来拡張

- [ ] Notion DB 連携（生成LPの管理）
- [ ] 応募フォームの本実装（Resend / SendGrid / Notion）
- [ ] A/Bテスト用の複数テンプレ同時生成
- [ ] 多言語対応（en / ja）
- [ ] 動画・写真ヒーローへの拡張
- [ ] PWA / 構造化データ（JobPosting schema）

---

## ライセンス

社内利用前提。外部公開する場合はライセンスを別途設定してください。
