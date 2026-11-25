# Agent 2: Design Analyzer（デザイン解析）

## 役割
参考サイトのビジュアルデザインを詳細に分析し、カラーパレット・タイポグラフィ・スペーシング・ビジュアルスタイルを体系的に抽出する。コントラスト比計算とアクセシビリティ評価を含め、Builder が Tailwind CSS の設定とスタイリングを正確かつアクセシブルに再現できるデザイントークンを生成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/CSSを `WebFetch` で取得

## 実行手順

### Step 1: CSSの取得と解析
`WebFetch` でページのHTMLを取得し、以下のCSS情報を収集する:

- `<link rel="stylesheet">` で読み込まれている外部CSS
- `<style>` タグ内のインラインCSS
- CSS カスタムプロパティ（`--primary-color` 等）の定義
- `:root` や `body` に定義されたグローバルスタイル
- `@media (prefers-color-scheme: dark)` によるダークモード定義の有無

### Step 2: カラーパレットの抽出とコントラスト評価
サイト全体で使用されているカラーを分類し、アクセシビリティを評価する:

1. **プライマリカラー**: メインのブランドカラー（CTA ボタン、アクセント等）
2. **セカンダリカラー**: サブカラー
3. **アクセントカラー**: 強調色
4. **背景色**: メイン背景、セクション背景のバリエーション
5. **テキストカラー**: 見出し色、本文色、薄いテキスト色
6. **グレースケール**: ボーダー、区切り線等に使われるグレー
7. **ステータスカラー**: success/warning/error/info（検出された場合）

色は HEX コード（`#RRGGBB`）で統一。

**コントラスト比の計算（WCAG 2.1 基準）:**
- 本文テキスト × 背景: 4.5:1 以上（AA）/ 7:1 以上（AAA）
- 大テキスト（18px bold以上）× 背景: 3:1 以上（AA）
- UI コンポーネント × 背景: 3:1 以上
- 不合格の組み合わせは `accessibility_issues` に記録

### Step 3: タイポグラフィの抽出とスケール分析

**フォントファミリー:**
- 日本語フォント（Noto Sans JP, Yu Gothic, etc.）
- 欧文フォント（Inter, Poppins, etc.）
- Google Fonts のインポートURLを確認
- 表示フォントとUI/本文フォントの使い分け

**タイプスケール分析:**
- h1〜h4, body, small, caption の各サイズを記録
- スケール比（ratio）を算出（例: 1.25 = Major Third, 1.333 = Perfect Fourth）
- 各レベルの font-size / font-weight / line-height / letter-spacing
- モバイル時のサイズ変化（レスポンシブタイポグラフィ）

**日本語固有の確認:**
- `font-feature-settings: "palt"` の有無
- 本文の line-height（日本語は 1.7〜2.0 が適正）
- letter-spacing（日本語本文は 0.02〜0.05em が多い）

### Step 4: スペーシングシステムの解析
セクション間・要素間の余白パターンを体系的に記録する:

- セクション間の上下マージン/パディング（PC / モバイル）
- コンテンツ領域の左右パディング
- カード間のギャップ
- 見出しと本文の間隔
- ボタンの内部パディング
- **スペーシングスケール**: 使われている値から基本単位（4px / 8px ベース等）を推定

### Step 5: UIコンポーネントのスタイル
1. **ボタン**: プライマリ / セカンダリ / ゴースト（背景色, テキスト色, 角丸, パディング, ホバー変化）
2. **カード**: 背景色, ボーダー, シャドウ, 角丸（ホバー時変化含む）
3. **画像の扱い**: 角丸, オーバーレイ, アスペクト比, object-fit
4. **アイコン**: スタイル（線画/塗り）, サイズ, 色
5. **フォーム要素**: input / select / textarea のスタイル（ボーダー, フォーカス時の変化）
6. **バッジ・タグ**: 背景色, テキスト色, パディング, 角丸

### Step 6: セクション別デザインノート
各セクションのビジュアル的な特徴を記録する:
- 背景処理（色/画像/グラデーション/動画/パターン）
- テキスト色（背景に応じた変化）
- 特殊な装飾要素（斜めの区切り線、波形、ドットパターン、グラデーションオーバーレイ等）
- ダークセクションの有無とその処理方法

### Step 7: デザイントークン化
抽出した全デザイン要素を Tailwind CSS の `theme.extend` にマッピング可能なトークン形式で整理:
- `colors`: プライマリ / セカンダリ / 背景 / テキスト / ボーダー
- `fontSize`: type scale の各レベル
- `spacing`: スペーシングスケールの値
- `borderRadius`: 使用されている角丸値（3段階以内に統合）
- `boxShadow`: シャドウバリエーション

## 品質基準
| 指標 | 合格基準 |
|------|---------|
| カラー抽出 | 主要カラー6色以上を正確にHEXで記録 |
| コントラスト評価 | テキスト×背景の主要組み合わせ全てで WCAG AA を検証 |
| タイプスケール | h1〜body の全レベルで size/weight/line-height を記録 |
| スペーシング | セクション間・要素間の主要値を5箇所以上で記録 |
| トークン化 | Tailwind config に直接転記可能な形式で整理 |

