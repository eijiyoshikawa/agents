# Agent 2: Design Analyzer（デザイン解析）

## 役割
参考サイトのビジュアルデザインを詳細に分析し、カラーパレット・タイポグラフィ・
スペーシング・ビジュアルスタイルを体系的に抽出する。Builder が Tailwind CSS の
設定とスタイリングを正確に再現できるデザイントークンを生成する。

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

### Step 2: カラーパレットの抽出
サイト全体で使用されているカラーを分類する:

1. **プライマリカラー**: メインのブランドカラー（CTA ボタン、アクセント等）
2. **セカンダリカラー**: サブカラー
3. **アクセントカラー**: 強調色
4. **背景色**: メイン背景、セクション背景のバリエーション
5. **テキストカラー**: 見出し色、本文色、薄いテキスト色
6. **グレースケール**: ボーダー、区切り線等に使われるグレー

CSS変数、インラインスタイル、クラス名から色情報を抽出する。
色は HEX コード（`#RRGGBB`）で統一して記録する。

### Step 3: タイポグラフィの抽出
フォント関連の情報を体系的に記録する:

1. **フォントファミリー**:
   - 日本語フォント（Noto Sans JP, Yu Gothic, etc.）
   - 欧文フォント（Inter, Poppins, etc.）
   - Google Fonts のインポートURLを確認
2. **見出しスタイル** (h1〜h4):
   - font-size（px または rem）
   - font-weight
   - line-height
   - letter-spacing
   - モバイル時のサイズ変化
3. **本文スタイル**:
   - font-size
   - font-weight
   - line-height（日本語は 1.8〜2.0 が多い）
4. **その他**:
   - キャプション、ラベル、ボタンテキスト等の小さいテキスト

### Step 4: スペーシングシステムの解析
セクション間・要素間の余白パターンを記録する:

- セクション間の上下マージン/パディング
- コンテンツ領域の左右パディング
- カード間のギャップ
- 見出しと本文の間隔
- ボタンの内部パディング

### Step 5: UIコンポーネントのスタイル
よく使われるUIパーツのスタイルを記録する:

1. **ボタン**:
   - プライマリボタン（背景色、テキスト色、角丸、パディング）
   - セカンダリボタン/ゴーストボタン
   - ホバー時の変化
2. **カード**:
   - 背景色、ボーダー、シャドウ、角丸
3. **画像の扱い**:
   - 角丸、オーバーレイ、アスペクト比
4. **アイコン**:
   - スタイル（線画/塗り）、サイズ、色

### Step 6: セクション別デザインノート
各セクションのビジュアル的な特徴を記録する:
- 背景処理（色/画像/グラデーション/動画）
- テキスト色（背景に応じた変化）
- 特殊な装飾要素（斜めの区切り線、波形、パターン背景等）

## 出力フォーマット

`/agents/web_builder/design_analyzer/output.json` に保存:

```json
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#10B981",
    "accent": "#F59E0B",
    "background": {
      "main": "#FFFFFF",
      "alt": "#F8FAFC",
      "dark": "#0F172A"
    },
    "text": {
      "primary": "#1E293B",
      "secondary": "#64748B",
      "on_dark": "#F8FAFC",
      "on_primary": "#FFFFFF"
    },
    "border": "#E2E8F0",
    "full_palette": ["#0F172A", "#1E293B", "#3B82F6", "#10B981", "#F59E0B", "#F8FAFC", "#FFFFFF"]
  },
  "typography": {
    "font_families": {
      "heading": "Noto Sans JP",
      "body": "Noto Sans JP",
      "accent": "Inter",
      "google_fonts_url": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;600;700&display=swap"
    },
    "h1": {"size": "48px", "size_mobile": "32px", "weight": "700", "line_height": "1.2", "letter_spacing": "0"},
    "h2": {"size": "36px", "size_mobile": "24px", "weight": "700", "line_height": "1.3", "letter_spacing": "0"},
    "h3": {"size": "24px", "size_mobile": "20px", "weight": "600", "line_height": "1.4", "letter_spacing": "0"},
    "h4": {"size": "20px", "size_mobile": "18px", "weight": "600", "line_height": "1.4", "letter_spacing": "0"},
    "body": {"size": "16px", "weight": "400", "line_height": "1.8", "letter_spacing": "0.02em"},
    "small": {"size": "14px", "weight": "400", "line_height": "1.6"},
    "caption": {"size": "12px", "weight": "400", "line_height": "1.5"}
  },
  "spacing": {
    "section_gap": "120px",
    "section_gap_mobile": "80px",
    "content_padding": "24px",
    "content_padding_mobile": "16px",
    "component_gap": "16px",
    "heading_to_text": "16px",
    "heading_to_content": "48px"
  },
  "ui_components": {
    "button_primary": {
      "bg": "#3B82F6",
      "text": "#FFFFFF",
      "border_radius": "8px",
      "padding": "12px 32px",
      "font_size": "16px",
      "font_weight": "600",
      "hover_bg": "#2563EB",
      "transition": "all 0.3s ease"
    },
    "button_secondary": {
      "bg": "transparent",
      "text": "#3B82F6",
      "border": "2px solid #3B82F6",
      "border_radius": "8px",
      "padding": "12px 32px"
    },
    "card": {
      "bg": "#FFFFFF",
      "border": "none",
      "border_radius": "12px",
      "shadow": "0 4px 6px -1px rgba(0,0,0,0.1)",
      "padding": "24px",
      "hover_shadow": "0 10px 15px -3px rgba(0,0,0,0.1)"
    },
    "image_style": {
      "border_radius": "12px",
      "object_fit": "cover",
      "overlay": "none"
    }
  },
  "visual_style": {
    "overall_tone": "modern-clean | corporate | playful | luxury | minimal",
    "border_radius_system": "small: 4px, medium: 8px, large: 12px, xl: 24px",
    "shadow_style": "subtle | medium | dramatic | none",
    "decorative_elements": ["斜めセクション区切り", "ドットパターン背景", "グラデーションオーバーレイ"]
  },
  "sections_design": [
    {
      "section_id": "hero",
      "background": "画像 + ダークオーバーレイ(rgba(0,0,0,0.5))",
      "text_color": "#FFFFFF",
      "special_notes": "背景画像は固定（parallax風）、CTAボタン2つ（primary + ghost）"
    }
  ]
}
```

