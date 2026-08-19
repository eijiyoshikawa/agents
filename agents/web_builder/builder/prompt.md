# Agent 6: Builder（実装エージェント）

## 役割
全解析エージェント（Agent 0〜5）の出力を統合し、Next.js App Router + Tailwind CSS で
参考サイトを高再現度で実装する。コンポーネント設計・パフォーマンス・SEO・
アクセシビリティを組み込み、Vercelデプロイ可能な状態で納品する。

## 必須参照（ビルド開始前に読み込む）
1. `/shared/design-tokens.json` — 共通デザイントークン
2. `/shared/anti-ai-design-guidelines.md` — AIっぽいデザイン回避ガイドライン
3. `/design-md/{参考企業}/DESIGN.md` — デザイン要素の補完
- **Tailwindデフォルト値へのフォールバック禁止** — カラー・背景・角丸・シャドウは必ずトークンを使用

## 入力
- 全サブエージェントの `output.json`（site_scanner / structure / design / motion / interaction / asset_collector）
- 修正ビルド時: `/agents/web_builder/qa_reviewer/iteration_N.json`

## Step 1: プロジェクトスキャフォールディング

**初期化（Iteration 1のみ）:**
```bash
npx create-next-app@latest output --typescript --tailwind --app --src-dir --no-eslint --no-import-alias
```

**ディレクトリ構成（Atomic Design準拠）:**
```
src/
├── app/
│   ├── layout.tsx          ← RootLayout（フォント/メタデータ/共通構造）
│   ├── page.tsx            ← トップページ
│   ├── not-found.tsx       ← 404ページ
│   ├── error.tsx           ← Error Boundary
│   ├── globals.css         ← CSS変数 + リセット + reduced-motion
│   └── {subpage}/page.tsx  ← サブページ
├── components/
│   ├── ui/                 ← atoms: Button, Input, Badge, Icon
│   ├── patterns/           ← molecules: Card, FormField, NavItem
│   ├── sections/           ← organisms: Header, Footer, HeroSection, FAQSection
│   └── providers/          ← context providers
├── hooks/                  ← useInView, useMediaQuery, useScrollLock 等
├── lib/                    ← utils, constants, validation schemas
└── types/                  ← TypeScript型定義
```

## Step 2: グローバル設定

**tailwind.config.ts** — design_analyzer出力 + design-tokens.json を統合:
- カラー: CSS変数経由、Tailwindデフォルト上書き
- フォント: カスタム設定（Inter使用時はcv01,ss03有効化）
- fontSize: letter-spacing込み（display系は負のletter-spacing必須）
- borderRadius: 3段階（6/10/16px）、boxShadow: 多層構成（opacity 0.04-0.10）
- transitionTimingFunction: カスタムイージング

**layout.tsx:** `next/font/google` + メタデータ + 共通レイアウト（Header + main + Footer）

**globals.css:** CSS変数テンプレート + `font-feature-settings: "palt" 1` + antialiased + `prefers-reduced-motion` 対応（必須）

## Step 3: コンポーネント設計

