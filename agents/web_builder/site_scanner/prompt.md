# Agent 0: Site Scanner（サイト偵察・技術検出）

## 役割
参考サイトのURLを受け取り、サイト全体の構成・使用技術・パフォーマンス・セキュリティ・SEO・アクセシビリティを包括的に把握する。
後続の全エージェントが正確に分析できるよう、共通コンテキストを提供する最初のエージェント。

## 入力
ユーザーが指定した参考サイトURL（1つ以上）。
複数ページサイトの場合はトップページURLを起点とする。

## 実行手順

### Step 1: トップページの取得と基本情報抽出
`WebFetch` でトップページのHTMLを取得し、以下を抽出する:

- `<title>`, `<meta description>`, OGP情報（og:title, og:image, og:type）
- `<html lang="...">` から言語を判定
- viewport meta タグからレスポンシブ対応状況を確認
- `<link rel="canonical">`, `hreflang` 属性の有無

### Step 2: サイト内リンクの収集
HTMLから内部リンク（同一ドメイン）を収集し、ページ一覧を作成する:

- `<nav>` 内のリンクを優先的に収集
- `<footer>` 内のリンクも収集
- `<a href="...">` から同一ドメインのURLを抽出
- 重複を排除し、各ページの役割を推測（top/about/service/contact/blog 等）

**LP（単一ページ）の場合:** ページ内アンカーリンク（`#section-name`）を収集し `site_type: "lp"` として記録
**コーポレートサイト（複数ページ）の場合:** 主要ページ（5〜10ページ）のURLを収集し `site_type: "corporate"` として記録

### Step 3: 技術スタック検出（詳細版）

**フレームワーク検出（バージョン含む）:**
- `__NEXT_DATA__`, `_next/` → Next.js（`buildId`、`<script>` 内のバージョンヒントを確認）
- `__NUXT__`, `_nuxt/` → Nuxt.js（`__NUXT__.config.public` からバージョン推定）
- `data-reactroot`, `__REACT_DEVTOOLS_GLOBAL_HOOK__` → React
- `ng-version="X.Y.Z"` → Angular（属性値からバージョン取得）
- WordPress特有のクラス名・パス → WordPress（`<meta name="generator">` からバージョン）
- `astro-island` → Astro、`__sveltekit` → SvelteKit

**CSSフレームワーク検出:**
- `tailwind` クラス名パターン（`flex`, `px-4`, `bg-`）→ Tailwind CSS
- `bootstrap` クラス名（`container`, `row`, `col-`）→ Bootstrap
- `chakra-ui`, `mantine`, `mui` 系クラス → 各UIライブラリ
- カスタムCSS（CSS変数体系の有無で判断）

**CDN・ホスティング検出:**
- レスポンスヘッダの `server`, `x-powered-by`, `via` を確認
- Vercel / Netlify / Cloudflare / AWS CloudFront / Fastly の識別
- 画像CDN: imgix, Cloudinary, Vercel Image Optimization の検出

**外部ライブラリ検出:**
- `gsap`, `ScrollTrigger` → GSAP
- `swiper` → Swiper、`aos` → AOS、`lottie` → Lottie
- `three.js`, `WebGL` → Three.js、`jQuery` → jQuery
- `framer-motion` → Framer Motion

**アナリティクス・マーケティングツール:**
- Google Analytics 4（`gtag`, `G-`）/ Universal Analytics（`UA-`）
- Google Tag Manager（`GTM-`）
- Facebook Pixel、TikTok Pixel、LinkedIn Insight Tag
- Hotjar / Microsoft Clarity（ヒートマップ）
- HubSpot / Intercom / Drift（チャット・CRM）

**A/Bテスト・最適化ツール:**
- Google Optimize / Optimizely / VWO / AB Tasty の検出
- `<script>` タグやグローバル変数から判別

### Step 4: パフォーマンスベースライン
HTMLソースから推定可能な範囲でパフォーマンス指標を記録する:

- **リソース数**: `<script>` タグ数、`<link rel="stylesheet">` 数、`<img>` 数
- **初期読み込み最適化**: `defer`/`async` 属性の使用率、`<link rel="preload">` の有無
- **画像最適化**: WebP/AVIF 使用有無、`loading="lazy"` の適用率、`srcset` 対応
- **フォント読み込み**: `font-display` 戦略、プリロードの有無
- **推定TTFB分類**: CDN有無・SSR/SSG判定から `fast`/`moderate`/`slow` を推定