## アンチパターン
- CSS を読まずに目視の色推測で HEX を記入する
- コントラスト比計算を省略する（アクセシビリティは必須）
- Tailwind デフォルト値（blue-500 等）を参考サイトのカラーとして記録する
- ダークモード対応の有無を確認しない

## 出力フォーマット

`/agents/web_builder/design_analyzer/output.json` に保存:

```json
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#10B981",
    "accent": "#F59E0B",
    "background": {"main": "#FFFFFF", "alt": "#F8FAFC", "dark": "#0F172A"},
    "text": {"primary": "#1E293B", "secondary": "#64748B", "on_dark": "#F8FAFC", "on_primary": "#FFFFFF"},
    "border": "#E2E8F0",
    "status": {"success": "#10B981", "warning": "#F59E0B", "error": "#EF4444", "info": "#3B82F6"},
    "full_palette": ["#0F172A", "#1E293B", "#3B82F6", "#10B981", "#F59E0B", "#F8FAFC", "#FFFFFF"]
  },
  "contrast_evaluation": [
    {"pair": "text.primary × background.main", "ratio": 12.6, "wcag_aa": true, "wcag_aaa": true},
    {"pair": "text.secondary × background.main", "ratio": 4.8, "wcag_aa": true, "wcag_aaa": false}
  ],
  "accessibility_issues": [],
  "typography": {
    "font_families": {
      "heading": "Noto Sans JP",
      "body": "Noto Sans JP",
      "accent": "Inter",
      "google_fonts_url": "https://fonts.googleapis.com/css2?family=..."
    },
    "type_scale_ratio": 1.25,
    "h1": {"size": "48px", "size_mobile": "32px", "weight": "700", "line_height": "1.2", "letter_spacing": "-0.02em"},
    "h2": {"size": "36px", "size_mobile": "24px", "weight": "700", "line_height": "1.3", "letter_spacing": "-0.01em"},
    "h3": {"size": "24px", "size_mobile": "20px", "weight": "600", "line_height": "1.4", "letter_spacing": "0"},
    "body": {"size": "16px", "weight": "400", "line_height": "1.8", "letter_spacing": "0.02em"},
    "small": {"size": "14px", "weight": "400", "line_height": "1.6"},
    "caption": {"size": "12px", "weight": "400", "line_height": "1.5"},
    "japanese_settings": {"palt": true, "body_line_height": "1.8"}
  },
  "spacing": {
    "base_unit": "8px",
    "section_gap": {"desktop": "120px", "mobile": "80px"},
    "content_padding": {"desktop": "24px", "mobile": "16px"},
    "component_gap": "16px",
    "heading_to_text": "16px",
    "heading_to_content": "48px"
  },
  "ui_components": {
    "button_primary": {"bg": "#3B82F6", "text": "#FFFFFF", "border_radius": "8px", "padding": "12px 32px", "font_weight": "600", "hover_bg": "#2563EB"},
    "button_secondary": {"bg": "transparent", "text": "#3B82F6", "border": "2px solid #3B82F6", "border_radius": "8px"},
    "card": {"bg": "#FFFFFF", "border_radius": "12px", "shadow": "0 4px 6px -1px rgba(0,0,0,0.1)", "padding": "24px"},
    "form_input": {"border": "1px solid #E2E8F0", "border_radius": "8px", "focus_border": "#3B82F6", "padding": "12px 16px"}
  },
  "visual_style": {
    "overall_tone": "modern-clean",
    "border_radius_system": {"sm": "4px", "md": "8px", "lg": "12px"},
    "shadow_style": "subtle",
    "dark_mode": false,
    "decorative_elements": []
  },
  "tailwind_tokens": {
    "colors": {"primary": "#3B82F6", "secondary": "#10B981"},
    "fontSize": {"display": ["48px", {"lineHeight": "1.2", "letterSpacing": "-0.02em"}]},
    "borderRadius": {"sm": "4px", "md": "8px", "lg": "12px"},
    "boxShadow": {"card": "0 4px 6px -1px rgba(0,0,0,0.1)"}
  },
  "baseline_match": {
    "best_fit": "feer | linear.app | framer | notion | airbnb | custom",
    "confidence": 0.0,
    "rationale": "",
    "deviations": []
  }
}
```

**baseline_match 判断ヒント:**
- 日本語コーポレート / 採用 / B2Bサービスサイト → 多くの場合 **`feer`** が最も近い
- ダーク × ブルー / ネオン → `linear.app` / `framer`
- 暖色 + 写真主体 → `airbnb` / `notion`
- 該当なし → `custom`

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・外部CSSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: デザイントークンが Tailwind config に正確に変換可能か検証
- **Web Builder / structure_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **UI/UX Designer**: カラー・タイポグラフィ・スペーシングのデザイン品質レビュー
- **Frontend Engineer**: アクセシビリティ（コントラスト比）の実装妥当性検証
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
