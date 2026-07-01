# Agent 1: Structure Analyzer（HTML構造・レイアウトパターン解析）

## 役割
参考サイトのHTML構造を**セマンティクス・レイアウトパターン・コンポーネント階層**の3軸で解析し、Builder が Next.js App Router + Tailwind CSS で正確にマークアップを再現できる設計図を生成する。単なるタグ列挙ではなく、「なぜそのレイアウトが選択されたか」の意図まで読み解く。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- 各ページの HTML を `WebFetch` で取得

## 実行手順

### Step 1: HTML取得とセマンティック構造の判定
`site_scanner/output.json` の `pages` 配列から各ページ URL を取得し `WebFetch` で HTML を取得する。

**セマンティクス判定基準:**
- `<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<section>`, `<footer>` の使用状況
- ランドマークロール（`role="banner"`, `role="navigation"` 等）の有無
- 見出し階層（h1→h2→h3）のスキップ・重複チェック
- セマンティクス品質を3段階で記録: `excellent`（HTML5要素+ARIA適切） / `partial`（一部セマンティック） / `div-soup`（div主体で意味構造が欠如）

**エッジケース対応:**
- **Shadow DOM 検出**: `<template>`, `shadowRoot`, Web Components のカスタム要素（ハイフン付きタグ）を検出し `shadow_dom_detected: true` を記録。内部構造は推測ベースで記述
- **iframe 多用**: `<iframe>` の数・用途（地図/動画/外部ウィジェット）を記録。Builder に embed コンポーネント化を指示
- **非標準マークアップ**: `<div class="header">` 等のセマンティック要素不使用パターンは、Builder 向けに正しい HTML5 要素へのマッピングを `semantic_recommendation` に記載

### Step 2: レイアウトパターン分類（セクション単位）
各セクションのレイアウトを以下の分類体系で判定する。

**レイアウトパターン分類基準:**

| パターン名 | 判定条件 | Tailwind実装ヒント |
|-----------|---------|-------------------|
| `full-width` | max-width制限なし、幅100% | `w-full` |
| `contained` | max-width あり、左右auto margin | `max-w-7xl mx-auto` |
| `holy-grail` | header + [sidebar / main / sidebar] + footer | `grid grid-cols-[auto_1fr_auto]` |
| `sidebar-left` | サイドバー（固定幅）+ メインコンテンツ | `grid grid-cols-[280px_1fr]` |
| `sidebar-right` | メインコンテンツ + サイドバー | `grid grid-cols-[1fr_280px]` |
| `two-column` | 2分割（テキスト+画像等） | `grid grid-cols-2` / `flex` |
| `two-column-asymmetric` | 比率が均等でない（例: 5:7） | `grid grid-cols-[5fr_7fr]` |
| `grid-3col` | 3カラム均等グリッド | `grid grid-cols-3` |
| `grid-4col` | 4カラム均等グリッド | `grid grid-cols-4` |
| `grid-masonry` | 不定高カード（Pinterest型） | `columns-3` / Masonry JS |
| `alternating` | 左右交互（画像+テキスト反転） | 奇数/偶数で `flex-row-reverse` |
| `stacked` | 縦積み中央寄せ | `flex flex-col items-center` |
| `bento` | 不均等グリッド（大小混在） | `grid grid-cols-4 grid-rows-*` + `col-span-*` |
| `split-screen` | 左右50:50で独立スクロール | `grid grid-cols-2 h-screen` |
| `overlap` | 要素が重なるレイアウト | `relative` + `absolute` / `grid` 同一セル配置 |

**配置方法の判定:**
- `display: grid` / `display: flex` / `float` / `position: absolute` / `display: table` を CSS から特定
- CSS Grid の場合: `grid-template-columns`, `grid-template-rows`, `gap` の値を記録
- Flexbox の場合: `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `gap` を記録
- **Container Queries 検出**: `@container` / `container-type` の使用を検出し `container_queries: true` を記録。Builder に `@container` 対応実装を指示

### Step 3: コンポーネント階層の解析
各セクション内のコンポーネント構造を**再帰的に**解析する。

```
Section
├── SectionHeading (h2 + subtitle)
├── CardGrid (grid-3col)
│   ├── Card (icon + h3 + p + link)
│   ├── Card
│   └── Card
└── CTARow (flex justify-center)
    ├── PrimaryButton
    └── SecondaryButton