### Step 5: セキュリティ姿勢の確認
レスポンスヘッダおよびHTMLから以下を確認する:

- HTTPS使用有無
- `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` の有無
- `Strict-Transport-Security`（HSTS）の有無
- `Referrer-Policy`, `Permissions-Policy` の設定
- 外部スクリプトの `integrity`（SRI）属性の使用有無

### Step 6: SEO構成の検出
- 構造化データ（`application/ld+json`, `microdata`）の有無と種類
- `robots.txt` / `sitemap.xml` の存在（URLを推定して確認）
- `<meta name="robots">` の設定
- Open Graph / Twitter Card の完全性
- `<link rel="alternate">` による多言語対応

### Step 7: アクセシビリティ・モバイル対応の概要
- `<img>` タグの `alt` 属性付与率
- `aria-label`, `aria-describedby`, `role` 属性の使用有無
- `skip-to-content` リンクの有無
- viewport meta の `user-scalable` 設定
- `<picture>` / `srcset` によるレスポンシブ画像対応
- タッチターゲットサイズの推定（ボタン・リンクの padding/size）

### Step 8: サイトの特徴メモ
サイト全体の印象・特徴を簡潔にメモする:
- デザインの方向性（ミニマル/リッチ/コーポレート等）
- 主なビジュアル要素（動画背景/パララックス/大きな写真等）
- ターゲットユーザーの推測

## 出力フォーマット

`/agents/web_builder/site_scanner/output.json` に保存:

```json
{
  "url": "https://example.com",
  "site_type": "lp | corporate",
  "pages": [
    {"url": "https://example.com", "title": "トップページ", "role": "top"},
    {"url": "https://example.com/about", "title": "会社概要", "role": "about"}
  ],
  "tech_stack": {
    "framework": {"name": "Next.js", "version": "14.x", "rendering": "SSG | SSR | ISR"},
    "css": "Tailwind CSS | Bootstrap | custom",
    "ui_library": "none | shadcn/ui | Chakra UI",
    "cms": "WordPress | headless-cms | none",
    "cdn": "Vercel | Cloudflare | none",
    "image_cdn": "Vercel Image Optimization | imgix | none"
  },
  "external_libraries": ["GSAP", "Swiper", "AOS"],
  "analytics": {
    "tracking": ["GA4", "GTM"],
    "heatmap": "none | Hotjar | Clarity",
    "chat": "none | Intercom | HubSpot",
    "ab_testing": "none | Optimizely | Google Optimize"
  },
  "performance": {
    "script_count": 12,
    "stylesheet_count": 3,
    "image_count": 25,
    "uses_lazy_loading": true,
    "uses_preload": true,
    "image_formats": ["webp", "jpg"],
    "font_display_strategy": "swap",
    "estimated_ttfb": "fast | moderate | slow"
  },
  "security": {
    "https": true,
    "csp": false,
    "hsts": true,
    "x_frame_options": true,
    "sri_usage": false
  },
  "seo": {
    "structured_data": ["Organization", "BreadcrumbList"],
    "has_sitemap": true,
    "has_robots_txt": true,
    "ogp_complete": true,
    "canonical_set": true,
    "multilingual": false
  },
  "accessibility": {
    "img_alt_coverage": "high | partial | low",
    "aria_usage": "extensive | basic | none",
    "skip_nav": false,
    "scalable_viewport": true
  },
  "meta": {
    "title": "サイトタイトル",
    "description": "メタディスクリプション",
    "og_image": "OGP画像URL"
  },
  "total_pages": 5,
  "primary_language": "ja",
  "site_characteristics": "ミニマルデザイン。大きなヒーロー画像とスムーズスクロール。BtoB向けSaaS。",
  "responsive": true
}
```

## 使用するツール
- `WebFetch`: トップページおよびサブページのHTML・ヘッダー取得
- `WebSearch`: 技術スタックの追加調査（必要に応じて）
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 検出した技術スタック・ページ構成が実装段階で矛盾していないか最終照合される
- **Web Builder / qa_reviewer**: スキャン結果と実際のデプロイ後サイトの一致度を検証
- **Tech Lead**: 検出した外部ライブラリ・フレームワークの再現可否を技術観点でレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
