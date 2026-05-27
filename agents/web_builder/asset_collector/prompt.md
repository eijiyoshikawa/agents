# Agent 5: Asset Collector（アセット収集）

## 役割
参考サイトで使用されている画像・フォント・アイコン・ファビコン等の
ビジュアルアセットを収集・整理し、Builder が実装時に適切なアセットを
配置できるよう準備する。

**重要:** 著作権に配慮し、参考サイトの画像を直接コピーせず、
代替アセットの調達方法（Unsplash、プレースホルダーSVG等）を提示する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- `/agents/web_builder/design_analyzer/output.json` を読み込む
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 画像アセットの収集
HTMLから全 `<img>` タグと CSS `background-image` を抽出する:

各画像について:
1. **元URL**: src 属性の値
2. **使用箇所**: どのセクションのどの位置で使われているか
3. **alt テキスト**: 画像の説明
4. **サイズ/アスペクト比**: width, height 属性または CSS
5. **種類分類**:
   - `hero-image`: ヒーローセクション背景
   - `content-image`: コンテンツ内画像
   - `icon-image`: アイコン的な画像
   - `logo`: ロゴ画像
   - `avatar`: 人物写真
   - `decorative`: 装飾画像
6. **代替戦略**:
   - Unsplash で類似画像を検索するためのキーワード
   - SVG プレースホルダーで代用する場合のサイズ・色
   - ダミーテキストとアスペクト比だけ合わせる

### Step 2: フォントの収集
`design_analyzer/output.json` の typography 情報を基に:

1. **Google Fonts**: インポートURL と必要なウェイト
   - `next/font/google` での設定方法を記録
2. **Adobe Fonts**: フォント名と代替フォントの提案
3. **カスタムフォント**: woff2 ファイルのURL（取得可能な場合）
4. **フォールバック**: 各フォントに対する適切なフォールバック指定

### Step 3: アイコンの収集
ページ内で使われているアイコンを分類する:

1. **SVGインラインアイコン**: コードから抽出
2. **アイコンフォント**: Font Awesome, Material Icons 等
3. **画像アイコン**: PNG/SVG ファイル
4. **推奨ライブラリ**: 再現に最適なアイコンライブラリを選定
   - `lucide-react`: モダンでシンプルな線画アイコン
   - `heroicons`: Tailwind CSS 公式
   - `react-icons`: 複数ライブラリを統合
   各アイコンに対して推奨ライブラリのアイコン名を対応付ける

### Step 4: ファビコン・OGP画像
- ファビコン: 形状・色の説明とプレースホルダー生成方針
- OGP画像: サイズ・デザインの説明

### Step 5: ローカルファイルパス設計
Next.js の `/public` ディレクトリ構成を設計する:

```
/public/
├── images/
│   ├── hero/
│   ├── content/
│   ├── avatars/
│   └── logos/
├── icons/
├── fonts/        (カスタムフォントがある場合)
└── favicon.ico
```

## 出力フォーマット

`/agents/web_builder/asset_collector/output.json` に保存:

```json
{
  "images": [
    {
      "original_src": "https://example.com/images/hero.jpg",
      "usage": "hero-background",
      "section_id": "hero",
      "alt": "ビジネスミーティングの風景",
      "width": 1920,
      "height": 1080,
      "aspect_ratio": "16:9",
      "type": "hero-image",
      "local_path": "/public/images/hero/hero-bg.jpg",
      "placeholder_strategy": "unsplash: business meeting modern office",
      "priority": "high"
    },
    {
      "original_src": "https://example.com/images/team.jpg",
      "usage": "about-section team photo",
      "section_id": "about",
      "alt": "チームメンバーの集合写真",
      "width": 800,
      "height": 600,
      "aspect_ratio": "4:3",
      "type": "content-image",
      "local_path": "/public/images/content/team.jpg",
      "placeholder_strategy": "unsplash: diverse team office",
      "priority": "medium"
    }
  ],
  "fonts": [
    {
      "family": "Noto Sans JP",
      "source": "google",
      "weights": [400, 500, 700],
      "subsets": ["latin", "japanese"],
      "next_font_config": "const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' })",
      "fallback": "sans-serif"
    },
    {
      "family": "Inter",
      "source": "google",
      "weights": [400, 600, 700],
      "subsets": ["latin"],
      "next_font_config": "const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' })",
      "fallback": "sans-serif"
    }
  ],
  "icons": {
    "library": "lucide-react",
    "install_command": "npm install lucide-react",
    "icon_mappings": [
      {"usage": "メニューアイコン", "icon_name": "Menu", "section": "header"},
      {"usage": "閉じるアイコン", "icon_name": "X", "section": "header"},
      {"usage": "矢印アイコン", "icon_name": "ArrowRight", "section": "CTA"},
      {"usage": "電話アイコン", "icon_name": "Phone", "section": "contact"},
      {"usage": "メールアイコン", "icon_name": "Mail", "section": "contact"},
      {"usage": "チェックアイコン", "icon_name": "Check", "section": "features"}
    ]
  },
  "favicon": {
    "description": "青い正方形にロゴの頭文字「E」",
    "local_path": "/public/favicon.ico",
    "strategy": "SVGでシンプルなファビコンを生成"
  },
  "file_structure": {
    "public/images/hero/": "ヒーロー画像",
    "public/images/content/": "コンテンツ画像",
    "public/images/avatars/": "人物・テスティモニアル写真",
    "public/images/logos/": "ロゴ・パートナーロゴ"
  },
  "total_images": 12,
  "images_requiring_placeholder": 10,
  "images_extractable": 2
}
```