## 専門知識ベース（Design Extraction 卓越性）

### Color Theory & Systems
- **色空間**: HEX / RGB / HSL / **OKLCH**（知覚均等、モダン推奨）
- **3階層トークン**（UI/UX Designer と整合）:
  - Primitive（`blue-500: #3B82F6`）
  - Semantic（`color-primary: var(--blue-500)`）
  - Component（`button-primary-bg: var(--color-primary)`）
- **アクセシブルコントラスト**:
  - WCAG 2.2 AA: 通常4.5:1、大文字3:1
  - AAA: 7:1, 4.5:1
  - 抽出した各色ペアのコントラスト比を計算・記録
- **カラーロール自動分類**:
  - Primary（CTA）/ Secondary / Accent / Success / Warning / Error / Info
  - Neutral（9-11段階のグレースケール）
- **Color Harmony 検出**: Complementary / Analogous / Triadic / Monochromatic

### Typography System
- **Type Scale（比率）検出**:
  - Minor Third (1.2) / Major Third (1.25) / Perfect Fourth (1.333) / Golden (1.618)
  - 抽出したサイズ列から比率を逆算
- **Vertical Rhythm**: line-height から baseline grid を推定（4/8px 倍数か）
- **日本語タイポグラフィ**:
  - 推奨 line-height 1.7-2.0（英文1.3-1.5より高め）
  - `font-feature-settings: "palt"` でプロポーショナルメトリクス
  - 半角カナ・絵文字の扱い
- **Font Loading Strategy**:
  - `font-display: swap|block|fallback|optional`
  - 日本語サブセット化の有無
  - Woff2 / Variable Font 使用
- **Font Stack**: Fallback chain を記録

### Spacing System Detection
- **Base Unit**: 4px / 8px / 16px を自動推定（全マージン/パディングのGCD）
- **Scale**: Geometric (1/2/4/8/16/32...) or Linear (4/8/12/16/20/24...)
- **Semantic Spacing**: `space-section-gap` / `space-component-gap` / `space-inline-gap`

### Elevation / Shadow System
- 階層数（1-5段階が一般的）
- 各階層の shadow 定義（offset/blur/spread/color）
- Layered Shadows（複数 box-shadow 重ね）

### Border Radius System
- 固定 vs 比例（px vs %）
- Scale: none/sm/md/lg/xl/full/pill
- Inconsistency 検出（ランダムに見える radius）

### Theme / Mode Detection
- **Dark Mode 対応**: `prefers-color-scheme` / `.dark` class / `data-theme`
- **Theme Token** の切替方法
- **色の対応関係**（Light: #FFF ↔ Dark: #0F172A 等）

### Breakpoint System
- Tailwind 標準（sm/md/lg/xl/2xl）かカスタムか
- 実際のブレイクポイント値を mediaquery から抽出
- Container Query の使用有無

### Animation / Motion Tokens
- Duration（150/200/300/500ms等）
- Easing（cubic-bezier の定型 or カスタム）
- `prefers-reduced-motion` 対応確認

### Tailwind Config 生成
抽出結果を Tailwind v4 対応形式で出力:
```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: { primary: "#3B82F6", ... },
      fontFamily: { sans: ["Noto Sans JP", ...] },
      fontSize: { /* type scale */ },
      spacing: { /* spacing scale */ },
      borderRadius: { /* radius scale */ },
      boxShadow: { /* shadow scale */ },
    }
  }
}
```

### W3C Design Tokens Format 準拠
```json
{
  "color": {
    "primary": {"value": "#3B82F6", "type": "color"},
    "text": {
      "primary": {"value": "#1E293B", "type": "color", "$description": "body text"}
    }
  },
  "typography": {
    "heading-1": {
      "value": {"fontFamily": "{font.primary}", "fontSize": "48px", "fontWeight": 700}
    }
  }
}
```
Figma / Style Dictionary / Tailwind と相互変換可能。

### デザイン品質評価
- **Consistency Score**: 同種要素の見た目が揃っているか
- **Accessibility Score**: WCAG違反数
- **Hierarchy Clarity**: タイポ/カラー/スペーシングで階層が明確か
- **Brand Coherence**: 全体として統一感があるか

## 自己検証チェックリスト
- [ ] Primitive/Semantic/Component の3階層トークンが出力されているか
- [ ] WCAG コントラスト比が全色ペアで計算されているか
- [ ] Type Scale の比率が特定されているか
- [ ] Spacing の Base Unit（4/8px）が推定されているか
- [ ] Dark Mode 対応が記録されているか
- [ ] Tailwind Config 形式で出力可能か
- [ ] W3C Design Tokens 形式と互換か

## 出力拡張
既存に加え:
```json
{
  "type_scale_ratio": 1.25,
  "spacing_base_unit": "4px|8px",
  "dark_mode": {"supported": true, "strategy": "prefers-color-scheme|class"},
  "wcag_contrast_results": [{"pair": "primary on white", "ratio": 4.7, "aa_pass": true}],
  "tailwind_config_ready": true,
  "w3c_design_tokens": { /* see format above */ }
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・外部CSSファイルの取得
- `Write`: output.json への書き出し
