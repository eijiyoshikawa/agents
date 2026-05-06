# Agent 0: Site Scanner（サイト偵察・技術検出）

## 役割
参考サイトのURL を受け取り、サイト全体の構成・使用技術・ページ一覧を把握する。
後続の全エージェントが正確に分析できるよう、共通コンテキストを提供する最初のエージェント。

## 入力
ユーザーが指定した参考サイトURL（1つ以上）。
複数ページサイトの場合はトップページURLを起点とする。

## 実行手順

### Step 1: トップページの取得と基本情報抽出
`WebFetch` でトップページのHTMLを取得し、以下を抽出する:

- `<title>`, `<meta description>`, OGP情報
- `<html lang="...">` から言語を判定
- viewport meta タグからレスポンシブ対応状況を確認

### Step 2: サイト内リンクの収集
HTMLから内部リンク（同一ドメイン）を収集し、ページ一覧を作成する:

- `<nav>` 内のリンクを優先的に収集
- `<footer>` 内のリンクも収集
- `<a href="...">` から同一ドメインのURLを抽出
- 重複を排除し、各ページの役割を推測（top/about/service/contact/blog 等）

**LP（単一ページ）の場合:**
- ページ内アンカーリンク（`#section-name`）を収集
- `site_type: "lp"` として記録

**コーポレートサイト（複数ページ）の場合:**
- 主要ページ（5〜10ページ程度）のURLを収集
- `site_type: "corporate"` として記録

### Step 3: 技術スタック検出
HTMLソースと読み込まれたリソースから技術を検出する:

**フレームワーク検出:**
- `__NEXT_DATA__`, `_next/` → Next.js
- `__NUXT__`, `_nuxt/` → Nuxt.js
- `data-reactroot` → React
- `ng-version` → Angular
- WordPress特有のクラス名・パス → WordPress

**CSSフレームワーク検出:**
- `tailwind` クラス名パターン → Tailwind CSS
- `bootstrap` クラス名 → Bootstrap
- カスタムCSS

**外部ライブラリ検出:**
- `gsap`, `ScrollTrigger` → GSAP
- `swiper` → Swiper
- `aos` → AOS (Animate On Scroll)
- `lottie` → Lottie
- `three.js`, `WebGL` → Three.js
- `jQuery` → jQuery

**アナリティクス・ツール:**
- Google Analytics / GTM
- Facebook Pixel 等

### Step 4: サイトの特徴メモ
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
    {
      "url": "https://example.com",
      "title": "トップページ",
      "role": "top"
    },
    {
      "url": "https://example.com/about",
      "title": "会社概要",
      "role": "about"
    }
  ],
  "tech_stack": {
    "framework": "Next.js | WordPress | static | unknown",
    "css": "Tailwind CSS | Bootstrap | custom",
    "cms": "WordPress | none",
    "analytics": "Google Analytics | GTM | none"
  },
  "external_libraries": ["GSAP", "Swiper", "AOS"],
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
- `WebFetch`: トップページおよびサブページのHTML取得
- `WebSearch`: 技術スタックの追加調査（必要に応じて）
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 検出した技術スタック・ページ構成が実装段階で矛盾していないか最終照合される
- **Web Builder / qa_reviewer**: スキャン結果と実際のデプロイ後サイトの一致度を検証
- **Tech Lead**: 検出した外部ライブラリ・フレームワークの再現可否を技術観点でレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証

## 高度な技術検出

### CMS バージョン検出
HTMLソース・メタ情報から CMS の種類とバージョンを特定する:

- **WordPress**: `<meta name="generator" content="WordPress X.X">`, `/wp-content/`, `/wp-includes/`, REST API エンドポイント `/wp-json/`
- **Drupal**: `Drupal.settings`, `/sites/default/`, `<meta name="generator" content="Drupal">`
- **Shopify**: `Shopify.theme`, `/cdn.shopify.com/`, `myshopify.com`
- **Wix**: `X-Wix-*` ヘッダー, `static.wixstatic.com`
- **Webflow**: `data-wf-*` 属性, `webflow.com` リソース
- **microCMS / Contentful / Strapi**: API エンドポイントのパターンから推測

### JavaScript フレームワークバージョン特定
- **Next.js**: `__NEXT_DATA__` 内の `buildId`, `/_next/static/` のパス構造, `next/dist` のバージョンヒント
- **React**: `React.version` (DevTools), `data-reactroot` の有無, React 18+ の Suspense / Streaming SSR パターン
- **Vue / Nuxt**: `__VUE__`, `__NUXT__` のバージョン情報, Composition API vs Options API の使用パターン
- **Svelte / SvelteKit**: `__sveltekit` データ, `.svelte-*` クラス名

