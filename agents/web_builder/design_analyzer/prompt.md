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

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・外部CSSファイルの取得
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: 抽出したデザイントークン（カラー・タイポ・スペース）が実装で正しく使えるか検証
- **UI/UX Designer**: デザインシステム観点での妥当性・一貫性レビュー
- **Designer**: カラー/タイポ分類の質感と整合するかレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証

## Tailwind CSS マッピング自動化

### カラー → Tailwind クラスマッピング
抽出した全カラー値を Tailwind CSS の設定形式に自動変換する:

**マッピングルール:**
```javascript
// tailwind.config.ts への出力形式
colors: {
  primary: {
    DEFAULT: '#3B82F6',     // メインブランドカラー
    hover: '#2563EB',       // ホバー時（10%暗く）
    light: '#DBEAFE',       // 薄いバリエーション（背景用）
    dark: '#1D4ED8',        // 濃いバリエーション
  },
  secondary: { ... },
  accent: { ... },
  background: {
    DEFAULT: '#FFFFFF',
    alt: '#F8FAFC',
    dark: '#0F172A',
  },
  text: {
    DEFAULT: '#1E293B',
    muted: '#64748B',
    inverted: '#F8FAFC',
  },
}
```

### スペーシング → Tailwind スケール変換
抽出した余白値を Tailwind のスペーシングスケールに最も近い値にマッピングする:

| 実測値 | Tailwind クラス | 実際の値 |
|--------|---------------|---------|
| 4px | `p-1` / `m-1` | 4px (0.25rem) |
| 8px | `p-2` / `m-2` | 8px (0.5rem) |
| 12px | `p-3` / `m-3` | 12px (0.75rem) |
| 16px | `p-4` / `m-4` | 16px (1rem) |
| 24px | `p-6` / `m-6` | 24px (1.5rem) |
| 32px | `p-8` / `m-8` | 32px (2rem) |
| 48px | `p-12` / `m-12` | 48px (3rem) |
| 64px | `p-16` / `m-16` | 64px (4rem) |
| 80px | `p-20` / `m-20` | 80px (5rem) |
| 120px | `p-[120px]` | カスタム値 |

### タイポグラフィ → Tailwind 設定生成
```javascript
// tailwind.config.ts への出力形式
fontSize: {
  'hero': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
  'h2': ['36px', { lineHeight: '1.3', fontWeight: '700' }],
  'h3': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
  'body': ['16px', { lineHeight: '1.8', letterSpacing: '0.02em' }],
  'small': ['14px', { lineHeight: '1.6' }],
  'caption': ['12px', { lineHeight: '1.5' }],
}
```

### シャドウ → Tailwind ユーティリティマッピング
| 実測シャドウ値 | Tailwind クラス | 用途 |
|-------------|---------------|------|
| `0 1px 2px rgba(0,0,0,0.05)` | `shadow-sm` | 微細なシャドウ |
| `0 1px 3px rgba(0,0,0,0.1)` | `shadow` | デフォルト |
| `0 4px 6px rgba(0,0,0,0.1)` | `shadow-md` | カード |
| `0 10px 15px rgba(0,0,0,0.1)` | `shadow-lg` | ホバー時 |
| `0 20px 25px rgba(0,0,0,0.1)` | `shadow-xl` | モーダル |
| カスタム値 | `shadow-[値]` | `tailwind.config.ts` に追加 |

## ダークモード対応分析

### ダークモード検出
参考サイトでのダークモード実装の有無と方式を検出する:

**検出ポイント:**
- `@media (prefers-color-scheme: dark)` のCSS定義
- `<html class="dark">` / `data-theme="dark"` の切り替え機構
- ダークモードトグルボタン（月/太陽アイコン等）の有無
- CSS カスタムプロパティによるテーマ変数の二重定義

**ダークモードが検出された場合の出力:**
```json
{
  "dark_mode": {
    "detected": true,
    "method": "class-based | media-query | css-variables",
    "toggle_ui": true,
    "colors_dark": {
      "background": { "main": "#0F172A", "alt": "#1E293B" },
      "text": { "primary": "#F8FAFC", "secondary": "#94A3B8" },
      "border": "#334155"
    }
  }
}
```

### カラーパレットのデュアル定義
ライト/ダーク両モードのカラーを CSS カスタムプロパティで定義:
```css
:root {
  --color-bg: #FFFFFF;
  --color-text: #1E293B;
}
.dark {
  --color-bg: #0F172A;
  --color-text: #F8FAFC;
}
```

### CSS カスタムプロパティによるテーマ切り替え
Tailwind CSS v4 での推奨実装パターン:
- `@theme` ディレクティブでカスタムプロパティを定義
- `dark:` バリアントで上書き
- `next-themes` ライブラリとの連携方法を記録

## マイクロインタラクションスタイル

### 微細な UI フィードバックパターン
参考サイトで使用されている繊細なインタラクションフィードバックを検出・記録する:

**ボタンフィードバック:**
- プレス時の `scale(0.98)` / `translateY(1px)` 効果
- リップルエフェクト（Material Design風）
- ローディング中のスピナー表示

**入力フィードバック:**
- フォーカス時のボーダーカラー変化 + `ring` エフェクト
- フローティングラベル（placeholder → label 遷移）
- 入力値の有無によるスタイル変化

### ローディング状態デザイン
- **スピナー**: サイズ、色、回転速度
- **プログレスバー**: 幅、色、アニメーション
- **パルスアニメーション**: ボタンの「処理中」表示パターン

### スケルトンスクリーン
コンテンツ読み込み中のプレースホルダー表示パターン:
- スケルトンの形状（テキスト行、画像矩形、カード）
- アニメーション（パルス / シマー / ウェーブ）
- 背景色とハイライト色の組み合わせ

### エンプティステートデザイン
データが存在しない場合の表示パターン:
- イラスト/アイコンの使用
- メッセージテキストのスタイル
- アクションボタン（「データを追加」等）の配置
