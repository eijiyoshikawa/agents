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

### Step 1.5: HTML5セマンティクス分析

各ページのセマンティック要素の使用パターンを精緻に記録する:

#### セマンティック要素の使用マッピング

| 要素 | 確認事項 |
|------|---------|
| `<header>` | ページレベル / セクションレベルの使い分け。`role="banner"` の有無 |
| `<nav>` | メイン / サブ / フッター / パンくず等の用途区別。`aria-label` の付与状況 |
| `<main>` | 1ページに1つのみか。`id="main-content"` 等のスキップリンク対応 |
| `<footer>` | ページレベル / セクションレベルの使い分け。`role="contentinfo"` の有無 |
| `<aside>` | サイドバー / 補足情報 / 関連リンクの用途。配置位置 |
| `<section>` | 各セクションに見出し（h2〜h3）が含まれているか。`aria-labelledby` の有無 |
| `<article>` | ブログ記事 / ニュース / カード等の自己完結コンテンツでの使用 |
| `<figure>` / `<figcaption>` | 画像・図表への適用状況 |
| `<details>` / `<summary>` | ネイティブアコーディオンの使用有無 |
| `<dialog>` | ネイティブモーダルの使用有無 |

#### 見出し階層の検証
- h1〜h6 の出現順序と階層構造が論理的か
- h1 が各ページに1つのみか
- 見出しレベルの飛ばし（h2 → h4 等）がないか
- セクション見出しとして適切なレベルが使われているか

#### ランドマークの整理
ページ全体のARIAランドマーク構成を記録する:
```
banner（header）→ navigation（nav）→ main → complementary（aside）→ contentinfo（footer）
```

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

### Step 2.5: レスポンシブパターンの体系化

#### Flexbox vs CSS Grid の判定
各レイアウトについて、使用されている配置方法を正確に判別する:

| 判定基準 | Flexbox | CSS Grid |
|---------|---------|----------|
| **1次元 vs 2次元** | 行 or 列の一方向に並べる | 行と列の両方を制御 |
| **CSS プロパティ** | `display: flex`, `flex-direction`, `justify-content`, `align-items` | `display: grid`, `grid-template-columns`, `grid-template-rows`, `grid-area` |
| **典型用途** | ナビゲーション、ヘッダー内要素配置、カード横並び | カードグリッド、ダッシュボード、複雑なレイアウト |
| **レスポンシブ挙動** | `flex-wrap` で折り返し | `auto-fit` / `auto-fill` + `minmax()` |

#### ブレイクポイント特定手法
CSSメディアクエリを解析し、実際に使用されているブレイクポイントを特定する:

1. `@media` ルールの全ブレイクポイント値を抽出
2. Tailwind CSS 使用時は標準ブレイクポイントとの一致を確認（`sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1536`）
3. カスタムブレイクポイントがある場合はその値と用途を記録
4. モバイルファースト（`min-width`）かデスクトップファースト（`max-width`）かを判定

#### レスポンシブ変換パターン
各セクションのレスポンシブ時の変化を体系的に記録する:

```json
{
  "responsive_patterns": [
    {
      "section_id": "features",
      "desktop": "grid-cols-3 gap-8",
      "tablet": "grid-cols-2 gap-6",
      "mobile": "grid-cols-1 gap-4",
      "method": "css-grid",
      "breakpoint_tablet": "768px",
      "breakpoint_desktop": "1024px"
    }
  ]
}
```

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

### Step 7: コンポーネント粒度の判断（Atomic Design 分類）

検出した全UI要素を Atomic Design の粒度で分類し、Builder が再利用可能なコンポーネント設計を行えるようにする。

#### 分類基準

| レベル | 定義 | 例 |
|--------|------|-----|
| **Atom（原子）** | それ以上分解できない最小UI要素 | Button, Input, Label, Icon, Badge, Avatar, Logo |
| **Molecule（分子）** | Atom の組み合わせで特定機能を持つ | SearchBar(Input+Button), NavItem(Icon+Label), FormField(Label+Input+Error) |
| **Organism（有機体）** | Molecule / Atom の集合で独立セクションを構成 | Header, Footer, HeroSection, CardGrid, ContactForm, TestimonialSlider |
| **Template** | Organism の配置パターン（ページレイアウト） | TopPageLayout, AboutPageLayout |
| **Page** | Template にコンテンツを流し込んだ完成形 | `/`, `/about`, `/contact` |

#### 出力形式
```json
{
  "component_taxonomy": {
    "atoms": [
      {"name": "Button", "variants": ["primary", "secondary", "ghost"], "usage_count": 12},
      {"name": "SectionHeading", "variants": ["centered", "left-aligned"], "usage_count": 8},
      {"name": "Badge", "variants": ["filled", "outline"], "usage_count": 5}
    ],
    "molecules": [
      {"name": "NavItem", "composition": ["Icon", "Label"], "usage_count": 6},
      {"name": "FeatureCard", "composition": ["Icon", "Heading", "Text"], "usage_count": 3},
      {"name": "FormField", "composition": ["Label", "Input", "ErrorMessage"], "usage_count": 7}
    ],
    "organisms": [
      {"name": "Header", "composition": ["Logo", "NavItem x N", "Button(CTA)"], "shared": true},
      {"name": "HeroSection", "composition": ["Heading", "Text", "Button x 2", "BackgroundImage"], "shared": false},
      {"name": "CardGrid", "composition": ["SectionHeading", "FeatureCard x 3"], "shared": true}
    ]
  }
}
```

#### 判断ガイドライン
- 3箇所以上で再利用される要素 → 独立コンポーネントとして抽出
- 2箇所で使用 → props でバリエーション対応可能なら統合
- 1箇所のみ → ページ内インラインで実装（過度な分割を避ける）

## 出力フォーマット

`/agents/web_builder/structure_analyzer/output.json` に保存:

```json
{
  "pages": [
    {
      "url": "https://example.com",
      "page_role": "top",
      "semantic_structure": {
        "has_header": true,
        "has_main": true,
        "has_footer": true,
        "has_nav": true,
        "nav_count": 2,
        "has_aside": false,
        "heading_hierarchy": ["h1", "h2", "h2", "h2", "h2", "h3", "h3"],
        "heading_valid": true,
        "landmarks": ["banner", "navigation", "main", "contentinfo"]
      },
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
    "responsive_breakpoints": ["640px", "768px", "1024px", "1280px"],
    "responsive_approach": "mobile-first"
  },
  "responsive_patterns": [
    {
      "section_id": "features",
      "desktop": "grid-cols-3 gap-8",
      "tablet": "grid-cols-2 gap-6",
      "mobile": "grid-cols-1 gap-4",
      "method": "css-grid",
      "breakpoint_tablet": "768px",
      "breakpoint_desktop": "1024px"
    }
  ],
  "shared_components": [
    "Header（全ページ共通）",
    "Footer（全ページ共通）",
    "CTA Section（複数ページで使用）",
    "Section Heading（共通見出しパターン）"
  ],
  "component_taxonomy": {
    "atoms": [],
    "molecules": [],
    "organisms": []
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
