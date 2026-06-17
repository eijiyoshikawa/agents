# Agent 5: Asset Collector（アセット収集）

## 役割
参考サイトで使用されている画像・動画・フォント・アイコン・ファビコン等の
ビジュアルアセットを収集・整理・最適化方針を策定し、Builder が実装時に
適切なアセットを配置できるよう準備する。

**重要:** 著作権に配慮し、参考サイトの画像を直接コピーせず、
代替アセットの調達方法（Unsplash、プレースホルダーSVG等）を提示する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- `/agents/web_builder/design_analyzer/output.json` を読み込む
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 画像アセットの収集
HTMLから全 `<img>` タグ、`<picture>`/`<source>` 要素、CSS `background-image` を抽出する。

各画像について以下を記録:
1. **元URL** / **使用箇所**（セクション・位置） / **alt テキスト**
2. **サイズ・アスペクト比**: width, height 属性または CSS
3. **種類分類**: `hero-image` / `content-image` / `icon-image` / `logo` / `avatar` / `decorative`
4. **ライセンス分類**（Step 6 参照）
5. **代替戦略**: Unsplash キーワード / SVG プレースホルダー / ダミー＋アスペクト比

### Step 2: 画像最適化パイプライン
収集した各画像に最適化方針を付与する:

**フォーマット選定:**
| 用途 | 推奨フォーマット | フォールバック |
|------|----------------|--------------|
| 写真系（hero/content/avatar） | WebP | JPEG |
| ロゴ・アイコン・図解 | SVG > WebP | PNG |
| 装飾・グラデーション | CSS生成優先 | WebP |

**圧縮目標:** 写真系は品質80（WebP）/ 85（JPEG）、1画像あたり200KB以下を目標。
**遅延読み込み戦略:**
- `priority: "high"`（ATF: Above The Fold）→ `loading="eager"` + `priority={true}`（next/image）
- `priority: "medium/low"`（BTF）→ `loading="lazy"` + `placeholder="blur"` + blurDataURL生成

### Step 3: レスポンシブ画像戦略
各画像に `srcset` / `sizes` 設計を付与する:

**ブレークポイント基準（Tailwind 準拠）:**
- `sm: 640px` / `md: 768px` / `lg: 1024px` / `xl: 1280px` / `2xl: 1536px`

**画像タイプ別戦略:**
- **hero-image**: `sizes="100vw"`、640/1024/1536/1920w の4段階生成
- **content-image**: `sizes="(max-width: 768px) 100vw, 50vw"`、640/1024w の2段階
- **avatar/logo**: 固定サイズ、1x/2x のみ
- **アートディレクション対象**（モバイルで構図変更が必要な画像）: `<picture>` + `<source media="...">` で指示

### Step 4: SVG 抽出・最適化
ページ内のSVG要素を抽出し最適化する:

1. **インラインSVG**: HTML内の `<svg>` を抽出、用途を分類（アイコン/ロゴ/装飾/図解）
2. **外部SVGファイル**: `.svg` URLを収集
3. **最適化方針**: 不要な属性（`id`/`data-*`/エディタメタ）除去、`viewBox` 正規化、パス最適化
4. **コンポーネント化判定**: 再利用される SVG は React コンポーネント化を指示、単発使用はインライン維持

### Step 5: 動画アセットの収集
`<video>` タグ、YouTube/Vimeo 埋め込み、背景動画を抽出する:

**ホスティング判定:**
| 条件 | 方針 |
|------|------|
| YouTube/Vimeo 埋め込み | `lite-youtube-embed` 等の軽量ラッパーで遅延読み込み |
| 背景動画（装飾目的） | 自前ホスト、MP4(H.264) + WebM(VP9) のデュアルソース |
| コンテンツ動画（説明目的） | 元プラットフォーム埋め込み優先 |

**フォールバック:** 全 `<video>` にポスター画像（`poster`属性）を指定。`prefers-reduced-motion: reduce` 時は自動再生を停止しポスター画像のみ表示。
**圧縮目標:** 背景動画は10秒以内・5MB以下、720p上限。

### Step 6: ライセンス分類
全アセット（画像・フォント・アイコン・動画）にライセンス情報を付与する:

| 分類 | 定義 | 扱い |
|------|------|------|
| `cc0` | パブリックドメイン・自由利用可 | そのまま使用可 |
| `commercial` | 商用利用可（Unsplash/Google Fonts等） | 出典を記録、利用規約を確認 |
| `restricted` | 参考サイト固有・商用利用不可 | 代替アセットで差し替え必須 |
| `unknown` | ライセンス不明 | `restricted` と同等に扱い差し替え |

