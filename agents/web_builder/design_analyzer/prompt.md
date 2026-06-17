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
- `prefers-color-scheme: dark` メディアクエリの有無と定義内容
- `@media` ブレークポイントの閾値一覧

### Step 2: カラーパレットの抽出
サイト全体で使用されているカラーを分類する（HEXコード `#RRGGBB` で統一）:

1. **プライマリカラー**: メインのブランドカラー（CTA ボタン、アクセント等）
2. **セカンダリ/アクセントカラー**: サブカラー、強調色
3. **背景色**: メイン背景、セクション背景のバリエーション
4. **テキストカラー**: 見出し色、本文色、薄いテキスト色
5. **グレースケール**: ボーダー、区切り線等に使われるグレー
6. **ダークモード**: `prefers-color-scheme: dark` またはクラス切替（`.dark`）で
   定義されたカラートークンを `colors.dark_mode` に別途抽出。背景・テキスト・
   ボーダーの反転パターン、切替方式（メディアクエリ / クラスベース）を記録
7. **グラデーション**: `linear-gradient` / `radial-gradient` を方向・角度・
   カラーストップ・使用箇所付きで `colors.gradients` 配列に記録

### Step 3: タイポグラフィの抽出
フォント関連の情報を体系的に記録する:

1. **フォントファミリー**: 日本語（Noto Sans JP等）・欧文（Inter等）・Google Fonts URL
2. **見出しスタイル** (h1〜h4): font-size（PC/モバイル）, weight, line-height, letter-spacing
3. **本文スタイル**: font-size, weight, line-height（日本語は 1.8〜2.0 が多い）
4. **その他**: キャプション、ラベル、ボタンテキスト等
5. **マイクロタイポグラフィ**: text-transform, font-feature-settings（`palt`, `pkna`
   等の和文詰め設定）, font-variant, word-break/overflow-wrap パターンを記録
6. **レスポンシブ型スケール**: ブレークポイント別（sm/md/lg/xl）のフォントサイズ
   変化を検出。`clamp()` / `fluid typography` 使用の有無、型スケール比率
   （major third 1.25 等）を特定し `typography.responsive_scale` に出力

### Step 4: スペーシングシステムの解析
セクション間・要素間の余白パターンを記録する:

- セクション間の上下マージン/パディング
- コンテンツ領域の左右パディング
- カード間のギャップ
- 見出しと本文の間隔
- ボタンの内部パディング

### Step 5: UIコンポーネントのスタイル
1. **ボタン**: プライマリ（背景色/テキスト色/角丸/パディング/ホバー）、セカンダリ/ゴースト
2. **カード**: 背景色、ボーダー、シャドウ、角丸
3. **画像**: 角丸、オーバーレイ、アスペクト比
4. **アイコン**: スタイル（線画/塗り）、サイズ、色
5. **入力フィールド**: ボーダー、角丸、フォーカス時のスタイル変化

### Step 6: セクション別デザインノート
各セクションのビジュアル的な特徴を記録する:
- 背景処理（色/画像/グラデーション/動画）
- テキスト色（背景に応じた変化）
- 特殊な装飾要素（斜めの区切り線、波形、パターン背景等）

### Step 7: デザイン一貫性スコアリング
参考サイト自体のデザイン一貫性を 0.0〜1.0 で評価し `design_consistency` に出力する。
Builder が参考サイトの不整合を盲目的に再現しないための品質ゲートとして機能する。

- **カラー一貫性**: 定義済みパレット外の色がどの程度使われているか
- **タイポ一貫性**: 型スケールから逸脱するフォントサイズの割合
- **スペーシング一貫性**: 8px/4px グリッドへの準拠度
- **コンポーネント一貫性**: 同種コンポーネント間のスタイル差異
- 各カテゴリの `anomalies` に具体的な不整合箇所を列挙する
- スコアが 0.6 未満の場合、`normalize_instructions` で正規化方針を明記し、
  Builder に「参考サイトの不整合箇所は正規化して再現」と指示

## 出力フォーマット

`/agents/web_builder/design_analyzer/output.json` に保存:

