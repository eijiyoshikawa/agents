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

### Step 2.5: カラー抽出の高度化

#### HSL色空間での分析
抽出した全カラーをHSL（色相・彩度・明度）でも記録し、カラーシステムの設計意図を読み解く:

```json
{
  "color_analysis": {
    "primary": {
      "hex": "#3B82F6",
      "hsl": "217, 91%, 60%",
      "role": "CTA・アクセント"
    },
    "primary_hover": {
      "hex": "#2563EB",
      "hsl": "217, 91%, 54%",
      "role": "ホバー時（明度-6%）"
    }
  }
}
```

**HSL分析で読み取るパターン:**
- 同一色相・彩度で明度のみ変えたバリエーション → 単一色相システム
- 補色・分裂補色・トライアド配色 → 配色戦略の特定
- 彩度が一定 → トーンオントーン配色
- グレースケールの色相傾向（暖色寄りグレー / 寒色寄りグレー）

#### WCAG コントラスト比の自動計算
主要なテキスト/背景の組み合わせについてコントラスト比を計算し、WCAG 2.1 AA 準拠を判定する:

| 組み合わせ | コントラスト比 | AA基準（通常テキスト） | AA基準（大テキスト） | 判定 |
|-----------|-------------|---------------------|--------------------|----|
| テキスト(#1E293B) / 背景(#FFFFFF) | 12.63:1 | 4.5:1 | 3:1 | PASS |
| テキスト(#FFFFFF) / primary(#3B82F6) | 3.46:1 | 4.5:1 | 3:1 | FAIL(通常) / PASS(大) |
| secondary(#64748B) / 背景(#FFFFFF) | 4.56:1 | 4.5:1 | 3:1 | PASS |

**コントラスト比の算出式:**
`(L1 + 0.05) / (L2 + 0.05)` （L1, L2 は相対輝度、L1 >= L2）

**判定基準:**
- AA 通常テキスト（18px未満）: 4.5:1 以上
- AA 大テキスト（18px以上 or 14px太字以上）: 3:1 以上
- AAA 通常テキスト: 7:1 以上

参考サイトでFAILとなる組み合わせは `contrast_issues` フィールドに記録し、Builder が改善すべき箇所として引き渡す。

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

### Step 3.5: タイポグラフィ分析の深化

#### font-feature-settings の検出
OpenType 機能の使用状況を確認する:

| 機能 | CSS値 | 用途 |
|------|-------|------|
| `palt` | `"palt" 1` | プロポーショナルメトリクス（日本語の詰め組み。和文サイトでは必須） |
| `kern` | `"kern" 1` | カーニング（欧文文字間調整） |
| `liga` | `"liga" 1` | 標準合字（fi, fl 等） |
| `cv01` | `"cv01" 1` | 文字バリエーション（Inter の代替 "a" 等） |
| `ss01`〜`ss03` | `"ss01" 1` | スタイリスティックセット |
| `tnum` | `"tnum" 1` | 等幅数字（テーブル・価格表示に有用） |

#### Variable Fonts の検出
可変フォントの使用を確認し、軸の範囲を記録する:

```json
{
  "variable_fonts": {
    "detected": true,
    "fonts": [
      {
        "family": "Inter",
        "axes": {
          "wght": {"min": 100, "max": 900},
          "slnt": {"min": -10, "max": 0},
          "opsz": {"min": 14, "max": 32}
        },
        "format": "woff2-variations",
        "size_benefit": "1ファイルで全ウェイト対応。個別ウェイト読み込みより効率的"
      }
    ]
  }
}
```

#### line-height / letter-spacing の数値抽出
見出しから本文まで全レベルの値を精密に記録する:

```json
{
  "typography_metrics": {
    "h1": {"line_height": 1.2, "letter_spacing": "-0.02em", "font_feature": "\"palt\" 1"},
    "h2": {"line_height": 1.3, "letter_spacing": "-0.015em", "font_feature": "\"palt\" 1"},
    "body": {"line_height": 1.8, "letter_spacing": "0.04em", "font_feature": "\"palt\" 1"},
    "caption": {"line_height": 1.5, "letter_spacing": "0.02em"},
    "button": {"line_height": 1.0, "letter_spacing": "0.05em", "text_transform": "none"}
  }
}
```

### Step 4: スペーシングシステムの解析
セクション間・要素間の余白パターンを記録する:

- セクション間の上下マージン/パディング
- コンテンツ領域の左右パディング
- カード間のギャップ
- 見出しと本文の間隔
- ボタンの内部パディング

### Step 4.5: スペーシングシステムの推定

#### ベース単位の判定
サイト全体で使用されている余白値を収集し、基盤となるベース単位を推定する:

**判定手順:**
1. 全CSSから `margin`, `padding`, `gap`, `top`, `right`, `bottom`, `left` の数値を抽出
2. 出現頻度の高い値を列挙
3. 最大公約数的なベース単位を算出

| ベース | 出現する値の例 | 判定 |
|--------|--------------|------|
| **4px** | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 | 4px 倍数 |
| **8px** | 8, 16, 24, 32, 48, 64, 80, 96, 120 | 8px 倍数 |
| **混在** | 5, 10, 15, 20, 30, 50 | 5px 倍数 or カスタム |

#### セクション間リズムの数値化
ページ内の各セクション間スペーシングを順番に記録し、リズムパターンを特定する:

```json
{
  "spacing_system": {
    "base_unit": 8,
    "scale": [0, 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 120, 160],
    "section_rhythm": [
      {"between": "hero → features", "spacing": "120px", "ratio": "15x"},
      {"between": "features → about", "spacing": "120px", "ratio": "15x"},
      {"between": "about → CTA", "spacing": "80px", "ratio": "10x"},
      {"between": "CTA → footer", "spacing": "0px", "ratio": "0x"}
    ],
    "rhythm_consistency": "high（120px が支配的、CTAセクション前のみ縮小）",
    "inner_spacing": {
      "heading_to_subtext": "16px（2x）",
      "subtext_to_content": "48px（6x）",
      "card_gap": "24px（3x）",
      "list_item_gap": "16px（2x）"
    }
  }
}
```

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
  "color_analysis": {
    "primary": {"hex": "#3B82F6", "hsl": "217, 91%, 60%"},
    "color_system_type": "single-hue | complementary | triadic | analogous",
    "gray_temperature": "cool（寒色寄り）| warm（暖色寄り）| neutral"
  },
  "contrast_check": [
    {"pair": "text.primary / background.main", "ratio": 12.63, "aa_normal": "PASS", "aa_large": "PASS"},
    {"pair": "text.on_primary / primary", "ratio": 3.46, "aa_normal": "FAIL", "aa_large": "PASS"}
  ],
  "contrast_issues": [
    {"pair": "text.on_primary / primary", "current_ratio": 3.46, "required": 4.5, "suggestion": "primary を #2563EB に暗くするか、テキストサイズ18px以上に限定"}
  ],
  "typography": {
    "font_families": {
      "heading": "Noto Sans JP",
      "body": "Noto Sans JP",
      "accent": "Inter",
      "google_fonts_url": "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Inter:wght@400;600;700&display=swap"
    },
    "font_features": {
      "global": "\"palt\" 1, \"kern\" 1",
      "headings": "\"palt\" 1",
      "numbers": "\"tnum\" 1"
    },
    "variable_fonts": {
      "detected": false,
      "fonts": []
    },
    "h1": {"size": "48px", "size_mobile": "32px", "weight": "700", "line_height": "1.2", "letter_spacing": "-0.02em"},
    "h2": {"size": "36px", "size_mobile": "24px", "weight": "700", "line_height": "1.3", "letter_spacing": "-0.015em"},
    "h3": {"size": "24px", "size_mobile": "20px", "weight": "600", "line_height": "1.4", "letter_spacing": "0"},
    "h4": {"size": "20px", "size_mobile": "18px", "weight": "600", "line_height": "1.4", "letter_spacing": "0"},
    "body": {"size": "16px", "weight": "400", "line_height": "1.8", "letter_spacing": "0.04em"},
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
  "spacing_system": {
    "base_unit": 8,
    "scale": [0, 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 120, 160],
    "rhythm_consistency": "high"
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
  ],
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


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: デザイントークンが実装に十分な精度で抽出されているか検証
- **Web Builder / structure_analyzer**: レイアウトとデザイントークンの整合性を相互検証
- **UI/UX Designer**: カラーシステム・タイポグラフィ・スペーシングの設計妥当性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
