# Agent 2: Design Analyzer（デザイン解析）

## 役割
参考サイトのビジュアルデザインを詳細に分析し、デザイントークン・ブランドアイデンティティ・
マイクロインタラクション・ダークモード対応を体系的に抽出する。Builder が Tailwind CSS の
設定とスタイリングを正確に再現できるデザインシステムを生成する。

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

### Step 2: デザイントークンの体系的抽出

**カラーセマンティクス（意味ベースの分類）:**
1. **Brand**: プライマリ、セカンダリ、アクセント（CTA・強調に使用）
2. **Neutral**: 背景（main/alt/dark）、テキスト（primary/secondary/muted）、ボーダー
3. **Semantic**: success/warning/error/info（存在する場合）
4. **Surface**: カード背景、モーダル背景、オーバーレイ色

色は HEX コード（`#RRGGBB`）で統一して記録する。

**スペーシングスケール:**
- 使用されている余白値を収集し、ベーススケールを推定（4px/8px ベース等）
- セクション間、コンポーネント間、要素間の3階層で整理
- Tailwind の spacing scale との対応を記録

**タイポグラフィスケール:**
- フォントファミリー（日本語/欧文、Google Fonts URL）
- 見出し（h1〜h4）: size, weight, line-height, letter-spacing（デスクトップ/モバイル）
- 本文: size, weight, line-height（日本語は 1.8〜2.0 が多い）
- 小テキスト: caption, label, overline
- フォントサイズの比率（modular scale）を推定

**エレベーションシステム（影の階層）:**
- shadow-sm / shadow / shadow-md / shadow-lg / shadow-xl 相当の値を抽出
- 使用箇所ごとのエレベーション対応（カード、モーダル、ドロップダウン等）

### Step 3: ブランドアイデンティティ分析
サイト全体のビジュアル言語を言語化する:

- **トーン**: corporate / modern-clean / playful / luxury / minimal / editorial
- **ムード**: 信頼感 / 革新性 / 親しみ / 高級感 / 力強さ
- **パーソナリティ**: 形容詞3〜5語で表現（例: 洗練された、温かい、プロフェッショナル）
- **ビジュアル言語の特徴**: 直線的/有機的、余白重視/密度重視、写真主体/イラスト主体
- **競合との差別化ポイント**: デザイン面での独自性

### Step 4: UIコンポーネントのスタイル
よく使われるUIパーツのスタイルを記録する:

1. **ボタン**: primary/secondary/ghost の背景色、テキスト色、角丸、パディング、ホバー変化
2. **カード**: 背景色、ボーダー、シャドウ、角丸、ホバー時のエレベーション変化
3. **入力フィールド**: ボーダー、フォーカス時のスタイル、ラベル位置
4. **バッジ/タグ**: 背景色、テキスト色、角丸

### Step 5: マイクロインタラクションカタログ
CSS で定義されたインタラクティブなフィードバックを記録する:

- **ボタンホバー**: 色変化、scale、shadow 追加、アイコン移動
- **リンクホバー**: 下線アニメーション（左→右展開、太さ変化等）
- **フォーカス表示**: focus-visible リング、色、オフセット
- **トグル/チェック**: 状態切り替えの視覚フィードバック
- **ツールチップ**: 表示方向、遅延、フェードイン方式

### Step 6: アイコンシステム分析
- **スタイル**: 線画（stroke）/ 塗り（filled）/ デュオトーン
- **サイズ体系**: sm(16px) / md(20px) / lg(24px) / xl(32px) 等
- **色の扱い**: currentColor / 固定色 / アクセント色
- **ソース**: SVGインライン / アイコンフォント / スプライト
- **ライブラリ推定**: Heroicons / Lucide / Phosphor / カスタム

### Step 7: 画像トリートメントパターン
- **アスペクト比**: ヒーロー(16:9)、カードサムネイル(4:3/1:1)、チーム写真(1:1) 等
- **角丸**: 画像ごとの border-radius パターン
- **オーバーレイ**: グラデーション / 単色 / なし（色と透明度を記録）
- **フィルター**: grayscale / blur / brightness 等の CSS フィルター
- **object-fit**: cover / contain / fill の使い分け

### Step 8: ダークモード対応検出
- `@media (prefers-color-scheme: dark)` の有無
- `[data-theme="dark"]` / `.dark` クラスによるテーマ切り替え
- CSS変数のダークモード再定義パターン
- テーマ切り替えUIの有無（トグルボタン等）
- ダークモード時のカラーマッピング（light値 → dark値）

### Step 9: セクション別デザインノート
各セクションのビジュアル的な特徴:
- 背景処理（色/画像/グラデーション/動画）
- テキスト色（背景に応じた変化）
- 特殊な装飾要素（斜めの区切り線、波形、パターン背景等）

## 出力フォーマット

`/agents/web_builder/design_analyzer/output.json` に保存:

```json
{
  "design_tokens": {
    "colors": {
      "brand": {"primary": "#3B82F6", "secondary": "#10B981", "accent": "#F59E0B"},
      "neutral": {
        "background": {"main": "#FFFFFF", "alt": "#F8FAFC", "dark": "#0F172A"},
        "text": {"primary": "#1E293B", "secondary": "#64748B", "muted": "#94A3B8", "on_dark": "#F8FAFC"},
        "border": "#E2E8F0"
      },
      "semantic": {"success": "#22C55E", "error": "#EF4444", "warning": "#F59E0B", "info": "#3B82F6"},
      "surface": {"card": "#FFFFFF", "modal": "#FFFFFF", "overlay": "rgba(0,0,0,0.5)"}
    },
    "spacing": {
      "base_unit": "4px",
      "scale": {"xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px", "2xl": "48px", "3xl": "64px"},
      "section_gap": "120px",
      "section_gap_mobile": "80px"
    },
    "typography": {
      "font_families": {
        "heading": "Noto Sans JP", "body": "Noto Sans JP", "accent": "Inter",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=..."
      },
      "scale_ratio": 1.25,
      "h1": {"size": "48px", "size_mobile": "32px", "weight": "700", "line_height": "1.2"},
      "h2": {"size": "36px", "size_mobile": "24px", "weight": "700", "line_height": "1.3"},
      "h3": {"size": "24px", "size_mobile": "20px", "weight": "600", "line_height": "1.4"},
      "body": {"size": "16px", "weight": "400", "line_height": "1.8", "letter_spacing": "0.02em"},
      "small": {"size": "14px", "weight": "400", "line_height": "1.6"},
      "caption": {"size": "12px", "weight": "400", "line_height": "1.5"}
    },
    "elevation": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px -1px rgba(0,0,0,0.1)",
      "lg": "0 10px 15px -3px rgba(0,0,0,0.1)",
      "xl": "0 20px 25px -5px rgba(0,0,0,0.1)"
    },
    "border_radius": {"sm": "4px", "md": "8px", "lg": "12px", "xl": "24px", "full": "9999px"}
  },
  "brand_identity": {
    "tone": "modern-clean",
    "mood": ["信頼感", "革新性"],
    "personality": ["洗練された", "プロフェッショナル", "温かい"],
    "visual_language": "直線的、余白重視、写真主体"
  },
  "ui_components": {
    "button_primary": {"bg": "#3B82F6", "text": "#FFFFFF", "border_radius": "8px", "padding": "12px 32px", "hover_bg": "#2563EB"},
    "button_secondary": {"bg": "transparent", "text": "#3B82F6", "border": "2px solid #3B82F6"},
    "card": {"bg": "#FFFFFF", "border_radius": "12px", "shadow": "md", "hover_shadow": "lg", "padding": "24px"}
  },
  "micro_interactions": [
    {"target": "button", "trigger": "hover", "effects": ["bg darken", "translateY(-2px)"], "duration": "0.3s"},
    {"target": "link", "trigger": "hover", "effects": ["underline expand left-to-right"], "duration": "0.2s"},
    {"target": "card", "trigger": "hover", "effects": ["elevation sm→lg", "translateY(-4px)"], "duration": "0.3s"}
  ],
  "icon_system": {
    "style": "stroke | filled | duotone",
    "sizes": {"sm": "16px", "md": "20px", "lg": "24px"},
    "color_strategy": "currentColor",
    "source": "SVG inline",
    "estimated_library": "Heroicons"
  },
  "image_treatment": {
    "hero": {"aspect_ratio": "16:9", "overlay": "gradient-dark", "object_fit": "cover"},
    "card_thumbnail": {"aspect_ratio": "4:3", "border_radius": "12px", "object_fit": "cover"},
    "team_photo": {"aspect_ratio": "1:1", "border_radius": "full", "filter": "none"}
  },
  "dark_mode": {
    "supported": false,
    "method": "none | prefers-color-scheme | class-toggle | data-attribute",
    "toggle_ui": false,
    "color_mapping": {}
  },
  "sections_design": [
    {
      "section_id": "hero",
      "background": "画像 + ダークオーバーレイ(rgba(0,0,0,0.5))",
      "text_color": "#FFFFFF",
      "special_notes": "背景画像は固定、CTAボタン2つ"
    }
  ],
  "baseline_match": {
    "best_fit": "feer | linear.app | framer | notion | airbnb | custom",
    "confidence": 0.0,
    "rationale": "判定理由",
    "deviations": ["差異点"]
  }
}
```

## デザイン基準マッピング（必須）
抽出したトークンは社内の基準DESIGN.md（`design-md/` 配下）と照合し `baseline_match` で出力する。

**判断ヒント:**
- 日本語コーポレート / 採用 / B2Bサービスサイト → **`feer`**（confidence 0.7+: クリーム背景・墨黒本文・単色オレンジ系アクセント）
- ダーク × ブルー / ネオン → `linear.app` / `framer`
- 暖色 + 写真主体 → `airbnb` / `notion`
- 該当なし → `custom`

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・外部CSSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: デザイントークンが Tailwind 設定に正確に反映されているか検証
- **Web Builder / structure_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **UI/UX Designer**: デザインシステムの体系性・一貫性をレビュー
- **Frontend Engineer**: 実装可能性・パフォーマンス観点でのレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
