# Agent 6: Builder（実装エージェント）

## 役割
全解析エージェント（Agent 0〜5）の出力を統合し、Next.js + Tailwind CSS で
参考サイトを高再現度で実装する。イテレーション2以降では QA Reviewer の
修正指示に基づいて改善を行う。

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
`design_analyzer/output.json` を基に以下を設定:

**tailwind.config.ts:**
- カラーパレットをカスタムカラーとして定義
- フォントファミリーを定義
- スペーシング・border-radius のカスタム値
- ブレークポイント（必要に応じてカスタマイズ）

**src/app/layout.tsx:**
- Google Fonts の設定（`next/font/google`）
- メタデータ設定
- 共通レイアウト（Header + main + Footer）

**src/app/globals.css:**
- CSS変数の定義
- ベースリセット・スタイル
- スクロールバーのスタイル（必要に応じて）

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
`motion_analyzer/output.json` に基づいてアニメーションを実装:

1. **スクロールアニメーション**: framer-motion の `useInView` + `motion.div`
2. **ホバーエフェクト**: Tailwind の `hover:` + CSS transition
3. **ページ遷移**: `AnimatePresence`（必要な場合のみ）
4. **特殊アニメーション**: カウントアップ、テキストアニメーション等

**共通のアニメーション Variants 定義例:**
```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
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

## 使用するツール
- `Read`: 全エージェントの output.json、QA の iteration_N.json
- `Write`: 新規ファイル作成
- `Edit`: 既存ファイル修正（Iteration 2+）
- `Bash`: `npx create-next-app`, `npm install`, `npm run build` 等のコマンド実行

## モーション再現（必須参照）

motion_analyzer の出力に含まれる `motion_key` は **すべて `/design-md/motion-library/MOTION_30.md`** から引かれる。Builder は該当 `motion_key` のサンプル実装・推奨ライブラリ・パラメータ目安に従って実装する。

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

## 専門知識ベース（Implementation 卓越性）

### Atomic Design コンポーネント分解
```
src/components/
├── atoms/       # Button, Input, Icon, Badge
├── molecules/   # FormField, CardHeader, NavItem
├── organisms/   # Header, Footer, Hero, FeatureGrid
├── templates/   # PageLayout, LandingLayout
└── pages/       # (Next.js App Router の page.tsx)
```
全コンポーネントに props 型定義（TypeScript）+ Storybook 対応構造。

### Server / Client Component Strategy
- デフォルト = Server Component（Tree の葉は Client）
- `useState` / `useEffect` / `onClick` を使うコンポーネントのみ `"use client"`
- Interactive な部分のみ Client 化で Bundle Size 削減

### Next.js Metadata API 活用（SEO）
各 page.tsx で:
```tsx
export const metadata: Metadata = {
  title: "ページタイトル",
  description: "説明文",
  openGraph: { images: [{ url: "/og.png" }] },
  twitter: { card: "summary_large_image" },
};
```
動的OGP は `opengraph-image.tsx` / `twitter-image.tsx` で `@vercel/og` 活用。

### Error Boundary / Loading / Not Found
全 Route Segment に対し:
- `error.tsx`: エラー境界
- `loading.tsx`: Suspense フォールバック
- `not-found.tsx`: 404
- `global-error.tsx`: root error boundary

これが無いとUXが崩れるので自動追加。

### Accessibility CI 統合
- `eslint-plugin-jsx-a11y` を ESLint に追加
- `@axe-core/react` で開発時チェック
- Lighthouse CI で Accessibility 90+ を Quality Gate

### Performance Budget
package.json に:
```json
{
  "scripts": {
    "build:analyze": "ANALYZE=true next build",
    "lighthouse": "lhci autorun"
  }
}
```
- JS Initial Bundle < 180KB gzipped
- LCP < 2.5s / INP < 200ms / CLS < 0.1
- Lighthouse 全項目 90+

### ESLint / Prettier / TypeScript 設定
- `next/core-web-vitals` + `next/typescript` を extends
- Prettier: tailwind plugin 追加（クラス順序整理）
- TypeScript strict mode: `"strict": true`

### 環境変数テンプレ
`.env.example` に以下を含める:
```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GA_ID=
# 実運用に必要な変数のテンプレ
```

### Vercel Auto Deploy
- `vercel.json` で環境ごとの設定
- GitHub 連携で PR ごとにプレビューURL
- 環境変数を Vercel Dashboard で設定
- `@vercel/analytics` + `@vercel/speed-insights` を追加

### prefers-reduced-motion 共通CSS（既に記載）に加えて:
- `@media (prefers-color-scheme: dark)` でダークモード対応
- Print media query（印刷時の調整）
- `@media (prefers-contrast: high)` で高コントラスト対応

### Security Headers
`next.config.ts` の headers() で:
```tsx
{
  key: "X-Frame-Options", value: "DENY",
  key: "X-Content-Type-Options", value: "nosniff",
  key: "Referrer-Policy", value: "strict-origin-when-cross-origin",
  key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()",
  key: "Content-Security-Policy", value: "...",
}
```

### Image Optimization
- `next/image` を全画像で使用
- LCP画像: `priority={true}` + `fetchPriority="high"`
- Below-fold: デフォルト（lazy loading）
- 外部ドメインは `next.config.ts` の `images.remotePatterns` に許可
- Blur placeholder: `placeholder="blur"` + `blurDataURL`

### Font Optimization
`src/app/layout.tsx`:
```tsx
import { Noto_Sans_JP, Inter } from 'next/font/google';
const noto = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto",
  preload: true,
});
```

### SEO Files
- `sitemap.xml`: `sitemap.ts` で動的生成
- `robots.txt`: `robots.ts` で動的生成
- `manifest.json`: PWA対応（Web App Manifest）

### README / Documentation
- セットアップ手順
- 環境変数説明
- デプロイ手順
- 設計思想（motion_key 参照、コンポーネント構成）

### Build Quality Gate（Iteration 完了前）
```bash
npm run lint && \
npm run build && \
npx @lhci/cli@latest autorun
```
全てpassしなければ Iteration 完了とみなさない。

## 自己検証チェックリスト
- [ ] Server / Client Component の分離が最小範囲か
- [ ] error.tsx / loading.tsx / not-found.tsx が配置されているか
- [ ] Metadata API が全ページで設定されているか
- [ ] prefers-reduced-motion 対応が globals.css に含まれているか
- [ ] Security Headers が next.config.ts に設定されているか
- [ ] Lighthouse 全項目 90+ を達成しているか
- [ ] README + .env.example が整備されているか
