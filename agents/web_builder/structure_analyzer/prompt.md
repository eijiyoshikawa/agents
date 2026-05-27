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
- `<header>`, `<main>`, `<footer>` の基本構造
- `<section>` や `<div>` によるセクション分割
- セクションの出現順序と数

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
5. **子要素の構成**: 見出し + テキスト + ボタン、カード x 3、画像 + テキスト 等
6. **推定高さ**: 100vh / auto / 特定px値

### Step 3: ナビゲーション構造の解析
- ヘッダーナビゲーションの項目とリンク先
- ナビゲーションの種類: fixed-top / sticky / static
- モバイルハンバーガーメニューの有無
- ドロップダウン/メガメニューの有無
- CTAボタンの有無（「お問い合わせ」等）

### Step 4: フッター構造の解析
- カラム数と各カラムの内容
- ロゴ・著作権表示の位置
- SNSリンクの有無
- サイトマップ的なリンク一覧

### Step 5: 共通レイアウトパターンの抽出
全ページを通じた共通パターンを抽出する:
- コンテンツの最大幅（max-width）
- セクション間のスペーシング
- レスポンシブブレークポイント（768px, 1024px, 1280px 等）
- ヘッダー高さ
- 共通パディング

### Step 6: ページ間の共通/固有要素の整理
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
      }
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

## セマンティックHTML ベストプラクティス検証

解析時に以下のセマンティクスを検証し、Builder への実装指示に含める:

### ランドマーク要素の適切な使用
- **必須ランドマーク**: `<header>`, `<nav>`, `<main>`, `<footer>` が存在するか
- **補助ランドマーク**: `<aside>`（サイドバー）、`<section>`（論理的なセクション区切り）の使用状況
- **参考サイトでランドマークが不足している場合**: Builder への出力に「追加すべきランドマーク」として明記する

### 見出し階層の検証
- **h1**: ページに1つだけ存在するか
- **見出しスキップ**: h1 → h3 のように階層が飛んでいないか（h1 → h2 → h3 の順序を確認）
- **セクション見出し**: 各 `<section>` に適切な見出し（h2〜h4）が含まれているか
- **違反がある場合**: 参考サイトの実際の構造を記録しつつ、Builder への指示では正しい階層に修正するよう注記

### フォームアクセシビリティ
- **label/input の関連付け**: `<label for="...">` と `<input id="...">` が正しく紐づいているか
- **fieldset/legend**: ラジオボタン・チェックボックスグループが `<fieldset>` + `<legend>` でグルーピングされているか
- **エラーメッセージ**: `aria-describedby` でエラーメッセージと入力フィールドが関連付けられているか

## コンポーネント抽出インテリジェンス

### 再利用可能パターンの識別
全セクションを横断的に比較し、同一の構造パターンを持つ要素を共通コンポーネントとして抽出する:

- **識別基準**: DOM構造（タグ名 + ネスト階層 + 子要素パターン）が70%以上一致する要素群
- **命名規則**: 役割ベースで命名（例: `FeatureCard`, `TestimonialCard`, `PricingTable`）
- **出力形式**: `shared_components` 配列に、コンポーネント名・使用箇所・バリアント数を記録

### コンポーネントバリアントの推定
同一コンポーネントの異なるバリエーションを特定する:

| パターン | バリアント例 |
|---------|------------|
| **Card** | image-top, image-left, icon-only, horizontal |
| **CTA Section** | dark-bg, light-bg, with-image, minimal |
| **Hero** | video-bg, image-bg, gradient, split-layout |
| **Testimonial** | card-style, quote-style, avatar-large, avatar-small |

各バリアントについて以下を記録:
- バリアント名と使用箇所
- 基本構造との差分（追加要素、レイアウト変更、スタイル差分）
- Builder が Props で切り替え可能な設計を推奨するかどうか

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: 各ページのHTML取得
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 解析した HTML 構造が再現実装に十分な粒度で表現されているか検証
- **Web Builder / design_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **Frontend Engineer**: セマンティクス・アクセシビリティ観点でのレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
