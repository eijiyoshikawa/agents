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
- `<link rel="stylesheet">` の外部CSS、`<style>` のインラインCSS
- CSSカスタムプロパティ（`--primary-color` 等）の定義
- `:root` / `body` のグローバルスタイル
- **ダークモードパターン検出**: `prefers-color-scheme: dark` / `.dark` クラス / `data-theme`

### Step 2: カラーパレット抽出
1. **プライマリ / セカンダリ / アクセント**: ブランドカラー
2. **背景色**: メイン / セクション交互 / ダーク背景
3. **テキスト**: 見出し色 / 本文色 / 薄テキスト
4. **グレースケール**: ボーダー / 区切り線 / disabled
5. **コントラスト比検証**: テキスト/背景の組み合わせがWCAG AA基準（4.5:1以上）を満たすか記録
6. **カラーハーモニー**: 補色/類似色/トライアド等のパターン識別
- 色はHEXコード統一。ダークモード対応時はライト/ダーク両パレットを抽出

### Step 3: タイポグラフィ抽出
- **フォントファミリー**: 日本語 / 欧文 / Google Fonts URL
- **見出しスタイル** (h1〜h4): size / weight / line-height / letter-spacing / モバイル時変化
- **本文**: size / weight / line-height（日本語は1.8〜2.0が多い）
- **その他**: キャプション / ラベル / ボタンテキスト
- **フルードタイポグラフィ検出**: `clamp()` / `calc()` によるレスポンシブフォントサイズの使用有無

### Step 4: スペーシングシステム解析
- セクション間上下マージン/パディング
- コンテンツ領域左右パディング、カード間ギャップ
- **グリッドシステム検出**: 8pxグリッド / 4pxグリッド / 不規則
- **モジュラースケール**: spacing値が一定の比率（1.5倍等）に従っているか

### Step 5: UIコンポーネントスタイル
1. **ボタン**: primary / secondary / ghost（bg, text, radius, padding, hover変化）
2. **カード**: bg / border / shadow / radius（hover時の変化含む）
3. **画像**: radius / overlay / aspect-ratio
4. **アイコン**: スタイル（線画/塗り） / サイズ / 色

### Step 6: セクション別デザインノート
各セクションの背景処理・テキスト色・特殊装飾（斜めの区切り線、波形、パターン背景等）

## デザイン基準マッピング（必須）

抽出結果を社内の基準DESIGN.md（`design-md/` 配下）と照合:
- 日本語コーポレート/B2B → 多くの場合 **`feer`** が最も近い
- ダーク×ブルー/ネオン → `linear.app` / `framer`
- 暖色+写真主体 → `airbnb` / `notion`
- 該当なし → `custom`

## 出力フォーマット

`/agents/web_builder/design_analyzer/output.json` に保存:

```json
{
  "colors": {
    "primary": "#HEX", "secondary": "#HEX", "accent": "#HEX",
    "background": {"main": "#HEX", "alt": "#HEX", "dark": "#HEX"},
    "text": {"primary": "#HEX", "secondary": "#HEX", "on_dark": "#HEX"},
    "border": "#HEX",
    "contrast_issues": [{"fg": "#HEX", "bg": "#HEX", "ratio": 0.0, "passes_aa": false}],
    "dark_mode": {"detected": false, "method": "prefers-color-scheme | class | none"}
  },
  "typography": {
    "font_families": {"heading": "", "body": "", "accent": "", "google_fonts_url": ""},
    "h1": {"size": "", "size_mobile": "", "weight": "", "line_height": "", "letter_spacing": ""},
    "h2": {}, "h3": {}, "h4": {},
    "body": {"size": "", "weight": "", "line_height": "", "letter_spacing": ""},
    "small": {}, "caption": {},
    "fluid_typography": false
  },
  "spacing": {
    "section_gap": "", "section_gap_mobile": "",
    "content_padding": "", "content_padding_mobile": "",
    "grid_system": "8px | 4px | irregular",
    "modular_scale": "none | ratio"
  },
  "ui_components": {
    "button_primary": {"bg": "", "text": "", "border_radius": "", "padding": "", "hover_bg": "", "transition": ""},
    "button_secondary": {},
    "card": {"bg": "", "border_radius": "", "shadow": "", "hover_shadow": ""},
    "image_style": {"border_radius": "", "object_fit": "cover"}
  },
  "visual_style": {
    "overall_tone": "modern-clean | corporate | playful | luxury | minimal",
    "border_radius_system": "統一された段階数と値",
    "shadow_style": "subtle | medium | dramatic | none"
  },
  "baseline_match": {
    "best_fit": "feer | linear.app | framer | notion | airbnb | custom",
    "confidence": 0.0,
    "rationale": "",
    "deviations": []
  }
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・外部CSSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: デザイントークンがTailwind設定に正しく変換されるか検証
- **Web Builder / structure_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **UI/UX Designer**: カラーコントラスト・タイポグラフィのアクセシビリティ検証
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
