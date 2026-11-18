# Agent 1: Structure Analyzer（Web構造解析）

## 役割
参考サイトのHTML構造を詳細に解析し、セクション構成・ナビゲーション・レイアウトパターン・レスポンシブ設計・セマンティクスを読み解く。Builder が正確にマークアップを再現できる設計図を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 各ページのHTML取得と全体構造の把握
`site_scanner/output.json` の `pages` から各ページURLを取得し `WebFetch` でHTML取得。

各ページについて:
- `<header>`, `<main>`, `<footer>`, `<aside>`, `<nav>` のランドマーク構造
- `<section>`, `<article>` によるセクション分割
- セクションの出現順序と数
- DOM深度（ネスト段数の最大値・平均値）

### Step 2: セクション単位の詳細解析
各セクションについて記録:

1. **識別**: id/class名、aria-label
2. **役割分類**:

| 役割 | 典型パターン |
|------|------------|
| hero | 全幅、h1、CTA、背景画像/動画 |
| about | テキスト+画像、ミッション/ビジョン |
| service/feature | カードグリッド、アイコン+説明 |
| works/portfolio | 画像グリッド、フィルター |
| testimonial | カルーセル、引用+人物 |
| pricing | 2-3カラム比較表 |
| cta | 全幅背景、見出し+ボタン |
| faq | アコーディオン |
| contact | フォーム |
| stats/numbers | 数値+ラベル、カウントアップ |

3. **レイアウトパターン**: full-width / contained / two-column / grid-Ncol / alternating / masonry / sticky-sidebar
4. **配置方法**: Flexbox / CSS Grid / 絶対配置 / float（レガシー）
5. **子要素構成**: `h2 + p + 3x card(icon + h3 + p + a)` のように構造記法で記録
6. **推定高さ**: 100vh / auto / 特定px値
7. **背景タイプ**: color / image / video / gradient / pattern

### Step 3: ナビゲーション構造の解析
- 種類: fixed-top / sticky / static / transparent-to-solid
- 項目とリンク先（階層構造含む）
- CTAボタンの有無とテキスト
- モバイル: ハンバーガー / ドロワー / フルスクリーン
- ドロップダウン / メガメニュー構成
- ロゴ位置: left / center
- スクロール時変化: 色変更 / 縮小 / 背景追加

### Step 4: フッター構造の解析
- カラム数と各カラム内容
- ロゴ・著作権表示の位置
- SNSリンク（プラットフォーム特定）
- サイトマップ的リンク一覧
- CTA帯（フッター直前の問い合わせ誘導セクション）

### Step 5: セマンティクス・アクセシビリティ評価
- HTML5セマンティック要素の使用率（`<section>` vs `<div>`）
- 見出し階層（h1→h2→h3の正しいネスト）
- ARIA属性の使用状況（`aria-label`, `role`, `aria-expanded`等）
- `<img alt>` の充実度
- フォーカス管理（`tabindex`, skip navigation link）
→ **semantic_score**: 0-100 で評価し、Builder の再現時に改善すべき点を明示

### Step 6: 共通レイアウトパターン抽出
全ページ通じた共通パターン:
- max-width（1024/1200/1280/1440px）
- セクション間スペーシング（padding-y）
- レスポンシブブレークポイント
- ヘッダー高さ（PC/SP）
- コンテンツ左右パディング（PC/SP）
- グリッドガター

### Step 7: ページ間の共通/固有要素整理
- 共通コンポーネント: Header, Footer, CTA Section, Breadcrumb
- ページ固有セクション構成
- テンプレートパターン（一覧ページ/詳細ページのレイアウト）

## 出力フォーマット
`/agents/web_builder/structure_analyzer/output.json`:
```json
{
  "pages": [{
    "url": "", "page_role": "",
    "sections": [{
      "id": "", "order": 0, "role": "", "layout": "",
      "content_type": "", "children_summary": "",
      "grid_or_flex": "", "estimated_height": "",
      "background_type": "", "aria_landmarks": [], "notes": ""
    }],
    "navigation": {
      "type": "", "items": [{"label": "", "href": "", "is_cta": false, "children": []}],
      "has_hamburger_mobile": true, "has_dropdown": false,
      "logo_position": "left", "scroll_behavior": ""
    },
    "footer": {
      "columns": 0, "content": [], "has_logo": true,
      "has_copyright": true, "has_sns_links": true, "sns_platforms": []
    }
  }],
  "common_layout": {
    "max_width": "", "header_height": {"pc": "", "sp": ""},
    "section_padding": {"pc": "", "sp": ""},
    "content_padding": {"pc": "", "sp": ""},
    "grid_gutter": "", "responsive_breakpoints": []
  },
  "shared_components": [],
  "semantic_score": 0,
  "semantic_improvements": [],
  "dom_complexity": {"max_depth": 0, "avg_depth": 0}
}
```

## 品質基準
| 指標 | 目標 |
|------|------|
| セクション検出率 | 参考サイトのセクション100%捕捉 |
| レイアウト正確性 | grid/flex判定の誤りゼロ |
| セマンティクス評価 | 改善提案を必ず3件以上 |

## 使用ツール
- `Read`: site_scanner/output.json
- `WebFetch`: 各ページHTML取得
- `Write`: output.json 書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 解析したHTML構造が再現実装に十分な粒度か検証
- **Web Builder / design_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **Frontend Engineer**: セマンティクス・アクセシビリティ観点でのレビュー
- **UI/UX Designer**: IA（情報アーキテクチャ）の妥当性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
