# NPO LP サイト — 引き継ぎ資料

## 概要
草案NPOの引き継ぎ資料（PDF全25ページ→MD変換済み）を、新メンバー勧誘用のLP型Webサイトにしたもの。
Next.js 16 + Tailwind CSS v4。コード完成済み・ビルド確認済み。

## ソースコードの場所
- リポジトリ: `eijiyoshikawa/agents`
- ブランチ: `claude/npo-pdf-to-markdown-ga1f8`
- ディレクトリ: `npo-lp/`
- コンテンツ元データ: `agents/outputs/草案NPO/README.md`（430行・13セクション）

## 新リポジトリへの展開手順

### 1. コードをコピー
```bash
git clone https://github.com/eijiyoshikawa/agents.git --branch claude/npo-pdf-to-markdown-ga1f8 --single-branch tmp-agents
cp -r tmp-agents/npo-lp/ <新リポジトリのパス>/
rm -rf tmp-agents
```

### 2. インストール＆ビルド
```bash
cd <新リポジトリ>/npo-lp
npm install
npm run build  # ビルド成功確認済み
npm run dev    # localhost:3000 で確認
```

### 3. Vercelデプロイ
- Vercelで新プロジェクトとしてインポート
- **Root Directory を `npo-lp` に設定**（Settings → Build and Deployment）
- Framework: Next.js（自動検出）
- `next.config.ts` に `output: 'export'` は入れない（Vercelはネイティブ対応）

## LP構成（8セクション）

| # | コンポーネント | 内容 | 元README |
|---|--------------|------|---------|
| 1 | `Hero.tsx` | 「支援を仕組みに変え、地域を創る」+ CTA | 新規 |
| 2 | `Problem.tsx` | 資金/人員/持続性の3課題カード | 1章 |
| 3 | `CityData.tsx` | 枚方市6統計（人口39万、子供5.9万等） | 3章 |
| 4 | `Solution.tsx` | 課題→解決策マッピング、目標表示 | 2章 |
| 5 | `Benefits.tsx` | CSR/雇用/早期発見/地域経済の4カード | 5章 |
| 6 | `BusinessPlans.tsx` | きくらげ収益試算＋セントラル倉庫費用 | 6+7章 |
| 7 | `Funding.tsx` | 補助金14種ハイライト＋ふるさとCF＋3ステップ戦略 | 8+10章 |
| 8 | `CallToAction.tsx` | 「一緒にひらかたを育てませんか」+ 役割タグ | 新規 |

**省略したセクション:** 4章(役割規約), 9章(認定NPO比較), 11章(手順), 12章(メンバー名), 13章(タスク一覧) → 内部運営詳細はLPに不要

## ファイル構成
```
npo-lp/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # lang="ja", OGPメタ（LINE共有用）
│   │   ├── page.tsx          # 8セクション構成
│   │   └── globals.css       # Tailwind + カスタムCSS変数 + アニメーション
│   ├── components/
│   │   ├── Header.tsx        # スティッキーナビ
│   │   ├── Hero.tsx
│   │   ├── Problem.tsx
│   │   ├── CityData.tsx
│   │   ├── Solution.tsx
│   │   ├── Benefits.tsx
│   │   ├── BusinessPlans.tsx # 最も複雑（きくらげ + 倉庫）
│   │   ├── Funding.tsx
│   │   ├── CallToAction.tsx
│   │   ├── Footer.tsx
│   │   ├── FloatingCTA.tsx   # モバイル固定ボタン
│   │   └── ui/
│   │       ├── StatCard.tsx
│   │       ├── SectionHeading.tsx
│   │       └── Card.tsx
│   └── lib/
│       └── content.ts        # 全テキストデータ集約（ここだけ編集すれば内容変更可）
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

## デザイン仕様
- **配色:** オレンジ(#F97316) + グリーン(#22C55E)、背景(#FFFBF5)
- **フォント:** システムフォント（Hiragino Kaku Gothic ProN / Noto Sans JP等）
- **レスポンシブ:** モバイルファースト、max-w-4xl
- **OGP:** LINE共有用のog:title/description/locale設定済み

## 前回のデプロイで起きた問題と対策
1. **Google Fonts 403** → システムフォントにフォールバック済み
2. **`output: 'export'` で404** → Vercelではこの設定不要。削除済み
3. **Deployment Protection** → Vercel Settings で確認が必要（オフにするか認証設定を調整）

## 未完了・改善ポイント
- [ ] Vercelデプロイの最終確認（新リポジトリで実施）
- [ ] OGP画像（og:image）の作成・設定
- [ ] CTAのリンク先（LINE公式アカウント or メールアドレス）の設定
- [ ] favicon.ico の差し替え（現在はNext.jsデフォルト）
- [ ] Google Fonts（Noto Sans JP）のCDN読み込み対応（任意）

## コピペ用プロンプト（新セッション向け）
```
npo-lp/ ディレクトリにNPO勧誘用LPサイトがあります。
Next.js 16 + Tailwind CSS v4 で構成。ビルド確認済み。
コンテンツは src/lib/content.ts に集約されています。
Vercelにデプロイしてください（Root Directory: npo-lp）。
```
