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

### Step 3.5: 技術検出の深化

#### CDN / ホスティング判定
HTTPレスポンスヘッダおよびHTMLソースから配信基盤を特定する:

| 判定対象 | 検出パターン |
|---------|-------------|
| **Vercel** | `x-vercel-id` ヘッダ、`_vercel/` パス、`.vercel.app` ドメイン |
| **Cloudflare** | `cf-ray` ヘッダ、`cf-cache-status`、`cdnjs.cloudflare.com` 参照 |
| **Fastly** | `x-served-by` ヘッダに `cache-` プレフィックス、`fastly` 文字列 |
| **AWS CloudFront** | `x-amz-cf-id` ヘッダ、`.cloudfront.net` ドメイン |
| **Netlify** | `x-nf-request-id` ヘッダ、`.netlify.app` ドメイン |
| **Firebase** | `.web.app` / `.firebaseapp.com` ドメイン |

#### フレームワーク検出の精緻化
基本検出に加え、バージョン情報と詳細な判別指標を収集する:

| フレームワーク | 追加検出指標 |
|--------------|-------------|
| **Next.js** | `buildId` の存在、`_next/static/chunks/` のファイル構成、App Router vs Pages Router 判定（`__next_f` 属性 → App Router） |
| **Nuxt.js** | `_nuxt/` 配下のファイル構成、Nuxt 2 vs 3 判定（`_payload.json` → Nuxt 3） |
| **Gatsby** | `___gatsby` id、`page-data/` ディレクトリ、`/static/` パス |
| **Remix** | `__remix` 属性、`/build/` パス |
| **Astro** | `astro-island` カスタム要素、`/_astro/` パス |
| **SvelteKit** | `__sveltekit/` パス、`.svelte-kit` |

#### CMS検出
静的サイト・ヘッドレスCMS の併用パターンも含めて判定する:

| CMS | 検出パターン |
|-----|-------------|
| **WordPress** | `wp-content/`、`wp-includes/`、`wp-json/` API、`generator` meta |
| **Strapi** | `/api/` エンドポイント構造、`strapi` 参照 |
| **Contentful** | `contentful` 参照、`cdn.contentful.com` |
| **microCMS** | `microcms` 参照、`.microcms.io` ドメイン |
| **Newt** | `newt` 参照、`.newt.so` ドメイン |
| **Shopify** | `cdn.shopify.com`、`Shopify.theme` JS オブジェクト |

### Step 4: パフォーマンスベースライン計測

参考サイトのパフォーマンス水準を事前に把握し、Builder / QA Reviewer が目標とするベースラインを設定する。

#### 計測項目
以下の指標をHTMLソースとリソース構成から推定する（Lighthouse 実行が不可能な環境では推定値で記録）:

| 指標 | 推定方法 | 目標設定基準 |
|------|---------|-------------|
| **First Contentful Paint (FCP)** | リソース数・サイズ・外部依存から推定 | 参考サイト同等以下 |
| **Largest Contentful Paint (LCP)** | ヒーロー画像サイズ・遅延読込の有無から推定 | 2.5秒以下 |
| **Total Blocking Time (TBT)** | JS バンドルサイズ・サードパーティスクリプト数から推定 | 200ms以下 |
| **Cumulative Layout Shift (CLS)** | 画像の width/height 属性有無、フォント読込方式から推定 | 0.1以下 |

#### リソースサイズの概算
- HTML ファイルサイズ
- CSS 合計サイズ（外部 + インライン）
- JS 合計サイズ（ファーストパーティ + サードパーティ）
- 画像合計サイズ（推定）
- フォントファイル数・推定サイズ

#### パフォーマンス目標の設定
```json
{
  "performance_baseline": {
    "estimated_scores": {
      "performance": 85,
      "accessibility": 90,
      "best_practices": 90,
      "seo": 95
    },
    "target_scores": {
      "performance": 90,
      "accessibility": 95,
      "best_practices": 95,
      "seo": 95
    },
    "target_rationale": "参考サイトより高いスコアを目標。特にアクセシビリティはWCAG 2.1 AA準拠を必須とする"
  }
}
```

### Step 5: ページ構成の完全マッピング

#### サイトマップの自動生成
収集したページ一覧から、階層構造を持つサイトマップを生成する:

```json
{
  "sitemap": {
    "tree": {
      "/": {
        "title": "トップページ",
        "children": {
          "/about": {"title": "会社概要", "children": {}},
          "/service": {
            "title": "サービス",
            "children": {
              "/service/consulting": {"title": "コンサルティング"},
              "/service/development": {"title": "開発支援"}
            }
          },
          "/blog": {"title": "ブログ", "children": {}},
          "/contact": {"title": "お問い合わせ", "children": {}}
        }
      }
    },
    "depth": 3,
    "total_pages": 8
  }
}
```

#### リンク構造の可視化
ページ間の相互リンク関係を隣接リストで記録し、孤立ページやリンク切れの有無を把握する:

```json
{
  "link_graph": {
    "nodes": ["/", "/about", "/service", "/contact"],
    "edges": [
      {"from": "/", "to": "/about", "context": "nav"},
      {"from": "/", "to": "/service", "context": "nav"},
      {"from": "/", "to": "/contact", "context": "nav + CTA"},
      {"from": "/about", "to": "/contact", "context": "CTA"},
      {"from": "/service", "to": "/contact", "context": "CTA"}
    ],
    "orphan_pages": [],
    "hub_pages": ["/"]
  }
}
```

### Step 6: サイトの特徴メモ
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
    "framework_version": "15.x（推定）",
    "framework_detail": "App Router",
    "css": "Tailwind CSS | Bootstrap | custom",
    "cms": "WordPress | Strapi | microCMS | none",
    "analytics": "Google Analytics | GTM | none",
    "cdn": "Vercel | Cloudflare | Fastly | AWS CloudFront | unknown"
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
  "responsive": true,
  "performance_baseline": {
    "estimated_scores": {
      "performance": 85,
      "accessibility": 90,
      "best_practices": 90,
      "seo": 95
    },
    "target_scores": {
      "performance": 90,
      "accessibility": 95,
      "best_practices": 95,
      "seo": 95
    },
    "resource_summary": {
      "html_size_kb": 45,
      "css_total_kb": 120,
      "js_total_kb": 350,
      "image_count": 15,
      "font_count": 3
    }
  },
  "sitemap": {
    "tree": {},
    "depth": 2,
    "total_pages": 5
  },
  "link_graph": {
    "nodes": [],
    "edges": [],
    "orphan_pages": [],
    "hub_pages": ["/"]
  }
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
