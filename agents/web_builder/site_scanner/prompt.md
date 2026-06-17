# Agent 0: Site Scanner（サイト偵察・技術検出）

## 役割
参考サイトのURL を受け取り、サイト全体の構成・使用技術・ページ一覧・パフォーマンス指標・
SEOメタデータ・アクセシビリティ概況・サードパーティ連携・コンテンツ規模を把握する。
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

### Step 4: サードパーティ連携検出
HTML内のスクリプトタグ・iframe・埋め込みコードからサードパーティツールを検出する:

**アナリティクス・計測:**
- Google Analytics (`gtag.js`, `analytics.js`) / GTM (`googletagmanager.com`)
- Facebook Pixel (`fbevents.js`) / Meta Conversions API
- Hotjar / Microsoft Clarity / Plausible / Matomo

**チャット・カスタマーサポート:**
- Intercom / Zendesk / HubSpot Chat / Drift / Crisp / チャネルトーク

**CRM・MA連携:**
- HubSpot / Salesforce (`pardot`) / Marketo / Zoho

**その他の外部サービス:**
- Google Maps 埋め込み / YouTube 埋め込み / Vimeo
- フォームサービス（Typeform / Google Forms / formrun）
- 決済（Stripe.js / PayPal / Square）
- SNSウィジェット（Twitter埋め込み / Instagram Feed）

### Step 5: SEOメタデータ抽出
検索エンジン・ソーシャル向けのメタ情報を網羅的に取得する:

- `<link rel="canonical">` の有無とURL
- `<link rel="alternate" hreflang="...">` の有無と対応言語
- 構造化データ: `<script type="application/ld+json">` の内容（Organization / BreadcrumbList / FAQ / Product 等のスキーマタイプを記録）
- `robots` メタタグ / `X-Robots-Tag` の指定
- `sitemap.xml` の存在確認（URLに `/sitemap.xml` を付与して `WebFetch`）

### Step 6: パフォーマンスベースライン取得
PageSpeed Insights API（公開エンドポイント）を利用してLighthouseスコアを取得する:

```
WebFetch: https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={対象URL}&category=performance&category=accessibility&category=seo&strategy=mobile
```

取得するスコア（0〜100）:
- **Performance**: FCP / LCP / TBT / CLS / Speed Index
- **Accessibility**: Lighthouseアクセシビリティスコア
- **SEO**: Lighthouse SEOスコア

APIエラー時は `"lighthouse": null` とし、後続処理をブロックしない。

### Step 7: アクセシビリティ概況
HTMLソースから以下のアクセシビリティ対応状況を確認する:

- `<img>` の `alt` 属性付与率（全画像数に対する割合）
- `<html lang="...">` の指定有無（Step 1 で取得済み）
- ARIAランドマーク（`role="navigation"` / `role="main"` 等、またはセマンティックHTML5要素）の使用状況
- キーボードナビゲーション手がかり: `tabindex` / `aria-label` / `skip-link` の有無
- カラーコントラスト: 主要テキスト色と背景色の組み合わせを記録（詳細検証は design_analyzer に委譲）

### Step 8: コンテンツインベントリ
各ページのコンテンツ規模を概算する:

- **テキスト量**: `<body>` 内の可視テキストの概算文字数（ナビ・フッター除く）
- **画像数**: `<img>` タグ + CSS `background-image` の総数
- **動画有無**: `<video>` タグ / YouTube・Vimeo iframe の有無
- **フォーム数**: `<form>` タグの数と種類（問い合わせ / 検索 / ログイン等）
- **CTAボタン数**: 主要なアクションボタンの数

### Step 9: サイトの特徴メモ
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
    "framework": "Next.js | WordPress | static | unknown",
    "css": "Tailwind CSS | Bootstrap | custom",
    "cms": "WordPress | none"
  },
  "external_libraries": ["GSAP", "Swiper", "AOS"],
  "third_party": {
    "analytics": ["Google Analytics", "GTM"],
    "chat": ["Intercom"],
    "crm": [],
    "forms": ["formrun"],
    "payment": [],
    "maps_embed": true,
    "video_embed": ["YouTube"],
    "sns_widgets": [],
    "other": []
  },
  "seo": {
    "canonical": "https://example.com",
    "hreflang": [{"lang": "ja", "url": "https://example.com"}],
    "structured_data": ["Organization", "BreadcrumbList"],
    "robots": "index, follow",
    "sitemap_exists": true
  },
  "lighthouse": {
    "performance": 85, "accessibility": 92, "seo": 98,
    "metrics": {"fcp_ms": 1200, "lcp_ms": 2500, "tbt_ms": 150, "cls": 0.05, "speed_index_ms": 2000}
  },
  "accessibility_overview": {
    "img_alt_coverage": "90%", "lang_attribute": true,
    "aria_landmarks": true, "skip_link": false,
    "notes": "ほぼセマンティックHTML。一部装飾画像にalt欠落"
  },
  "content_inventory": {
    "estimated_text_chars": 12000, "image_count": 25, "has_video": true,
    "form_count": 2, "form_types": ["contact", "newsletter"], "cta_count": 6
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
- `WebFetch`: トップページ・サブページのHTML取得、PageSpeed Insights API呼び出し、sitemap.xml確認
- `WebSearch`: 技術スタックの追加調査（必要に応じて）
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 検出した技術スタック・ページ構成が実装段階で矛盾していないか最終照合される
- **Web Builder / qa_reviewer**: スキャン結果と実際のデプロイ後サイトの一致度を検証
- **Web Builder / design_analyzer**: Lighthouseアクセシビリティスコアとカラーコントラスト所見を照合
- **Tech Lead**: 検出した外部ライブラリ・フレームワーク・サードパーティ連携の再現可否を技術観点でレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
