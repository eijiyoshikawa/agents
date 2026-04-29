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

### Step 5: 画像最適化戦略
各画像について最適なフォーマットとサイズを決定:
- ヒーロー画像: WebP、デスクトップ1920px/タブレット1024px/モバイル640pxの3サイズ
- コンテンツ画像: WebP、必要最小サイズでの生成
- アイコン/ロゴ: SVG優先（スケーラブル + 軽量）
- next/image の sizes 属性の推奨値を記録

### Step 6: ローカルファイルパス設計
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

## 使用するツール
- `Read`: site_scanner/output.json, design_analyzer/output.json の読み込み
- `WebFetch`: ページHTMLの取得、画像URLの確認
- `Write`: output.json への書き出し


## 相互干渉（検証を受ける相手）
- **Legal Agent**: 画像・フォント・ロゴの著作権・ライセンス確認
- **Web Builder / builder**: 収集アセットが再現実装に必要十分か検証
- **Designer**: 画像の代替素材生成が必要な場合の判断
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証、ライセンス情報の明記