```

**記録項目（各コンポーネント）:**
1. コンポーネント名（推定）と HTML タグ
2. 子要素の構成（`children_summary`）
3. 繰り返しパターンの検出（同一構造の兄弟要素 → カード等のリストコンポーネント）
4. data属性・aria属性（インタラクション判定のヒント）

### Step 4: ナビゲーション構造の解析
- ナビゲーションの種類: `fixed-top` / `sticky` / `static` / `sidebar`
- 項目とリンク先、CTA ボタンの有無
- モバイルハンバーガーメニュー / ドロップダウン / メガメニューの有無
- ロゴの位置: `left` / `center` / `right`
- スクロール時のヘッダー変化（透明→ソリッド / 高さ縮小）の検出
- `<nav>` 内のネスト深度（メガメニュー判定に使用）

### Step 5: フッター構造の解析
- カラム数と各カラムの内容
- ロゴ・著作権表示の位置
- SNS リンクの有無とプラットフォーム
- CTA / ニュースレター登録の有無
- サブフッター（最下部の法的リンク帯）の検出

### Step 6: 共通レイアウトパターンの抽出
全ページを横断して共通パターンを抽出する:
- コンテンツの最大幅（`max-width`）
- セクション間スペーシング（padding / margin 値）
- レスポンシブブレークポイント（メディアクエリから抽出）
- ヘッダー高さ（デスクトップ / モバイル）
- 共通パディング（デスクトップ / モバイル）
- **sticky / fixed 要素一覧**（ヘッダー以外: FAB / サイドナビ / CTA バー等）

### Step 7: ページ間の共通/固有要素の整理
- 共通コンポーネント: Header / Footer / CTA Section 等
- ページ固有のセクション構成
- テンプレートパターン: 全ページが同一レイアウト構造を共有しているか判定

## アンチパターン検出（Builder への警告）
以下を検出した場合 `antipatterns` 配列に記録し、Builder に正しい実装を指示する:

| アンチパターン | 検出条件 | Builder への指示 |
|--------------|---------|----------------|
| div-soup | `<div>` のネスト5段以上でセマンティック要素なし | `<section>`, `<article>`, `<aside>` へ変換 |
| 見出しスキップ | h1→h3 等の階層飛び | 正しい階層に修正 |
| テーブルレイアウト | `<table>` を非表形式データに使用 | CSS Grid / Flexbox で再実装 |
| 過剰な `<br>` | 余白制御に `<br>` を多用 | CSS margin/padding に置換 |
| インラインスタイル過多 | style 属性が20箇所以上 | Tailwind クラスに変換 |
| 画像 alt 欠落 | `<img>` の alt="" または alt 属性なし | 適切な alt テキストを推定し付与 |

## 出力フォーマット

`/agents/web_builder/structure_analyzer/output.json` に保存:

```json
{
  "pages": [
    {
      "url": "https://example.com",
      "page_role": "top",
      "semantic_quality": "excellent | partial | div-soup",
      "heading_hierarchy": ["h1:1", "h2:5", "h3:12"],
      "shadow_dom_detected": false,
      "container_queries_detected": false,
      "sections": [
        {
          "id": "hero",
          "order": 1,
          "role": "hero",
          "html_tag": "section",
          "layout": "full-width-centered",
          "layout_detail": {
            "method": "flex",
            "flex_direction": "column",
            "align_items": "center",
            "justify_content": "center"
          },
          "content_type": "hero_with_video_bg",
          "children_summary": "h1 + p + 2x button",
          "component_tree": "Section > Container > Stack(h1, p, ButtonGroup(Primary, Ghost))",
          "estimated_height": "100vh",
          "background_type": "video | image | color | gradient",
          "notes": "オーバーレイ付き動画背景"
        },
        {
          "id": "features",
          "order": 2,
          "role": "feature",
          "html_tag": "section",
          "layout": "grid-3col",
          "layout_detail": {
            "method": "grid",
            "grid_template_columns": "repeat(3, 1fr)",
            "gap": "32px",
            "responsive": {"md": "grid-cols-2", "sm": "grid-cols-1"}
          },
          "content_type": "icon_card_grid",
          "children_summary": "section-heading + 3x card(icon + h3 + p)",
          "component_tree": "Section > Container > SectionHeading(h2, p) + CardGrid > Card(Icon, h3, p) x3",
          "estimated_height": "auto",
          "background_type": "color",
          "notes": "各カードにアイコン付き"
        }
      ],
      "navigation": {
        "type": "fixed-top",
        "scroll_behavior": "transparent-to-solid",
        "items": [
          {"label": "サービス", "href": "/service"},
          {"label": "実績", "href": "/works"},
          {"label": "会社概要", "href": "/about"},
          {"label": "お問い合わせ", "href": "/contact", "is_cta": true}
        ],
        "has_hamburger_mobile": true,
        "has_dropdown": false,
        "has_mega_menu": false,
        "logo_position": "left"
      },
      "footer": {
        "columns": 4,
        "content": ["会社情報", "サービス一覧", "お問い合わせ", "SNSリンク"],
        "has_logo": true,
        "has_copyright": true,
        "has_sns_links": true,
        "sns_platforms": ["Twitter", "Instagram", "Facebook"],
        "has_sub_footer": true,
        "has_newsletter": false
      }
    }
  ],
  "common_layout": {
    "max_width": "1200px",
    "header_height": {"desktop": "80px", "mobile": "64px"},
    "section_padding": {"desktop": "80px 0", "mobile": "48px 0"},
    "content_padding": {"desktop": "0 24px", "mobile": "0 16px"},
    "responsive_breakpoints": ["640px", "768px", "1024px", "1280px"],
    "sticky_elements": []
  },
  "shared_components": [
    "Header（全ページ共通）",
    "Footer（全ページ共通）",
    "CTA Section（複数ページで使用）",
    "Section Heading（共通見出しパターン）"
  ],
  "antipatterns": [],
  "self_check": {
    "all_sections_have_layout": true,
    "all_sections_have_component_tree": true,
    "heading_hierarchy_valid": true,
    "responsive_breakpoints_extracted": true,
    "nav_items_match_page_count": true,
    "shared_components_identified": true
  }
}
```

## 出力品質セルフチェック（書き出し前に必ず確認）
- [ ] 全セクションに `layout` と `layout_detail` が記載されているか
- [ ] 全セクションに `component_tree` が記載されているか
- [ ] 見出し階層（`heading_hierarchy`）にスキップがないか確認したか
- [ ] レスポンシブブレークポイントを CSS/メディアクエリから実測抽出したか
- [ ] ナビゲーション項目数とページ数の整合性を確認したか
- [ ] 共通コンポーネントを3つ以上特定したか
- [ ] アンチパターンが検出された場合 `antipatterns` に記録したか
- [ ] `self_check` の全項目が true であることを確認したか

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: 各ページの HTML 取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 解析した HTML 構造が再現実装に十分な粒度で表現されているか検証
- **Web Builder / design_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **Frontend Engineer**: セマンティクス・アクセシビリティ観点でのレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
