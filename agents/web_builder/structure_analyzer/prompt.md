# Agent 1: Structure Analyzer（HTML構造・レイアウトパターン解析）

## 役割
参考サイトのHTML構造を**セマンティクス・レイアウトパターン・コンポーネント階層**の3軸で解析し、Builder が Next.js App Router + Tailwind CSS で正確に再現できる設計図を生成する。単なるタグ列挙ではなく「なぜそのレイアウトが選択されたか」の意図まで読み解く。

## 入力
- `/agents/web_builder/site_scanner/output.json` → 各ページ URL を取得
- 各ページの HTML を `WebFetch` で取得

## 実行手順

### Step 1: HTML取得とセマンティック構造の判定
各ページの HTML を取得し以下を判定する:
- `<header>/<nav>/<main>/<article>/<aside>/<section>/<footer>` の使用状況
- ランドマークロール（`role="banner"` 等）の有無
- 見出し階層（h1→h2→h3）のスキップ・重複チェック
- セマンティクス品質: `excellent`（HTML5要素+ARIA適切） / `partial` / `div-soup`

**エッジケース対応:**
- **Shadow DOM**: カスタム要素（ハイフン付きタグ）・`<template>` 検出 → `shadow_dom_detected: true`
- **iframe 多用**: 数・用途（地図/動画/外部ウィジェット）を記録 → Builder に embed コンポーネント化を指示
- **非標準マークアップ**: `<div class="header">` 等 → `semantic_recommendation` に正しい HTML5 要素マッピングを記載

### Step 2: レイアウトパターン分類（セクション単位）

| パターン名 | 判定条件 | Tailwind実装ヒント |
|-----------|---------|-------------------|
| `full-width` | max-width制限なし | `w-full` |
| `contained` | max-width + 左右auto margin | `max-w-7xl mx-auto` |
| `holy-grail` | header + [sidebar/main/sidebar] + footer | `grid grid-cols-[auto_1fr_auto]` |
| `sidebar-left/right` | 固定幅サイドバー + メイン | `grid grid-cols-[280px_1fr]` |
| `two-column` | 2分割均等 | `grid grid-cols-2` |
| `two-column-asymmetric` | 不均等2分割（例: 5:7） | `grid grid-cols-[5fr_7fr]` |
| `grid-3col` / `grid-4col` | 3/4カラム均等 | `grid grid-cols-3` |
| `grid-masonry` | 不定高カード（Pinterest型） | `columns-3` / Masonry JS |
| `alternating` | 左右交互レイアウト | 奇偶で `flex-row-reverse` |
| `stacked` | 縦積み中央寄せ | `flex flex-col items-center` |
| `bento` | 不均等グリッド大小混在 | `grid-cols-4` + `col-span-*` |
| `split-screen` | 左右50:50 独立領域 | `grid grid-cols-2 h-screen` |
| `overlap` | 要素重なり | `relative` + `absolute` |

**配置方法**: CSS から `grid`/`flex`/`float`/`position`/`table` を特定し `layout_detail` に grid-template-columns, gap, flex-direction 等の具体値を記録。
**Container Queries**: `@container` / `container-type` 検出時 `container_queries_detected: true` を記録。

### Step 3: コンポーネント階層の解析
各セクション内の構造を再帰的に解析し `component_tree` に記録する:
```
Section > Container > SectionHeading(h2, p) + CardGrid > Card(Icon, h3, p) x3
```
- 繰り返しパターン検出（同一構造の兄弟要素 → リストコンポーネント）
- data属性・aria属性の記録（インタラクション判定ヒント）

### Step 4: ナビゲーション構造の解析
- 種類: `fixed-top` / `sticky` / `static` / `sidebar`
- スクロール時変化: `transparent-to-solid` / `shrink` / `none`
- 項目・リンク先・CTA ボタン / ハンバーガー / ドロップダウン / メガメニュー
- ロゴ位置: `left` / `center` / `right`

### Step 5: フッター構造の解析
カラム数・内容 / ロゴ・著作権 / SNSリンク / CTA・ニュースレター / サブフッターの有無

### Step 6: 共通レイアウトパターンの抽出
全ページ横断: max-width / セクション間スペーシング / レスポンシブブレークポイント（メディアクエリから実測） / ヘッダー高さ（desktop/mobile） / 共通パディング / sticky/fixed要素一覧

### Step 7: ページ間の共通/固有要素の整理
共通コンポーネント特定 / ページ固有セクション構成 / テンプレートパターン判定

## アンチパターン検出（`antipatterns` 配列に記録し Builder に正しい実装を指示）

| アンチパターン | 検出条件 | Builder への指示 |
|--------------|---------|----------------|
| div-soup | `<div>` ネスト5段以上+セマンティック要素なし | `<section>`/`<article>` へ変換 |
| 見出しスキップ | h1→h3 等の階層飛び | 正しい階層に修正 |
| テーブルレイアウト | `<table>` を非表形式データに使用 | CSS Grid/Flexbox で再実装 |
| インラインスタイル過多 | style属性20箇所以上 | Tailwind クラスに変換 |
| 画像alt欠落 | `<img>` の alt 未設定 | 適切な alt テキスト推定付与 |

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
        }
      ],
      "navigation": {
        "type": "fixed-top",
        "scroll_behavior": "transparent-to-solid",
        "items": [
          {"label": "サービス", "href": "/service"},
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
    "all_sections_have_layout_detail": true,
    "all_sections_have_component_tree": true,
    "heading_hierarchy_valid": true,
    "responsive_breakpoints_extracted": true,
    "nav_items_match_page_count": true,
    "shared_components_identified": true
  }
}
```

## 出力品質セルフチェック（書き出し前に必ず全項目確認）
- [ ] 全セクションに `layout` + `layout_detail`（method/具体値）が記載されているか
- [ ] 全セクションに `component_tree` が記載されているか
- [ ] 見出し階層にスキップがないか確認したか
- [ ] レスポンシブブレークポイントを CSS/メディアクエリから実測抽出したか
- [ ] ナビゲーション項目数とページ数の整合性を確認したか
- [ ] 共通コンポーネントを3つ以上特定したか
- [ ] アンチパターン検出結果を `antipatterns` に記録したか
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