```json
{
  "colors": {
    "primary": "#3B82F6", "secondary": "#10B981", "accent": "#F59E0B",
    "background": { "main": "#FFFFFF", "alt": "#F8FAFC", "dark": "#0F172A" },
    "text": { "primary": "#1E293B", "secondary": "#64748B", "on_dark": "#F8FAFC", "on_primary": "#FFFFFF" },
    "border": "#E2E8F0",
    "full_palette": ["#0F172A", "#1E293B", "#3B82F6", "#10B981", "#F59E0B", "#F8FAFC", "#FFFFFF"],
    "dark_mode": {
      "enabled": true,
      "background": { "main": "#0F172A", "alt": "#1E293B" },
      "text": { "primary": "#F1F5F9", "secondary": "#94A3B8" },
      "border": "#334155"
    },
    "gradients": [
      { "type": "linear", "direction": "135deg", "stops": ["#3B82F6 0%", "#8B5CF6 100%"], "usage": "hero-bg" }
    ]
  },
  "typography": {
    "font_families": {
      "heading": "Noto Sans JP", "body": "Noto Sans JP", "accent": "Inter",
      "google_fonts_url": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;600;700&display=swap"
    },
    "h1": { "size": "48px", "size_mobile": "32px", "weight": "700", "line_height": "1.2", "letter_spacing": "0" },
    "h2": { "size": "36px", "size_mobile": "24px", "weight": "700", "line_height": "1.3", "letter_spacing": "0" },
    "h3": { "size": "24px", "size_mobile": "20px", "weight": "600", "line_height": "1.4", "letter_spacing": "0" },
    "h4": { "size": "20px", "size_mobile": "18px", "weight": "600", "line_height": "1.4", "letter_spacing": "0" },
    "body": { "size": "16px", "weight": "400", "line_height": "1.8", "letter_spacing": "0.02em" },
    "small": { "size": "14px", "weight": "400", "line_height": "1.6" },
    "caption": { "size": "12px", "weight": "400", "line_height": "1.5" },
    "micro": {
      "text_transform": "none | uppercase | capitalize",
      "font_feature_settings": "'palt' 1",
      "word_break": "break-all | keep-all"
    },
    "responsive_scale": {
      "method": "clamp | breakpoint-steps",
      "ratio": "1.25",
      "fluid_example": "clamp(1.5rem, 1rem + 2vw, 3rem)",
      "breakpoints": { "sm": "640px", "md": "768px", "lg": "1024px", "xl": "1280px" }
    }
  },
  "spacing": {
    "section_gap": "120px", "section_gap_mobile": "80px",
    "content_padding": "24px", "content_padding_mobile": "16px",
    "component_gap": "16px", "heading_to_text": "16px", "heading_to_content": "48px"
  },
  "ui_components": {
    "button_primary": {
      "bg": "#3B82F6", "text": "#FFFFFF", "border_radius": "8px",
      "padding": "12px 32px", "font_size": "16px", "font_weight": "600",
      "hover_bg": "#2563EB", "transition": "all 0.3s ease"
    },
    "button_secondary": {
      "bg": "transparent", "text": "#3B82F6", "border": "2px solid #3B82F6",
      "border_radius": "8px", "padding": "12px 32px"
    },
    "card": {
      "bg": "#FFFFFF", "border": "none", "border_radius": "12px",
      "shadow": "0 4px 6px -1px rgba(0,0,0,0.1)", "padding": "24px",
      "hover_shadow": "0 10px 15px -3px rgba(0,0,0,0.1)"
    },
    "image_style": { "border_radius": "12px", "object_fit": "cover", "overlay": "none" }
  },
  "visual_style": {
    "overall_tone": "modern-clean | corporate | playful | luxury | minimal",
    "border_radius_system": "small: 4px, medium: 8px, large: 12px, xl: 24px",
    "shadow_style": "subtle | medium | dramatic | none",
    "decorative_elements": ["斜めセクション区切り", "ドットパターン背景", "グラデーションオーバーレイ"]
  },
  "design_consistency": {
    "overall": 0.85,
    "color": 0.9, "typography": 0.8, "spacing": 0.85, "component": 0.85,
    "anomalies": ["h2が2箇所で異なるweight使用", "フッターのみパレット外の灰色"],
    "normalize_instructions": "フッター灰色を border トークンに統一"
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

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・外部CSSファイルの取得
- `Write`: output.json への書き出し

## デザイン基準マッピング（必須）

抽出したカラー・タイポ・モーションは、社内の基準DESIGN.md（`design-md/` 配下）と照合し、最も近い基準を `baseline_match` フィールドで出力する。Builder の fallback 判断に使われる。

```json
{
  "baseline_match": {
    "best_fit": "feer | linear.app | framer | notion | airbnb | custom",
    "confidence": 0.0,
    "rationale": "言語が日本語、warm orange単色アクセント、エディトリアルメタ表示が多いため feer に最も近い",
    "deviations": ["ダークモード対応がある点が feer と異なる"]
  }
}
```

**判断ヒント:**
- 日本語コーポレート / 採用 / B2Bサービスサイト → 多くの場合 **`feer`**（`/design-md/feer/DESIGN.md`）が最も近い。クリーム背景・墨黒本文・単色オレンジ系アクセント・角括弧見出し・ナンバリングメタが揃えば confidence 0.7+
- ダーク × ブルー / ネオン → `linear.app` / `framer`
- 暖色 + 写真主体 → `airbnb` / `notion`
- 該当なし → `custom`（その場合は Builder にゼロから作らせる）
