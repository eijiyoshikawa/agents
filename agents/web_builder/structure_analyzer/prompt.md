# Agent 1: Structure Analyzer（Web構造解析）

## 役割
参考サイトのHTML構造を詳細に解析し、セマンティクス・コンポーネント構造・レスポンシブ戦略・
ナビゲーションパターン・コンテンツモデルを読み解く。Builder エージェントが正確にマークアップを
再現できる設計図を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 各ページのHTML取得と全体構造の把握
`site_scanner/output.json` の `pages` 配列から各ページURLを取得し、`WebFetch` でHTMLを取得する。

各ページについて以下を把握する:
- `<header>`, `<main>`, `<footer>` の基本構造
- `<section>` や `<div>` によるセクション分割
- セクションの出現順序と数

### Step 2: セマンティックHTML5解析
各ページのセマンティクス品質を評価する:

**ランドマークロール:**
- `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` の使用状況
- `role` 属性による明示的なランドマーク（`role="banner"`, `role="navigation"` 等）
- `<article>`, `<section>`, `<figure>`, `<figcaption>` の適切な使用

**見出し階層:**
- h1〜h6 の出現順序と階層の正当性（h1が1つ、スキップなし等）
- 各セクションの見出しレベルマッピング
- 見出しとセクションの対応関係

**ARIAパターン:**
- `aria-label`, `aria-describedby`, `aria-expanded`, `aria-hidden` の使用箇所
- `aria-live` リージョンの有無（動的コンテンツ通知）
- カスタムウィジェットの ARIA ロール（`tablist`, `dialog`, `menu` 等）

### Step 3: セクション単位の詳細解析
各セクションについて以下を記録する:

1. **セクションID/クラス名**: 識別に使える属性
2. **セクションの役割**: hero / about / service / feature / CTA / FAQ / contact / testimonial 等
3. **レイアウトパターン**: `full-width` / `contained` / `two-column` / `grid-3col` / `grid-4col` / `alternating`
4. **配置方法**: Flexbox / CSS Grid / 絶対配置
5. **子要素の構成**: 見出し + テキスト + ボタン、カード x 3、画像 + テキスト 等
6. **推定高さ**: 100vh / auto / 特定px値
7. **背景種別**: video / image / color / gradient

### Step 4: コンポーネントアーキテクチャの特定
ページ横断で再利用可能なUIパターンを識別し分類する:

**Atomic Design 分類:**
- **Atoms**: ボタン、バッジ、アイコン、入力フィールド、ラベル
- **Molecules**: 検索バー（入力+ボタン）、カード（画像+テキスト+リンク）、メディアオブジェクト
- **Organisms**: ヘッダー、フッター、カードグリッド、ヒーローセクション、FAQ アコーディオン
- **Templates**: ページレイアウトの骨格パターン（サイドバー付き、フルワイド等）

**パターン検出基準:**
- 同一構造が2回以上出現 → 再利用コンポーネント候補
- 構造は同一で内容のみ異なる → Props でデータを差し替えるコンポーネント
- バリエーション（サイズ違い、色違い）がある → variant パターン

### Step 5: ナビゲーションパターンの詳細解析
- ヘッダーナビゲーションの項目とリンク先
- **ナビ種別**: fixed-top / sticky / static / scroll-hide-show
- **モバイルパターン**: ハンバーガー / ドロワー（左/右） / ボトムナビ / なし
- **メガメニュー**: マルチカラム構成、カテゴリ+サブ項目、画像・アイコン付き
- **タブ/ピル**: ページ内ナビゲーション、セクション切り替え
- **ドロップダウン**: 階層の深さ、ホバー/クリック起動
- **パンくずリスト**: 構造化データ（BreadcrumbList）との連動
- CTAボタンの有無（「お問い合わせ」等）

### Step 6: レスポンシブレイアウト戦略の検出
レスポンシブ実装の手法を特定する:

- **ブレークポイント体系**: `@media` クエリから実際のブレークポイントを抽出（640/768/1024/1280px 等）
- **グリッドシステム**: CSS Grid のトラック定義、12カラム等のカラムシステム
- **Container Queries**: `@container` の使用有無と対象コンポーネント
- **Fluid Typography**: `clamp()` や `vw` ベースのフォントサイズ
- **レイアウト変化パターン**: 各ブレークポイントでのカラム数変化（3col→2col→1col 等）

