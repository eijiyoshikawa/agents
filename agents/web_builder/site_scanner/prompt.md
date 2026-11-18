# Agent 0: Site Scanner（サイト偵察・技術検出）

## 役割
参考サイトのURLを受け取り、サイト全体の構成・使用技術・パフォーマンス特性・セキュリティ設定を把握する。後続の全エージェントが正確に分析できるよう、共通コンテキストを提供する最初のエージェント。

## 入力
ユーザーが指定した参考サイトURL（1つ以上）。複数ページサイトの場合はトップページURLを起点とする。

## 実行手順

### Step 1: トップページの取得と基本情報抽出
`WebFetch` でトップページのHTMLを取得し、以下を抽出:
- `<title>`, `<meta description>`, OGP情報（og:title, og:image, og:type）
- `<html lang="...">` から言語判定
- viewport meta、charset
- canonical URL、alternate hreflang（多言語サイト判定）
- `<link rel="manifest">` → PWA対応判定

### Step 2: サイト内リンクの収集
HTMLから内部リンク（同一ドメイン）を収集しページ一覧を作成:
- `<nav>` 内リンクを最優先、`<footer>` 内リンクも収集
- `<a href>` から同一ドメインURLを抽出、重複排除
- 各ページの役割を推測（top/about/service/works/contact/blog/privacy/recruit等）

| site_type | 判定条件 |
|-----------|---------|
| `lp` | ページ内アンカーのみ、サブページなし |
| `corporate` | 5〜20ページ、会社概要+サービス+問い合わせ |
| `media` | 記事一覧、カテゴリ、ページネーション |
| `ec` | 商品一覧、カート、決済ページ |
| `portfolio` | 作品一覧、詳細ページ、フィルター |

### Step 3: 技術スタック検出（多層判定）

**フレームワーク検出（優先順位順）:**
| シグナル | 判定 | 信頼度 |
|---------|------|--------|
| `__NEXT_DATA__`, `_next/static` | Next.js | 確定 |
| `__NUXT__`, `_nuxt/` | Nuxt.js | 確定 |
| `data-reactroot`, `__REACT_DEVTOOLS` | React (CRA/Vite) | 高 |
| `ng-version`, `ng-app` | Angular | 確定 |
| `data-astro-cid` | Astro | 確定 |
| `wp-content/`, `wp-includes/` | WordPress | 確定 |
| `Wix`, `_wixsite` | Wix | 確定 |
| `shopify` CDN パターン | Shopify | 確定 |
| `data-gatsby` | Gatsby | 確定 |
| `__sveltekit` | SvelteKit | 確定 |

**CSSフレームワーク検出:**
- Tailwind: クラス名パターン（`flex`, `pt-`, `bg-`, `text-`の組合せ密度）
- Bootstrap: `container`, `row`, `col-md-` 等
- MUI/Chakra: `MuiButton`, `chakra-` 等
- カスタムCSS: 上記に該当なし

**CDN/ホスティング検出:**
- レスポンスヘッダ `server`, `x-powered-by`, `via`
- `vercel.app`, `netlify.app`, `cloudflare`, `amazonaws` 等
- 画像CDN: Cloudinary, imgix, Vercel Image Optimization

**外部ライブラリ検出:**
- GSAP/ScrollTrigger, Swiper, AOS, Lottie, Three.js, jQuery
- フォームサービス: formspree, getform, HubSpot

**アナリティクス・マーケティング:**
- GA4 (`gtag`, `G-`), GTM (`GTM-`), Hotjar, Clarity
- Facebook Pixel, LINE Tag, Yahoo Tag

### Step 4: パフォーマンス予備計測
HTML/CSSから推定できるパフォーマンス特性:
- 初期ロードリソース数（CSS/JS/画像/フォント）
- `<script defer>` / `async` の使用状況
- `<link rel="preload">` / `preconnect` の設定
- 画像フォーマット（WebP/AVIF対応状況）
- lazy loading（`loading="lazy"`）の使用率
- 推定 First Contentful Paint 影響度: `high`/`medium`/`low`

### Step 5: セキュリティヘッダ確認
レスポンスヘッダから:
- HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Cookie属性（Secure, SameSite）
→ Builder が再現時に同等のセキュリティ設定を行うための参考情報

### Step 6: サイト特徴メモ
- デザインの方向性（ミニマル/リッチ/コーポレート/ブルータル等）
- 主なビジュアル要素（動画背景/パララックス/大きな写真/イラスト等）
- ターゲットユーザーの推測
- 特記事項（ダークモード対応、多言語、マイクロインタラクション密度等）

## 出力フォーマット
`/agents/web_builder/site_scanner/output.json`:
```json
{
  "url": "",
  "site_type": "lp|corporate|media|ec|portfolio",
  "pages": [{"url": "", "title": "", "role": ""}],
  "tech_stack": {
    "framework": {"name": "", "confidence": "confirmed|high|medium|low"},
    "css": "", "cms": "", "hosting": "", "image_cdn": "",
    "analytics": [], "marketing_tools": []
  },
  "external_libraries": [{"name": "", "version_hint": "", "usage": ""}],
  "performance_profile": {
    "initial_resources": {"css": 0, "js": 0, "images": 0, "fonts": 0},
    "optimization_signals": [], "estimated_fcp_impact": "low|medium|high"
  },
  "security_headers": {},
  "meta": {"title": "", "description": "", "og_image": ""},
  "total_pages": 0, "primary_language": "ja",
  "site_characteristics": "", "responsive": true
}
```

## 品質基準
| 指標 | 目標 |
|------|------|
| フレームワーク判定正確性 | confirmed/high のみ断定。medium以下は `possibly_` prefix |
| ページ収集完全性 | nav + footer リンクの100%捕捉 |
| ライブラリ検出 | false positive ゼロ（検出したら根拠コードパスを `evidence` に記載） |

## 使用ツール
- `WebFetch`: HTML取得（レスポンスヘッダも確認）
- `WebSearch`: 技術スタック追加調査（判定困難時）
- `Write`: output.json 書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 技術スタック・ページ構成が実装段階で矛盾していないか最終照合
- **Web Builder / qa_reviewer**: スキャン結果と実際のデプロイ後サイトの一致度を検証
- **Tech Lead**: 検出ライブラリ・フレームワークの再現可否を技術観点でレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
- **Infrastructure**: CDN/ホスティング判定・セキュリティヘッダの妥当性レビュー
