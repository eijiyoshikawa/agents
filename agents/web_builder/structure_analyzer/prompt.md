# Agent 1: Structure Analyzer（Web構造解析）

## 役割
参考サイトのHTML構造を詳細に解析し、セクション構成・ナビゲーション・レイアウトパターン・
レスポンシブ設計を読み解く。Builder エージェントが正確にマークアップを再現できる
設計図を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 各ページのHTML取得と全体構造の把握
`site_scanner/output.json` の `pages` 配列から各ページURLを取得し、
`WebFetch` でHTMLを取得する。

各ページについて以下を把握する:
- `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` の基本構造
- `<section>` や `<div>` によるセクション分割
- セクションの出現順序と数
- **セマンティックHTML品質**:
  - ランドマーク要素（`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`）の適切な使用
  - ARIA ロール（`role="banner"`, `role="navigation"`, `role="complementary"` 等）の付与状況
  - `<article>`, `<figure>`, `<figcaption>`, `<time>` 等の意味的要素の使用度
  - セマンティック品質を A（模範的）/ B（標準的）/ C（改善余地あり）/ D（div偏重）で評価

### Step 2: セクション単位の詳細解析
各セクションについて以下を記録する:

1. **セクションID/クラス名**: 識別に使える属性
2. **セクションの役割**: hero / about / service / feature / CTA / FAQ / contact / testimonial 等
3. **レイアウトパターン**:
   - `full-width`: 全幅
   - `contained`: max-width制限あり
   - `two-column`: 2カラム（テキスト+画像等）
   - `grid-3col`: 3カラムグリッド
   - `grid-4col`: 4カラムグリッド
   - `alternating`: 左右交互レイアウト
4. **配置方法**: Flexbox / CSS Grid / 絶対配置
5. **グリッドシステム検出**:
   - グリッド種別: `12-col`（Bootstrap系）/ `custom-N-col` / `auto-fit` / `masonry` / `none`
   - ガター幅（gap値）とカラム比率（例: `2:1`, `1:1:1`）
   - レスポンシブ時のカラム数変化（例: PC 3col → SP 1col）
6. **子要素の構成**: 見出し + テキスト + ボタン、カード x 3、画像 + テキスト 等
7. **推定高さ**: 100vh / auto / 特定px値

### Step 3: コンテンツ階層分析
各ページの見出しレベルと読み順を検証する:

1. **見出し階層**: `h1` → `h2` → `h3` の順序が論理的にスキップなく構成されているか
   - `h1` の数（ページあたり1つが理想）
   - レベルスキップ（例: h2 → h4）の有無と箇所
2. **読み順**: DOM順序が視覚的な表示順序と一致しているか（CSS orderやflexbox reverseによるズレ）
3. **階層深度**: コンテンツのネスト段数（浅い=明快、深い=複雑）
4. **見出しマップ**: ページ全体の見出しツリーをインデント形式で記録

### Step 4: ナビゲーション構造の解析
- ヘッダーナビゲーションの項目とリンク先
- ナビゲーションの種類: fixed-top / sticky / static
- モバイルハンバーガーメニューの有無
- ドロップダウン/メガメニューの有無
- CTAボタンの有無（「お問い合わせ」等）

### Step 5: フッター構造の解析
- カラム数と各カラムの内容
- ロゴ・著作権表示の位置
- SNSリンクの有無
- サイトマップ的なリンク一覧

### Step 6: 固定・スティッキー要素のインベントリ
ナビゲーション以外も含め、`position: fixed` / `position: sticky` の全要素を棚卸しする:

- **対象要素**: ヘッダー、サイドバー、TOC（目次）、CTA バー、Cookie バナー、チャットウィジェット、トップへ戻るボタン、フローティングアクション等
- 各要素の `position` 値（`fixed` / `sticky`）と固定方向（top / bottom / left / right）
- 表示条件: 常時表示 / スクロール後出現 / 特定ビューポートのみ

### Step 7: z-index レイヤーマップ
ページ内の重なり順を明示する z-index マップを作成する:

- `z-index` が明示的に設定された全要素を抽出
- レイヤー分類: `base`(0) / `content`(1-9) / `sticky`(10-49) / `overlay`(50-99) / `modal`(100+)
- 同一レイヤー内の競合（同じ z-index で異なる要素）がある場合は注記

### Step 8: 共通レイアウトパターンの抽出
全ページを通じた共通パターンを抽出する:
- コンテンツの最大幅（max-width）
- セクション間のスペーシング
- レスポンシブブレークポイント（768px, 1024px, 1280px 等）
- ヘッダー高さ
- 共通パディング

### Step 9: ページ間の共通/固有要素の整理
- 共通コンポーネント: Header, Footer, CTA Section 等
- ページ固有のセクション構成

## 出力フォーマット

`/agents/web_builder/structure_analyzer/output.json` に保存:

```json
{
  "pages": [
    {
      "url": "https://example.com",
      "page_role": "top",
      "semantic_quality": "B",
      "heading_map": ["h1: メインタイトル", "  h2: サービス", "    h3: 機能1", "  h2: 実績"],
      "heading_issues": [],
      "sections": [
        {
          "id": "hero",
          "order": 1,
          "role": "hero",
          "layout": "full-width-centered",
          "content_type": "hero_with_video_bg",
          "children_summary": "h1 + p + 2x button",
          "grid_or_flex": "flex-col-center",
          "grid_system": {"type": "none"},
          "estimated_height": "100vh",
          "background_type": "video | image | color | gradient",
          "notes": "オーバーレイ付き動画背景"
        },
        {
          "id": "features",
          "order": 2,
          "role": "feature",
          "layout": "grid-3col",
          "content_type": "icon_card_grid",
          "children_summary": "section-heading + 3x card(icon + h3 + p)",
          "grid_or_flex": "grid-cols-3",
          "grid_system": {"type": "custom-3-col", "gutter": "24px", "responsive": "3col→1col@768px"},
          "estimated_height": "auto",
          "background_type": "color",
          "notes": "各カードにアイコン付き"
        }
      ],
      "navigation": {
        "type": "fixed-top",
        "items": [
          {"label": "サービス", "href": "/service"},
          {"label": "実績", "href": "/works"},
          {"label": "会社概要", "href": "/about"},
          {"label": "お問い合わせ", "href": "/contact", "is_cta": true}
        ],
        "has_hamburger_mobile": true,
        "has_dropdown": false,
        "logo_position": "left"
      },
      "footer": {
        "columns": 4,
        "content": ["会社情報", "サービス一覧", "お問い合わせ", "SNSリンク"],
        "has_logo": true,
        "has_copyright": true,
        "has_sns_links": true,
        "sns_platforms": ["Twitter", "Instagram", "Facebook"]
      },
      "fixed_sticky_elements": [
        {"element": "header nav", "position": "fixed", "direction": "top", "condition": "常時表示"},
        {"element": "トップへ戻るボタン", "position": "fixed", "direction": "bottom-right", "condition": "スクロール200px後に出現"}
      ],
      "z_index_map": [
        {"layer": "base", "range": "0", "elements": ["main content"]},
        {"layer": "sticky", "range": "10", "elements": ["header nav"]},
        {"layer": "overlay", "range": "50", "elements": ["mobile menu"]},
        {"layer": "modal", "range": "100", "elements": ["cookie banner"]}
      ]
    }
  ],
  "common_layout": {
    "max_width": "1200px",
    "header_height": "80px",
    "section_padding": "80px 0",
    "content_padding": "0 24px",
    "responsive_breakpoints": ["640px", "768px", "1024px", "1280px"]
  },
  "shared_components": [
    "Header（全ページ共通）",
    "Footer（全ページ共通）",
    "CTA Section（複数ページで使用）",
    "Section Heading（共通見出しパターン）"
  ]
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: 各ページのHTML取得
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 解析した HTML 構造が再現実装に十分な粒度で表現されているか検証
- **Web Builder / design_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **Frontend Engineer**: セマンティクス・アクセシビリティ観点でのレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