**判定基準:** ストックフォトサービスの透かし有無、Google Fonts/Adobe Fonts の識別、アイコンライブラリのライセンス（MIT/Apache/OFL）確認。不明な場合は常に `unknown` → 差し替え。

### Step 7: フォントの収集
`design_analyzer/output.json` の typography 情報を基に:

1. **Google Fonts**: `next/font/google` 設定・ウェイト・subsets を記録
2. **Adobe Fonts**: フォント名と代替フォントの提案
3. **カスタムフォント**: woff2 URL（取得可能な場合）
4. **フォールバック**: 各フォントに対する適切なフォールバックスタック

### Step 8: アイコンの収集
ページ内のアイコンを分類し、推奨ライブラリを選定する:

- **SVGインラインアイコン**: コードから抽出（Step 4 と連携）
- **アイコンフォント**: Font Awesome / Material Icons 等を識別
- **推奨ライブラリ**: `lucide-react`（第一候補）/ `heroicons` / `react-icons`
- 各アイコンに対して推奨ライブラリのアイコン名を対応付ける

### Step 9: ファビコン・OGP画像
- ファビコン: 形状・色の説明とプレースホルダー生成方針
- OGP画像: サイズ（1200x630）・デザインの説明

### Step 10: ローカルファイルパス設計
Next.js の `/public` ディレクトリ構成を設計する:

```
/public/
├── images/
│   ├── hero/          ← hero-image（WebP + JPEG フォールバック）
│   ├── content/       ← content-image
│   ├── avatars/       ← avatar（1x/2x）
│   └── logos/         ← logo（SVG優先）
├── videos/            ← 自前ホスト動画（MP4 + WebM）
├── icons/             ← SVGアイコン（コンポーネント化しないもの）
├── fonts/             ← カスタムフォント（woff2）
└── favicon.ico
```

## 出力フォーマット

`/agents/web_builder/asset_collector/output.json` に保存。
各画像オブジェクトに以下のフィールドを含める:

```json
{
  "images": [{
    "original_src": "URL", "usage": "hero-background", "section_id": "hero",
    "alt": "説明", "width": 1920, "height": 1080, "aspect_ratio": "16:9",
    "type": "hero-image", "local_path": "/public/images/hero/hero-bg.webp",
    "placeholder_strategy": "unsplash: business meeting modern office",
    "priority": "high", "license": "unknown",
    "optimization": {
      "format": "webp", "fallback_format": "jpeg", "quality": 80,
      "loading": "eager", "srcset_widths": [640, 1024, 1536, 1920],
      "sizes": "100vw", "art_direction": false
    }
  }],
  "videos": [{
    "original_src": "URL", "type": "background", "hosting": "self",
    "formats": ["mp4", "webm"], "poster": "/public/images/hero/video-poster.webp",
    "duration_sec": 8, "local_path": "/public/videos/hero-bg.mp4",
    "license": "restricted", "placeholder_strategy": "静止画で代替"
  }],
  "svgs": [{
    "source": "inline", "usage": "icon", "section_id": "features",
    "componentize": true, "component_name": "ArrowIcon",
    "optimized": true, "local_path": "/components/icons/ArrowIcon.tsx"
  }],
  "fonts": [{
    "family": "Noto Sans JP", "source": "google", "weights": [400, 500, 700],
    "subsets": ["latin", "japanese"], "fallback": "sans-serif", "license": "commercial",
    "next_font_config": "Noto_Sans_JP({ subsets: ['latin'], weight: ['400','500','700'], display: 'swap' })"
  }],
  "icons": {
    "library": "lucide-react", "install_command": "npm install lucide-react",
    "icon_mappings": [
      {"usage": "メニュー", "icon_name": "Menu", "section": "header"}
    ]
  },
  "favicon": { "description": "形状・色の説明", "local_path": "/public/favicon.ico", "strategy": "SVG生成" },
  "license_summary": { "cc0": 0, "commercial": 5, "restricted": 8, "unknown": 2 },
  "total_images": 12, "total_videos": 1, "total_svgs": 6,
  "images_requiring_placeholder": 10, "images_extractable": 2
}
```

## 使用するツール
- `Read`: site_scanner/output.json, design_analyzer/output.json の読み込み
- `WebFetch`: ページHTMLの取得、画像・動画URLの確認
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Legal Agent**: 画像・フォント・動画・ロゴの著作権・ライセンス分類の妥当性確認
- **Web Builder / builder**: 収集アセット・最適化方針・レスポンシブ設計が実装に必要十分か検証
- **Designer**: 画像・動画の代替素材生成が必要な場合の判断
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証、ライセンス情報の網羅性確認