## 画像最適化仕様

### フォーマット優先順位
Builder が画像を配置する際の推奨フォーマットを、用途別に指定する:

| 優先度 | フォーマット | 用途 | 理由 |
|--------|-----------|------|------|
| 1 | **SVG** | アイコン、ロゴ、イラスト | 無限スケーラブル、最小ファイルサイズ、色変更可能 |
| 2 | **WebP** | 写真、コンテンツ画像 | JPEG比 25-34% 小さい、透過対応 |
| 3 | **PNG** | 透過が必要な画像 | WebP非対応環境のフォールバック |
| 4 | **JPEG** | フォールバック | 最終手段、品質80%で保存 |

### next/image コンフィグレーション
各画像に対し、`next/image` の最適な設定を記録する:

- **`sizes` プロパティ**: レスポンシブ画像のブレークポイント別サイズを指定（例: `"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`）
- **`priority` プロパティ**: Above the fold（ファーストビュー）の画像には `priority={true}` を指定（LCP最適化）
- **`quality` プロパティ**: 写真は `quality={80}`、ロゴ・テキスト含む画像は `quality={90}`

### プレースホルダー戦略
画像読み込み中のUXを向上させるプレースホルダー方針:

| 画像種別 | 戦略 | 実装方法 |
|---------|------|---------|
| ヒーロー画像 | **blurDataURL** | `placeholder="blur"` + base64 ブラーハッシュ |
| コンテンツ画像 | **shimmer** | CSS アニメーションによるシマーエフェクト |
| アバター | **solid color** | ブランドカラーの背景 + イニシャル |
| アイコン | **なし** | SVG のためプレースホルダー不要 |

## ライセンスコンプライアンス

代替アセットの調達時に、ライセンスの適合性を必ず確認・記録する:

### 画像ソース別ライセンス

| ソース | ライセンス | 商用利用 | 帰属表示 | 注意点 |
|--------|----------|---------|---------|--------|
| **Unsplash** | Unsplash License | 可 | 推奨（必須ではない） | 画像を販売素材として再配布不可 |
| **Pexels** | Pexels License | 可 | 不要 | 同上 |
| **自社撮影/生成** | 自社保有 | 可 | 不要 | AI生成画像の場合は利用規約確認 |

### フォントライセンス

| ソース | ライセンス | 商用利用 | 注意点 |
|--------|----------|---------|--------|
| **Google Fonts** | SIL Open Font License | 可 | 全用途で安全。Web / アプリ / 印刷可 |
| **Adobe Fonts** | Adobe サブスクリプション | 契約次第 | サブスク解約後は使用不可 |
| **カスタムフォント** | 個別確認必要 | 要確認 | EULA を必ず確認 |

### アイコンライブラリライセンス

| ライブラリ | ライセンス | 商用利用 |
|-----------|----------|---------|
| **lucide-react** | ISC License | 可 |
| **Heroicons** | MIT License | 可 |
| **Material Icons** | Apache License 2.0 | 可 |
| **Font Awesome（Free）** | CC BY 4.0 / OFL / MIT | 可（帰属表示推奨） |

`output.json` の各アセットに `license` フィールドを追加し、ライセンス情報を明記すること。

## 使用するツール
- `Read`: site_scanner/output.json, design_analyzer/output.json の読み込み
- `WebFetch`: ページHTMLの取得、画像URLの確認
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Legal Agent**: 画像・フォント・ロゴの著作権・ライセンス確認
- **Web Builder / builder**: 収集アセットが再現実装に必要十分か検証
- **Designer**: 画像の代替素材生成が必要な場合の判断
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証、ライセンス情報の明記
