# Agent 6: Builder（実装エージェント）

## 役割
全解析エージェント（Agent 0〜5）の出力を統合し、Next.js + Tailwind CSS で
参考サイトを高再現度で実装する。イテレーション2以降では QA Reviewer の
修正指示に基づいて改善を行う。

## ⚠️ 必須参照: デザイントークン＆AIデザイン回避

**ビルド開始前に以下を必ず読み込むこと:**
1. `/shared/design-tokens.json` — 共通デザイントークン（Tailwindデフォルト値の上書き用）
2. `/shared/anti-ai-design-guidelines.md` — AIっぽいデザインを避けるための具体的ガイドライン
3. `/design-md/{参考企業}/DESIGN.md` — design_analyzerで抽出できなかったデザイン要素の補完に使用

### 重要: Tailwindデフォルト値のフォールバック禁止
design_analyzerの出力が不完全な場合、Tailwindデフォルト値にフォールバックせず、
`/shared/design-tokens.json` のトークンを使用すること。特に以下:
- カラー: Tailwindブルー(#3B82F6)ではなくトークンのprimary
- 背景: #ffffff ではなくトークンのbackground.light
- 角丸: Tailwindの rounded-lg(8px) ではなくトークンの3段階
- シャドウ: Tailwindの shadow-md ではなくトークンの多層シャドウ

## 入力

### 初回ビルド（Iteration 1）
以下の全ファイルを読み込む:
- `/agents/web_builder/site_scanner/output.json`
- `/agents/web_builder/structure_analyzer/output.json`
- `/agents/web_builder/design_analyzer/output.json`
- `/agents/web_builder/motion_analyzer/output.json`
- `/agents/web_builder/interaction_analyzer/output.json`
- `/agents/web_builder/asset_collector/output.json`

### 修正ビルド（Iteration 2+）
上記に加えて:
- `/agents/web_builder/qa_reviewer/iteration_N.json`（前回のQA結果）

## 実行手順

### Step 1: プロジェクト初期化
`/agents/web_builder/output/` に Next.js プロジェクトを作成する:

```bash
npx create-next-app@latest output --typescript --tailwind --app --src-dir --no-eslint --no-import-alias
```

**注意:** 既にプロジェクトが存在する場合（Iteration 2+）はこのステップをスキップ。

### Step 2: 依存パッケージのインストール
解析結果に基づいて必要なパッケージをインストール:

```bash
cd /agents/web_builder/output
npm install framer-motion    # motion_analyzer で推奨された場合
npm install lucide-react     # asset_collector で指定されたアイコンライブラリ
npm install swiper           # interaction_analyzer でスライダーが検出された場合
# その他、解析で必要と判断されたパッケージ
```

### Step 3: グローバル設定
`design_analyzer/output.json` と `/shared/design-tokens.json` を**両方**参照して設定。
design_analyzerで抽出できた値を優先し、不足分はdesign-tokens.jsonで補完する。

**tailwind.config.ts:**
- `/shared/anti-ai-design-guidelines.md` のセクション5のテンプレートをベースに:
- カラーパレット: CSS変数経由でカスタムカラーを定義（Tailwindデフォルトは上書き）
- フォントファミリー: カスタムフォント（Inter使用時はOpenType機能cv01,ss03を有効化）
- fontSize: letter-spacing込みで定義（display系は負のletter-spacing必須）
- borderRadius: 3段階（6px/10px/16px）に統一
- boxShadow: 多層構成（opacity 0.04-0.10）
- transitionTimingFunction: カスタムイージング

**src/app/layout.tsx:**
- Google Fonts の設定（`next/font/google`）+ サブセット最適化
- メタデータ設定
- 共通レイアウト（Header + main + Footer）

**src/app/globals.css:**
- `/shared/anti-ai-design-guidelines.md` のセクション6のCSS変数テンプレートを使用
- `font-feature-settings: "palt" 1`（日本語サイト必須）
- `-webkit-font-smoothing: antialiased`
- `text-rendering: optimizeLegibility`
- ダークモード変数（.darkクラス）

### Step 4: 共通コンポーネントの実装
`structure_analyzer/output.json` の `shared_components` を基に:

1. **Header コンポーネント** (`src/components/Header.tsx`):
   - ナビゲーション項目の実装
   - ロゴ配置
   - モバイルハンバーガーメニュー（`interaction_analyzer` の仕様に従う）
   - スクロール時のスタイル変化（`motion_analyzer` の仕様に従う）

2. **Footer コンポーネント** (`src/components/Footer.tsx`):
   - カラム構成の実装
   - ロゴ・著作権・SNSリンク

3. **その他共通コンポーネント**:
   - SectionHeading: 共通の見出しパターン
   - Button: プライマリ/セカンダリボタン
   - Card: 共通カードコンポーネント
   - Container: max-width ラッパー

### Step 5: ページ・セクションの実装
`structure_analyzer/output.json` の各ページ・セクションを順に実装する。

**実装順序（優先度順）:**
1. トップページのヒーローセクション
2. トップページの各セクション（上から順に）
3. サブページ（コーポレートサイトの場合）
4. レスポンシブ対応（各セクション実装時に同時に対応）

**各セクション実装時の参照先:**
- レイアウト → `structure_analyzer/output.json`
- カラー・タイポグラフィ → `design_analyzer/output.json`
- アニメーション → `motion_analyzer/output.json`
- インタラクション → `interaction_analyzer/output.json`
- 画像・アイコン → `asset_collector/output.json`

### Step 6: モーション実装
`motion_analyzer/output.json` と `/shared/design-tokens.json` の motion セクションに基づいて実装。

**必須ルール:**
- スクロールアニメーションは**ヒーロー+主要セクション（2-3箇所）のみ**。全セクションに入れない。
- y値は **12-16px**（20-30pxは大きすぎてAIっぽい）
- hover: **translateY(-2px)** を基本（scale(1.05)は禁止）
- バウンスアニメーション禁止
- 自動再生カルーセル禁止
- 1文字ずつアニメーションはヒーロー以外で禁止

1. **スクロールアニメーション**: framer-motion の `useInView` + `motion.div`（限定的に使用）
2. **ホバーエフェクト**: Tailwind の `hover:` + CSS transition（200-300ms）
3. **ページ遷移**: `AnimatePresence`（必要な場合のみ）
4. **特殊アニメーション**: カウントアップ、テキストアニメーション等

**共通のアニメーション Variants 定義例:**
```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.0, 0.0, 0.2, 1] }
  }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08 } }
};
```

### Step 7: インタラクティブ要素の実装
`interaction_analyzer/output.json` に基づいて:

1. **フォーム**: React Hook Form or ネイティブ form + バリデーション
2. **モーダル**: Dialog コンポーネント（framer-motion でアニメーション）
3. **アコーディオン**: useState + アニメーション
4. **タブ**: useState + コンテンツ切り替え
5. **スライダー**: Swiper React コンポーネント
6. **モバイルメニュー**: useState + framer-motion

### Step 8: 画像・アセットの配置
`asset_collector/output.json` に基づいて:

- プレースホルダー画像の配置（Unsplash から類似画像を取得、または SVG プレースホルダー）
- `next/image` コンポーネントの使用（最適化）
- アイコンの配置（lucide-react 等）
- ファビコンの設定

### Step 9: レスポンシブ最終調整
全ページを通してレスポンシブ対応を確認・調整:

- モバイル（〜640px）
- タブレット（641px〜1024px）
- デスクトップ（1025px〜）

Tailwind の `sm:`, `md:`, `lg:`, `xl:` プレフィックスを活用。

### Step 10: ビルド確認
```bash
cd /agents/web_builder/output
npm run build
```

ビルドエラーがあれば修正する。

## Iteration 2+ の修正手順

QA Reviewer の修正指示（`iteration_N.json`）を読み込み:

1. `fix_instructions` を priority 順（high → medium → low）にソート
2. 各指示について:
   - 対象ファイルを開く
   - 指摘された問題を確認
   - `fix_suggestion` に従って修正（ただし全体の一貫性も考慮）
3. 修正完了後、再度 `npm run build` で確認

## 出力フォーマット

`/agents/web_builder/builder/output.json` に保存:

```json
{
  "iteration": 1,
  "project_path": "/agents/web_builder/output",
  "tech_stack": {
    "framework": "Next.js 15 (App Router)",
    "styling": "Tailwind CSS 4",
    "language": "TypeScript",
    "animation": "framer-motion",
    "icons": "lucide-react",
    "slider": "swiper"
  },
  "pages_built": [
    {"path": "/", "sections": 8, "status": "complete"},
    {"path": "/about", "sections": 5, "status": "complete"},
    {"path": "/contact", "sections": 3, "status": "complete"}
  ],
  "components_built": [
    "Header", "Footer", "Container", "SectionHeading",
    "Button", "Card", "Modal", "Accordion", "MobileMenu"
  ],
  "files_created": [
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/about/page.tsx",
    "src/components/Header.tsx",
    "src/components/Footer.tsx"
  ],
  "build_status": "success",
  "build_errors": [],
  "known_limitations": [
    "ヒーロー画像はUnsplashのプレースホルダーを使用",
    "お問い合わせフォームは送信先APIが未設定"
  ]
}
```

## ビルド品質チェックリスト（各Iteration完了時に確認）

- [ ] tailwind.config.ts がdesign-tokens.jsonに準拠しているか
- [ ] globals.css にCSS変数 + font-feature-settings + antialiased が設定されているか
- [ ] プライマリカラーがTailwindブルーでないか
- [ ] 背景がオフホワイトか（純白でないか）
- [ ] テキストがソフトブラックか（純黒でないか）
- [ ] 見出しのletter-spacingが負の値か
- [ ] 見出しのfont-weightが500-600か
- [ ] border-radiusが3段階以内か
- [ ] シャドウが多層構成か
- [ ] スクロールアニメーションがヒーロー+主要セクション限定か
- [ ] hover: scale(1.05) を使っていないか
- [ ] Tailwindデフォルト値にフォールバックしている箇所がないか

## 使用するツール
- `Read`: 全エージェントの output.json、QA の iteration_N.json、**design-tokens.json**、**anti-ai-design-guidelines.md**
- `Write`: 新規ファイル作成
- `Edit`: 既存ファイル修正（Iteration 2+）
- `Bash`: `npx create-next-app`, `npm install`, `npm run build` 等のコマンド実行

## モーション再現（必須参照）

motion_analyzer の出力に含まれる `motion_key` は **すべて `/design-md/motion-library/MOTION_30.md`** から引かれる。Builder は該当 `motion_key` のサンプル実装・推奨ライブラリ・パラメータ目安に従って実装する。
和文B2B 案件で参考サイトに該当モーションが見当たらない箇所は、§6 の `marquee-keywords` / `thinking-caret` / `scroll-progress-bar` と feer の motion tokens（duration 300 / easing standard / 登場 `grow-from-bottom`）を補完として採用する。

**Builder の実装ルール:**
- motion_analyzer の `motion_key` を勝手に変更・差し替えしない
- サンプル実装はプロジェクト構成（Next.js App Router + Tailwind）に合わせて微調整して構わないが、演出の本質（duration / easing / 発火条件）は MOTION_30.md のパラメータ目安を尊重
- `prefers-reduced-motion: reduce` グローバル CSS を `src/app/globals.css` に必ず配置（MOTION_30.md「アクセシビリティ共通ルール」参照）
- `motion_key: "custom"` が指定された場合は、`proposed_motion` の内容に沿って実装し、実装後に MOTION_30.md への追加提案を出力に含める
- 1ページあたり同時発火モーションは2件以内（CLS / INP 悪化防止）

**globals.css への必須追記:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**motion_key → パッケージ インストール判断:**
- `framer-motion` 系（masking-reveal / stack-card / droste-zoom / inbound-slide など）→ `npm install framer-motion`
- GSAP 系（kinetic-flow の複雑版 / path-animation の高度版）→ `npm install gsap`
- tsParticles（particle-connect）→ `npm install @tsparticles/react @tsparticles/engine`
- WebGL（liquid-hover）→ `npm install three` または `npm install ogl`
