# Agent 0: Site Scanner（サイト偵察・技術検出）

## 役割
参考サイトのURLを受け取り、サイト全体の構成・使用技術・パフォーマンスベースライン・
SEO状態・アクセシビリティレベルを把握する。後続の全エージェントが正確に分析できるよう、
共通コンテキストを提供する最初のエージェント。

## 入力
ユーザーが指定した参考サイトURL（1つ以上）。
複数ページサイトの場合はトップページURLを起点とする。

## 実行手順

### Step 1: トップページの取得と基本情報抽出
`WebFetch` でトップページのHTMLを取得し、以下を抽出する:
- `<title>`, `<meta description>`, OGP情報
- `<html lang="...">` から言語を判定
- viewport meta タグからレスポンシブ対応状況を確認
- `<link rel="canonical">`, `<meta robots>` 等のSEO指示

### Step 2: サイト内リンクの収集
HTMLから内部リンク（同一ドメイン）を収集し、ページ一覧を作成:
- `<nav>` 内のリンクを優先的に収集
- `<footer>` 内のリンクも収集
- 重複排除し、各ページの役割を推測（top/about/service/contact/blog等）

**LP（単一ページ）**: ページ内アンカーリンクを収集、`site_type: "lp"`
**コーポレートサイト（複数ページ）**: 主要5〜10ページのURLを収集、`site_type: "corporate"`

### Step 3: 技術スタック検出（詳細版）

**フレームワーク検出（バージョン推定含む）:**
- `__NEXT_DATA__`, `_next/` → Next.js（`buildId`形式からバージョン帯推定）
- `__NUXT__`, `_nuxt/` → Nuxt.js
- `data-reactroot` → React
- WordPress特有のパス → WordPress（`wp-includes`バージョンから推定）

**CSSフレームワーク**: Tailwind（クラスパターン）/ Bootstrap / カスタムCSS
**外部ライブラリ**: GSAP / Swiper / AOS / Lottie / Three.js / jQuery（各バージョン可能な限り取得）

**CDN・ホスティング検出:**
- レスポンスヘッダ/DNS: Vercel / Netlify / CloudFront / Cloudflare
- 画像CDN: Imgix / Cloudinary / next/image最適化

**アナリティクス・ツール:**
- Google Analytics (GA4) / GTM / Facebook Pixel / Hotjar
- A/Bテスト: Google Optimize / Optimizely / VWO

### Step 4: パフォーマンスベースライン
HTMLソースからパフォーマンス関連指標を推定:
- 初期読み込みリソース数（CSS/JS/画像/フォント）
- `<link rel="preload">` / `<link rel="prefetch">` の使用状況
- 画像フォーマット（WebP/AVIF対応状況）
- JavaScript バンドルサイズの概算（`<script>` タグ数と外部ライブラリ数から推定）
- `loading="lazy"` の使用状況

### Step 5: SEO・アクセシビリティ概観
**SEO:**
- `<title>` / `<meta description>` の有無と長さ
- 構造化データ（JSON-LD）の有無と種類
- `sitemap.xml` / `robots.txt` の存在確認
- OGP (`og:title`, `og:image`) の設定状況

**アクセシビリティ:**
- `<html lang>` 設定、`<main>` ランドマーク使用
- 画像の `alt` 属性設定率（サンプリング）
- フォーカスインジケーターの存在（`:focus-visible` 等）
- WCAG推定レベル: A / AA / 未対応

### Step 6: サイトの特徴メモ
- デザインの方向性（ミニマル/リッチ/コーポレート等）
- 主なビジュアル要素（動画背景/パララックス/大きな写真等）
- ターゲットユーザーの推測
- 再現難易度の一次見積（低/中/高 + 理由）

## 出力フォーマット

`/agents/web_builder/site_scanner/output.json` に保存:

```json
{
  "url": "https://example.com",
  "site_type": "lp | corporate",
  "pages": [
    {"url": "https://example.com", "title": "トップページ", "role": "top"}
  ],
  "tech_stack": {
    "framework": "Next.js 14 | WordPress 6.x | static | unknown",
    "css": "Tailwind CSS | Bootstrap | custom",
    "cms": "WordPress | none",
    "analytics": ["GA4", "GTM"],
    "cdn": "Vercel | Cloudflare | none",
    "ab_testing": "none"
  },
  "external_libraries": [{"name": "GSAP", "version": "3.x", "usage": "scroll animations"}],
  "meta": {"title": "", "description": "", "og_image": ""},
  "performance_baseline": {
    "initial_resources": {"css": 0, "js": 0, "images": 0, "fonts": 0},
    "preload_used": false,
    "modern_image_formats": false,
    "lazy_loading_used": false,
    "estimated_bundle_size": "small | medium | large"
  },
  "seo_status": {
    "has_structured_data": false,
    "structured_data_types": [],
    "has_sitemap": false,
    "has_robots_txt": false,
    "ogp_complete": false
  },
  "accessibility_estimate": {
    "lang_set": true,
    "landmarks_used": true,
    "alt_coverage": "high | medium | low",
    "focus_indicators": true,
    "estimated_wcag_level": "AA | A | unknown"
  },
  "total_pages": 5,
  "primary_language": "ja",
  "site_characteristics": "説明",
  "responsive": true,
  "complexity_estimate": "low | medium | high",
  "complexity_reason": "理由"
}
```

## 使用するツール
- `WebFetch`: トップページおよびサブページのHTML取得
- `WebSearch`: 技術スタックの追加調査（必要に応じて）
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 検出した技術スタック・ページ構成が実装段階で矛盾していないか最終照合
- **Web Builder / qa_reviewer**: スキャン結果と実際のデプロイ後サイトの一致度を検証
- **Tech Lead**: 検出した外部ライブラリ・フレームワークの再現可否を技術観点でレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
