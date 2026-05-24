# Recruitment LP Generator — 別リポジトリ移植パッケージ

このディレクトリは「採用LP自動生成システム」を別の新規リポジトリに移植するためのパッケージです。

---

## TL;DR（最短手順）

```bash
# 1. 新リポジトリ用のディレクトリを用意
mkdir ~/projects/recruitment-lp-generator
cd /home/user/agents

# 2. セットアップスクリプト実行
bash recruitment-lp-package/setup-new-repo.sh ~/projects/recruitment-lp-generator

# 3. 新リポジトリで Claude Code を起動し、START_PROMPT.md の内容を貼り付ける
cd ~/projects/recruitment-lp-generator
claude code  # またはお好みの起動方法
```

---

## パッケージ構成

```
recruitment-lp-package/
├── MIGRATION.md                # このファイル（移植手順）
├── setup-new-repo.sh           # 自動セットアップスクリプト
└── new-repo/                   # 新リポジトリに配置するメタファイル
    ├── README.md               # 新リポジトリの README
    ├── CLAUDE.md               # 新リポジトリの CLAUDE.md（Claude Code 用指示書）
    ├── START_PROMPT.md         # Claude Code 起動時に貼り付けるプロンプト
    ├── .gitignore              # 新リポジトリの .gitignore
    └── .claude/
        └── settings.json       # 推奨 Claude Code 設定
```

---

## 何が新リポジトリにコピーされるか

`setup-new-repo.sh` を実行すると、以下のファイル群が新リポジトリにコピーされます。

### 1. エージェント定義（6ファイル）
コピー元: `agents/recruitment_lp_generator/`

| ファイル | 役割 |
|---------|------|
| `prompt.md` | オーケストレーターの定義 |
| `orchestrator/PIPELINE.md` | パイプライン詳細手順 |
| `orchestrator/run.md` | ワンショット実行プロンプト |
| `company_scanner/prompt.md` | サブエージェント: 企業情報抽出 |
| `lp_builder/prompt.md` | サブエージェント: テンプレ差し込み・ビルド |
| `deployer/prompt.md` | サブエージェント: Vercelデプロイ |

### 2. Next.js テンプレートプロジェクト
コピー元: `templates/recruitment-lp/`

除外対象: `node_modules/`, `.next/`, `package-lock.json`, `tsconfig.tsbuildinfo`

| パス | 内容 |
|------|------|
| `app/layout.tsx` | next/font 設定（Noto Sans/Serif JP + Inter） |
| `app/page.tsx` | テンプレ振り分け（data.template でルーティング） |
| `app/globals.css` | グローバルスタイル + keyframes |
| `components/templates/ModernTemplate.tsx` | 大手ゼネコン / DX推進向け |
| `components/templates/ClassicTemplate.tsx` | 老舗ゼネコン / 地場工務店向け |
| `components/templates/PopTemplate.tsx` | 若手職人募集向け |
| `components/common/ApplicationForm.tsx` | 共通の応募フォーム（ダミー） |
| `lib/types.ts` | データ型定義（CompanyData） |
| `lib/data.ts` | data.json ローダー |
| `data/company.json` | サンプルデータ（建設会社） |
| `previews/*.png` | プレビュー画像（12枚: 3テンプレ × 2viewport × 2画角） |
| `package.json` / `tsconfig.json` / `tailwind.config.ts` / `postcss.config.mjs` / `next.config.mjs` / `.eslintrc.json` / `.gitignore` | 設定ファイル一式 |
| `README.md` | テンプレ自体の説明 |

### 3. オーケストレータースクリプト（1ファイル）
コピー元: `scripts/generate-recruitment-lp.sh`

### 4. メタファイル（新規）
コピー元: `recruitment-lp-package/new-repo/`

- `README.md` — 新リポジトリのトップREADME
- `CLAUDE.md` — Claude Code 用のプロジェクト指示書
- `START_PROMPT.md` — Claude Code を初回起動した時に貼り付けるプロンプト
- `.gitignore` — Node.js / Next.js / IDE 用の標準gitignore
- `.claude/settings.json` — 推奨 hook と permissions

---

## 移植後の新リポジトリ構造

```
recruitment-lp-generator/
├── README.md
├── CLAUDE.md
├── START_PROMPT.md
├── .gitignore
├── .claude/
│   └── settings.json
├── agents/
│   └── recruitment_lp_generator/
│       ├── prompt.md
│       ├── orchestrator/
│       │   ├── PIPELINE.md
│       │   └── run.md
│       ├── company_scanner/prompt.md
│       ├── lp_builder/prompt.md
│       └── deployer/prompt.md
├── templates/
│   └── recruitment-lp/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── data/
│       ├── previews/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── next.config.mjs
│       ├── .eslintrc.json
│       ├── .gitignore
│       └── README.md
├── scripts/
│   └── generate-recruitment-lp.sh
└── outputs/                    # 生成LPの保存先（gitignore対象）
    └── recruitment-lp/
```

---

## 手動移植したい場合（スクリプトを使わない）

```bash
DEST=~/projects/recruitment-lp-generator
mkdir -p "$DEST"/{agents,templates,scripts,outputs/recruitment-lp,.claude}

# エージェント定義
cp -r agents/recruitment_lp_generator "$DEST/agents/"

# テンプレ（不要なものを除外）
rsync -a \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='package-lock.json' \
  --exclude='tsconfig.tsbuildinfo' \
  templates/recruitment-lp "$DEST/templates/"

# スクリプト
cp scripts/generate-recruitment-lp.sh "$DEST/scripts/"
chmod +x "$DEST/scripts/generate-recruitment-lp.sh"

# メタファイル
cp recruitment-lp-package/new-repo/README.md "$DEST/"
cp recruitment-lp-package/new-repo/CLAUDE.md "$DEST/"
cp recruitment-lp-package/new-repo/START_PROMPT.md "$DEST/"
cp recruitment-lp-package/new-repo/.gitignore "$DEST/"
cp recruitment-lp-package/new-repo/.claude/settings.json "$DEST/.claude/"

# git 初期化
cd "$DEST"
git init -b main
git add -A
git commit -m "initial: recruitment LP generator system"
```

---

## 移植後のセットアップ

新リポジトリ側で以下を実行:

```bash
# 1. テンプレの依存をインストール
cd templates/recruitment-lp
npm install

# 2. ローカルでテンプレ確認（任意）
npm run dev
# → http://localhost:3000 でサンプル表示

# 3. Claude Code を起動し、START_PROMPT.md の内容を貼り付け
```

---

## Vercel CLI（任意）

スクリプトは Vercel CLI があれば自動デプロイします。なければ手動デプロイ案内が出ます。

```bash
npm install -g vercel
vercel login
```

---

## 既存リポジトリとの差分管理

新リポジトリは独立して進化させる前提です。
もし将来このリポジトリで改善した内容を新リポジトリにも反映したい場合は:

1. `setup-new-repo.sh` を改良し、上書きモードを追加
2. または `git subtree push` / `git subtree pull` を使う
3. シンプルには、変更ファイルだけ `cp` で個別反映