### Step 7: フッター構造の解析
- カラム数と各カラムの内容
- ロゴ・著作権表示の位置
- SNSリンクの有無とプラットフォーム
- サイトマップ的なリンク一覧

### Step 8: コンテンツモデルの抽出
サイトが扱うコンテンツの型を特定する:

- **繰り返しコンテンツ**: ブログ記事、事例、チームメンバー、料金プラン等のリスト型
- **フィールド構成**: 各コンテンツ型の属性（タイトル、画像、日付、カテゴリ、本文等）
- **一覧→詳細パターン**: カード一覧ページと詳細ページの関係
- **CMS的構造の推定**: 動的コンテンツか静的コンテンツかの判定

### Step 9: 共通レイアウトパターンの抽出
全ページを通じた共通パターン:
- コンテンツの最大幅（max-width）
- セクション間のスペーシング、ヘッダー高さ、共通パディング
- レスポンシブブレークポイント

## 出力フォーマット

`/agents/web_builder/structure_analyzer/output.json` に保存:

```json
{
  "pages": [
    {
      "url": "https://example.com",
      "page_role": "top",
      "sections": [
        {
          "id": "hero",
          "order": 1,
          "role": "hero",
          "layout": "full-width-centered",
          "content_type": "hero_with_video_bg",
          "children_summary": "h1 + p + 2x button",
          "grid_or_flex": "flex-col-center",
          "estimated_height": "100vh",
          "background_type": "video",
          "notes": "オーバーレイ付き動画背景"
        }
      ],
      "heading_hierarchy": ["h1:サイト名", "h2:サービス", "h2:実績", "h3:事例1"],
      "semantic_score": "good | fair | poor"
    }
  ],
  "navigation": {
    "type": "fixed-top",
    "mobile_pattern": "hamburger-drawer-right",
    "has_mega_menu": false,
    "has_dropdown": true,
    "has_breadcrumb": true,
    "items": [
      {"label": "サービス", "href": "/service", "has_children": true},
      {"label": "お問い合わせ", "href": "/contact", "is_cta": true}
    ],
    "logo_position": "left"
  },
  "footer": {
    "columns": 4,
    "content": ["会社情報", "サービス一覧", "お問い合わせ", "SNSリンク"],
    "has_logo": true,
    "has_copyright": true,
    "sns_platforms": ["Twitter", "Instagram", "Facebook"]
  },
  "component_architecture": {
    "atoms": ["Button(primary|secondary|ghost)", "Badge", "Icon"],
    "molecules": ["Card(image+title+desc)", "SearchBar", "MediaObject"],
    "organisms": ["Header", "Footer", "CardGrid", "HeroSection", "FAQ"],
    "templates": ["DefaultLayout(header+main+footer)", "SidebarLayout"],
    "variant_patterns": ["Card: 画像上/横並び/テキストのみ の3バリエーション"]
  },
  "responsive_strategy": {
    "breakpoints": ["640px", "768px", "1024px", "1280px"],
    "grid_system": "CSS Grid 12-column | Flexbox-based",
    "uses_container_queries": false,
    "uses_fluid_typography": true,
    "layout_shifts": {"1280": "3col", "768": "2col", "640": "1col"}
  },
  "content_model": [
    {
      "type": "blog_post",
      "fields": ["title", "date", "category", "thumbnail", "excerpt", "body"],
      "list_page": "/blog",
      "detail_pattern": "/blog/[slug]"
    }
  ],
  "common_layout": {
    "max_width": "1200px",
    "header_height": "80px",
    "section_padding": "80px 0",
    "content_padding": "0 24px",
    "responsive_breakpoints": ["640px", "768px", "1024px", "1280px"]
  },
  "shared_components": ["Header", "Footer", "CTA Section", "Section Heading"],
  "aria_patterns": {
    "landmarks_used": ["banner", "navigation", "main", "contentinfo"],
    "custom_widgets": ["tablist(料金プラン)", "dialog(お問い合わせモーダル)"],
    "aria_live_regions": false
  }
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