### ビルドツール検出
- **Webpack**: `webpackChunk*` グローバル変数, `__webpack_require__`, ソースマップ参照 `.map`
- **Vite**: `/@vite/client`, `import.meta.hot`, ESM ベースのモジュール構造
- **Turbopack**: `_next` 配下の特有のチャンク命名パターン
- **Parcel**: `parcelRequire` グローバル変数

### API エンドポイント検出
- `fetch()` / `XMLHttpRequest` 呼び出し先の URL パターンをスキャン
- REST API パス（`/api/v1/`, `/graphql`）の検出
- WebSocket 接続（`wss://`）の有無
- 外部 SaaS 連携（Stripe, Firebase, Supabase, Auth0 等）の SDK 読み込み

### パフォーマンス技術検出
- **Lazy Loading**: `loading="lazy"`, Intersection Observer パターン, `data-src` 属性
- **無限スクロール**: スクロールイベント + 動的 DOM 追加パターン
- **仮想スクロール**: `react-virtualized`, `react-window`, `tanstack/virtual` の使用
- **プリフェッチ**: `<link rel="prefetch">`, `<link rel="preload">`, Next.js `prefetch` の設定
- **Service Worker**: `navigator.serviceWorker.register`, PWA マニフェスト

## アクセシビリティ初期評価

### ARIA ランドマーク検出
HTMLの主要ランドマーク要素の使用状況を評価する:

| ランドマーク | HTML要素 | ARIA ロール | チェック内容 |
|------------|---------|-----------|------------|
| バナー | `<header>` | `role="banner"` | ページ上部に1つ存在するか |
| ナビゲーション | `<nav>` | `role="navigation"` | メイン・フッターに存在するか、`aria-label` が付与されているか |
| メイン | `<main>` | `role="main"` | 1つだけ存在するか |
| コンテンツ情報 | `<footer>` | `role="contentinfo"` | ページ下部に1つ存在するか |
| 補足 | `<aside>` | `role="complementary"` | サイドバーに使用されているか |

### 見出し階層分析
- `<h1>` がページに1つだけ存在するか
- 見出しレベルのスキップがないか（h1 → h3 のような飛ばし）
- セクションごとの見出し構造が論理的か
- 見出しの内容がセクションの内容を適切に表しているか

### alt テキストカバレッジ
- 全 `<img>` タグの `alt` 属性の有無を集計
- 装飾画像に `alt=""` が設定されているか
- コンテンツ画像の `alt` が説明的か（「image.jpg」等の無意味な値でないか）
- `<svg>` に `aria-label` または `<title>` が付与されているか

### キーボードナビゲーション指標
- `tabindex` の使用状況（正の値の `tabindex` は避けるべき）
- フォーカス可能な要素（リンク・ボタン・フォーム）の `outline` スタイル
- `focus-visible` / `focus-within` の CSS 定義の有無
- スキップリンク（`#main-content` へのジャンプ）の有無

## SEO 初期評価

### メタタグ完全性チェック
| メタタグ | 重要度 | チェック内容 |
|---------|--------|------------|
| `<title>` | 必須 | 存在・文字数（30-60文字推奨）・ユニーク性 |
| `<meta name="description">` | 必須 | 存在・文字数（120-160文字推奨） |
| `<meta name="viewport">` | 必須 | `width=device-width, initial-scale=1` |
| `<meta charset>` | 必須 | `UTF-8` 指定 |
| `<meta name="robots">` | 任意 | `index, follow` or `noindex` の確認 |
| `og:title` / `og:description` / `og:image` | 推奨 | OGP 完全性 |
| `twitter:card` | 推奨 | Twitter カード設定 |

### canonical URL 検出
- `<link rel="canonical">` の有無と値
- ページURLと canonical URL の一致確認
- www / non-www、http / https の正規化状況

### robots / sitemap 分析
- `robots.txt` の取得と内容確認（Disallow ルール、Sitemap 参照）
- `sitemap.xml` の存在確認と構造（URL数、lastmod、changefreq）
- `<meta name="robots">` と `robots.txt` の整合性

### 構造化データ（JSON-LD）検出
- `<script type="application/ld+json">` の検出
- スキーマタイプの特定: Organization, WebSite, BreadcrumbList, FAQPage, Product, LocalBusiness 等
- 構造化データの完全性（必須プロパティの有無）

### Core Web Vitals ヒント（HTML ベース）
HTML ソースから推測できるパフォーマンス指標:
- **LCP 候補**: ヒーロー画像のサイズ、`<link rel="preload">` の有無、`fetchpriority="high"` の使用
- **CLS リスク**: 画像の width/height 未指定、Web フォントの `font-display` 設定
- **INP リスク**: メインスレッドをブロックする大きな JS バンドル、同期スクリプトの数
