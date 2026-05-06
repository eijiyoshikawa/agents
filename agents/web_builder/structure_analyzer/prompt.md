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

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: 各ページのHTML取得
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 解析した HTML 構造が再現実装に十分な粒度で表現されているか検証
- **Web Builder / design_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **Frontend Engineer**: セマンティクス・アクセシビリティ観点でのレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証

## セマンティクスHTML評価

### ランドマーク要素の適切な使用
各ページの HTML が以下のランドマーク要素を正しく使用しているかを評価し、Builder への実装指示に含める:

| 要素 | 正しい使用法 | よくある誤り |
|------|------------|------------|
| `<header>` | サイトヘッダー（ページに1つ）。セクション内ヘッダーは `<div>` で可 | `<div class="header">` で代用 |
| `<nav>` | ナビゲーションリンク群。メイン・フッター・パンくず等に使用 | `aria-label` なしで複数 `<nav>` を配置 |
| `<main>` | ページの主要コンテンツ（ページに1つのみ） | `<main>` なしで `<div id="content">` を使用 |
| `<section>` | テーマ別のコンテンツ区分。見出し（h2-h6）を伴うべき | 見出しなしの `<section>`（`<div>` を使うべき） |
| `<article>` | 独立したコンテンツ（ブログ投稿、ニュース記事等） | 非独立コンテンツに `<article>` を使用 |
| `<aside>` | 補足コンテンツ（サイドバー、関連記事等） | メインコンテンツに `<aside>` を使用 |
| `<footer>` | サイトフッター（ページに1つ） | `<div class="footer">` で代用 |

### 見出し階層バリデーション
```
正しい例:
  <h1> → <h2> → <h3> → <h2> → <h3>（レベルスキップなし）

誤りの例:
  <h1> → <h3>（h2 をスキップ）
  <h2> → <h2> → <h4>（h3 をスキップ）
```
- 各ページの見出し階層ツリーを出力に含め、スキップがある場合は修正推奨を記録

### WAI-ARIA ロール評価
参考サイトでの ARIA 使用状況を記録し、再現時の改善点を提案:
- `role="banner"`, `role="navigation"`, `role="main"`, `role="contentinfo"` の暗黙的ロールと明示的ロールの使い分け
- `aria-label`, `aria-labelledby`, `aria-describedby` の適切な使用
- インタラクティブ要素（タブ、アコーディオン）の `role="tablist"`, `role="tab"`, `role="tabpanel"` 等

### コンテンツセクショニングのベストプラクティス
再現実装時に適用すべきセクショニング指針:
- 各 `<section>` には必ず見出し要素を配置
- フォームには `<fieldset>` + `<legend>` を使用
- リスト形式のコンテンツには `<ul>` / `<ol>` を使用（`<div>` の羅列を避ける）
- テーブルデータには `<table>` + `<thead>` / `<tbody>` / `<th scope>` を使用

## コンポーネント抽象化

### 再利用可能コンポーネントの特定アルゴリズム
全ページ解析後に以下の手順でコンポーネント候補を抽出する:

**Step 1: パターン検出**
```
1. 全セクションの children_summary を収集
2. 類似構造をグループ化（例: "icon + h3 + p" パターンが3箇所以上）
3. 同一構造 × 異なるコンテンツ = コンポーネント候補
```

**Step 2: 抽象化レベルの判定**
| 出現回数 | 抽象化レベル | 例 |
|---------|------------|-----|
| 2回 | Props 付きコンポーネント | `<TeamMember name={...} role={...} />` |
| 3回以上 | 汎用コンポーネント | `<FeatureCard icon={...} title={...} description={...} />` |
| 全ページ共通 | レイアウトコンポーネント | `<SectionWrapper>`, `<Container>` |

**Step 3: コンポーネント Props インターフェース設計の提案**
抽出された各コンポーネントに対して、TypeScript の Props 型を提案:
```typescript
// 例: FeatureCard
interface FeatureCardProps {
  icon: LucideIcon;      // アイコンコンポーネント
  title: string;         // カードタイトル
  description: string;   // 説明文
  link?: string;         // オプショナルリンク
}
```

### Composition vs Inheritance パターン
- **Composition 推奨**: children prop を活用した柔軟な構成（例: `<Card><CardHeader /><CardBody /></Card>`）
- **Variant パターン**: 同じコンポーネントの見た目バリエーションは props で制御（例: `<Button variant="primary" | "secondary" | "ghost" />`）
- **Slot パターン**: ヘッダー・ボディ・フッター等の構造化されたレイアウトには名前付き slot（props）を使用

## グリッドシステム分析

### グリッドシステムのリバースエンジニアリング
参考サイトのレイアウトから使用されているグリッドシステムを推定する:

**検出手順:**
1. コンテンツ領域の `max-width` を特定（1200px / 1280px / 1440px 等）
2. カラム数を推定（子要素の配置パターンから逆算）
3. ガター（列間スペース）を計測
4. レスポンシブブレークポイントでのカラム変化を記録

**一般的なグリッドパターン:**
| パターン | 検出条件 | Tailwind CSS 変換 |
|---------|---------|------------------|
| 12カラムグリッド | Bootstrap系、等間隔配置 | `grid-cols-12` + `col-span-*` |
| 自動フィットグリッド | カード等の繰り返し要素 | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| サイドバーレイアウト | メイン + サイドの2分割 | `grid-cols-1 lg:grid-cols-[1fr_300px]` |
| 非対称グリッド | 画像大 + テキスト小等 | `grid-cols-1 lg:grid-cols-[3fr_2fr]` |

### ギャップ分析
- グリッドアイテム間の `gap` 値を計測
- 行方向と列方向で異なる gap がある場合を検出（`gap-x-*` / `gap-y-*`）
- レスポンシブ時の gap 変化を記録

### アラインメントパターン検出
- **水平アラインメント**: `justify-items` / `justify-content`（start / center / end / between）
- **垂直アラインメント**: `align-items`（start / center / end / stretch）
- **セルフアラインメント**: 特定のグリッドアイテムだけ異なるアラインメントを持つ場合を検出