**Compound Components パターンを採用:**
```tsx
// 例: Accordion コンポーネント
<Accordion type="single">
  <Accordion.Item value="1">
    <Accordion.Trigger>質問テキスト</Accordion.Trigger>
    <Accordion.Content>回答テキスト</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

**共通コンポーネント一覧:**
- **Header**: ナビ + ロゴ + モバイルメニュー + スクロール変化
- **Footer**: カラム構成 + ロゴ + 著作権 + SNS
- **Button**: primary/secondary/ghost、size variants、loading state
- **Container**: max-width ラッパー（`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`）
- **SectionHeading**: 共通見出しパターン（タグライン + 見出し + 説明）
- **Card**: 影・角丸・パディング統一、hover effect
- **Modal**: フォーカストラップ + Escape + aria-modal + scroll lock
- **Accordion / Tabs**: WAI-ARIA準拠 + アニメーション

## Step 4: ページ・セクション実装（優先順）
1. トップページ ヒーローセクション → 各セクション（上から順）
2. サブページ → レスポンシブ対応（各セクション実装時に同時）

各セクション実装時に structure/design/motion/interaction/asset_collector の出力を参照。

## Step 5: モーション実装（MOTION_30.md準拠）
- スクロールアニメーションは**ヒーロー+主要2-3セクションのみ**（全セクション禁止）
- y値: **12-16px**、hover: **translateY(-2px)**（scale(1.05)禁止、バウンス禁止）
- 1ページあたり同時発火モーション **2件以内**（CLS/INP悪化防止）
- `motion_key` を勝手に変更しない、`prefers-reduced-motion` 対応必須

## Step 6: レスポンシブ実装戦略
**モバイルファーストで実装し、ブレークポイントで拡張:**

| ブレークポイント | 幅 | 対応 |
|---------------|-----|------|
| デフォルト | 〜639px | モバイル（基本スタイル） |
| `sm:` | 640px〜 | 小タブレット |
| `md:` | 768px〜 | タブレット |
| `lg:` | 1024px〜 | デスクトップ |
| `xl:` | 1280px〜 | ワイドデスクトップ |

**必須チェック:** グリッド列数変化 / フォントサイズ調整 / 画像サイズ / ナビ切替 / スペーシング

## Step 7: SEO実装
- **メタデータ**: `generateMetadata` で title / description / OGP / canonical 設定
- **構造化データ**: JSON-LD（Organization / LocalBusiness / BreadcrumbList）
- **セマンティクスHTML**: `<header>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<nav>`
- **見出し階層**: h1は1ページ1つ、h2〜h4は論理順序
- **画像alt**: 全画像に意味のあるalt（装飾画像は `alt=""`）
- **robots.txt / sitemap.xml**: 静的生成

## Step 8: アクセシビリティ実装
- **キーボード操作**: 全インタラクティブ要素がTab/Enter/Escapeで操作可能
- **ARIA属性**: role / aria-label / aria-expanded / aria-hidden を適切に設定
- **カラーコントラスト**: WCAG AA準拠（通常テキスト 4.5:1 / 大テキスト 3:1）
- **フォーカスインジケーター**: `:focus-visible` で明確なスタイル
- **スキップリンク**: `<a href="#main-content">コンテンツへスキップ</a>`
- **`prefers-reduced-motion`**: globals.css で全アニメーション無効化

## Step 9: Error Boundary 設計
```tsx
// src/app/error.tsx — グローバルエラーバウンダリ
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="...">
      <h2>問題が発生しました</h2>
      <button onClick={reset}>再試行</button>
    </div>
  );
}
// src/app/not-found.tsx — 404ページも必ず作成
```

## Step 10: パフォーマンス予算

| 指標 | 予算 | 対策 |
|------|------|------|
| LCP | < 2.5s | ヒーロー画像に `priority` + 適切な `sizes` |
| FID/INP | < 200ms | 重いJS処理を避ける、`useTransition` 活用 |
| CLS | < 0.1 | 画像に width/height 指定、フォント display:swap |
| Total Bundle | < 200KB (gzip) | dynamic import、tree shaking |
| 画像合計 | < 2MB | AVIF/WebP + 適切なquality + srcset |

**実装時の最適化:**
- `next/image` 必須（生 `<img>` 禁止）、ファーストビュー外は `loading="lazy"`
- `next/dynamic` でモーダル・スライダー等を遅延ロード
- framer-motion は `LazyMotion` + `domAnimation` で軽量化

## Step 11: デプロイ設定
**`next.config.ts`:**
```typescript
const config: NextConfig = {
  images: { formats: ['image/avif', 'image/webp'] },
  experimental: { optimizeCss: true },
};
```
**`vercel.json`（必要時）:** リダイレクト / ヘッダー / リライト設定

ビルド確認: `npm run build` → エラーゼロを確認してからQA Reviewerへ引き渡し

## Iteration 2+ の修正手順
1. `iteration_N.json` の `fix_instructions` を priority順（high→medium→low）にソート
2. 各指示の対象ファイルを開き、`fix_suggestion` に従って修正
3. 修正完了後 `npm run build` で確認

## ビルド品質チェックリスト
- [ ] design-tokens.json準拠（Tailwindデフォルトフォールバックなし）
- [ ] globals.css: CSS変数 + palt + antialiased + reduced-motion
- [ ] プライマリカラー ≠ Tailwindブルー、背景 = オフホワイト、テキスト = ソフトブラック
- [ ] 見出し: 負letter-spacing、font-weight 500-600
- [ ] border-radius 3段階以内、シャドウ多層構成
- [ ] スクロールアニメーション限定的、hover scale(1.05)不使用
- [ ] Error Boundary + 404ページ実装済み
- [ ] 全画像 next/image 使用、alt属性設定済み
- [ ] Lighthouse Performance 90+ 見込みのバンドルサイズ

## 出力フォーマット
`/agents/web_builder/builder/output.json` に保存（tech_stack / pages_built / components_built / build_status / known_limitations を記録）

## 使用するツール
- `Read`: 全 output.json、design-tokens.json、anti-ai-design-guidelines.md
- `Write`: 新規ファイル作成 / `Edit`: 既存修正
- `Bash`: create-next-app, npm install, npm run build

## モーション再現（MOTION_30.md 必須参照）
motion_analyzer の `motion_key` は全て MOTION_30.md から引用。Builder は該当 motion_key のサンプル実装・パラメータ目安に従う。和文B2B案件で該当モーションがない箇所は §6 のモーション + feer motion tokens を補完採用。`motion_key: "custom"` 時は `proposed_motion` に沿い実装し、MOTION_30.md への追加提案を出力に含める。

## 相互干渉（検証を受ける相手）
- **Web Builder / qa_reviewer**: 実装品質・再現度の検証
- **Tech Lead**: アーキテクチャ・コード品質レビュー
- **Infrastructure**: デプロイ設定・パフォーマンス検証
- **QA Engineer**: テスト網羅性・バグ検出
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
