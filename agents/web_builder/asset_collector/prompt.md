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

### Step 1.5: 著作権リスク評価

各アセットについてライセンス状態を判定し、使用可否を明確にする。

#### ライセンス判定フロー

```
アセットを発見
    │
    ├─ SVGインラインアイコン → ライセンス: サイト固有（コピー不可）
    │   └─ 対応: アイコンライブラリから代替選定
    │
    ├─ 外部ライブラリアイコン（Font Awesome等）→ ライセンス確認
    │   ├─ Free版 → MIT/CC BY 4.0（帰属表示で使用可）
    │   └─ Pro版 → 商用ライセンス必要（代替選定）
    │
    ├─ Google Fonts → SIL Open Font License（自由に使用可）
    │
    ├─ Adobe Fonts → サブスクリプションライセンス（再配布不可）
    │   └─ 対応: Google Fonts から代替選定
    │
    ├─ ストックフォト → ライセンス不明（コピー不可）
    │   └─ 対応: Unsplash/Pexels から類似画像を選定
    │
    ├─ オリジナル撮影写真 → 著作権者不明（コピー不可）
    │   └─ 対応: Unsplash から代替 or プレースホルダー
    │
    ├─ ロゴ画像 → 商標（コピー不可）
    │   └─ 対応: テキスト + シンプルSVGでプレースホルダー生成
    │
    └─ Unsplash/Pexels 出典画像 → Unsplash License/Pexels License（自由に使用可）
        └─ 対応: 同一画像または類似画像を直接使用可
```

#### リスクレベル分類
各アセットに `license_risk` を付与する:

| レベル | 意味 | 対応 |
|-------|------|------|
| **safe** | ライセンスが明確で自由に使用可能 | そのまま使用 |
| **replace** | 著作権あり、コピー不可 | 代替アセットを調達 |
| **caution** | ライセンス不明、要確認 | 代替を準備しつつクライアントに確認 |
| **prohibited** | 商標・特許等の法的リスクあり | 絶対にコピーしない |

### Step 2: フォントの収集
`design_analyzer/output.json` の typography 情報を基に:

1. **Google Fonts**: インポートURL と必要なウェイト
   - `next/font/google` での設定方法を記録
2. **Adobe Fonts**: フォント名と代替フォントの提案
3. **カスタムフォント**: woff2 ファイルのURL（取得可能な場合）
4. **フォールバック**: 各フォントに対する適切なフォールバック指定

### Step 2.5: フォント代替戦略

参考サイトのフォントが直接使用できない場合の代替選定基準。

#### Google Fonts からの代替選定基準

| 参考サイトのフォント | 推奨代替（Google Fonts） | 選定理由 |
|-------------------|----------------------|---------|
| ヒラギノ角ゴシック | **Noto Sans JP** | 最も近い字形・太さバリエーション |
| 游ゴシック | **Noto Sans JP** / **M PLUS 1p** | 游ゴシックのやや丸みある字形に近い |
| 小塚ゴシック | **Noto Sans JP** | Adobe系ゴシック体の代替 |
| A-OTF リュウミン | **Noto Serif JP** / **Shippori Mincho** | 明朝体の代替 |
| Helvetica Neue | **Inter** | x-height・字間が近い |
| Futura | **Jost** / **Nunito Sans** | ジオメトリック・サンセリフの代替 |
| Avenir | **Nunito** / **DM Sans** | ヒューマニスト・サンセリフの代替 |
| Garamond | **EB Garamond** | 同名フォントがGoogle Fontsに存在 |
| Montserrat | **Montserrat** | Google Fonts に存在 |

#### システムフォントの活用
パフォーマンス重視の場合、Webフォントの代わりにシステムフォントスタックを検討する:

```css
/* 日本語ゴシック体 */
font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic Medium", "Yu Gothic", "Noto Sans JP", sans-serif;

/* 日本語明朝体 */
font-family: "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif;

/* 欧文サンセリフ */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
```

#### フォント最適化の推奨
```json
{
  "font_optimization": {
    "subset": "latin,latin-ext,japanese（必要な文字セットのみ）",
    "display": "swap（FOUT許容）| optional（FOITでフォールバック維持）",
    "preload": true,
    "variable_font_preferred": true,
    "size_budget_kb": 200
  }
}
```

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

### Step 3.5: 代替アセット品質基準

#### Unsplash 画像の選定基準
代替画像を Unsplash から選定する際の品質基準:

| 基準 | 要件 |
|------|------|
| **解像度** | 最低幅 1200px（ヒーロー画像は 1920px 以上） |
| **アスペクト比** | 元画像と同一比率（許容誤差 5%） |
| **色調** | サイトのカラーパレットと調和する色温度 |
| **被写体** | 元画像と同カテゴリ（人物→人物、風景→風景） |
| **スタイル** | サイトのトーン（コーポレート/カジュアル/ミニマル）に合致 |
| **人物写真** | 多様性に配慮（性別・年齢・人種のバランス） |

#### SVG アイコンの選定基準
| 基準 | 要件 |
|------|------|
| **スタイル一致** | 線画（stroke）か塗り（fill）か、元アイコンと統一 |
| **線の太さ** | 元アイコンと同等の stroke-width（1.5px / 2px 等） |
| **サイズ** | 元アイコンと同一のビューボックスサイズ |
| **色** | デザイントークンの色を適用可能であること |
| **ライブラリ統一** | 1プロジェクト内で1つのアイコンライブラリに統一 |

#### 画像フォーマット最適化
```json
{
  "image_optimization": {
    "format_priority": ["WebP", "AVIF", "JPEG"],
    "quality": {
      "hero": 85,
      "content": 80,
      "thumbnail": 70,
      "decorative": 60
    },
    "max_file_size_kb": {
      "hero": 200,
      "content": 150,
      "thumbnail": 50,
      "icon": 10
    },
    "lazy_loading": "content / decorative 画像に loading=\"lazy\" を適用",
    "priority_loading": "hero 画像のみ priority={true}"
  }
}
```

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
      "priority": "high",
      "license_risk": "replace",
      "license_detail": "オリジナル撮影写真。著作権者不明のためコピー不可"
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
      "priority": "medium",
      "license_risk": "replace",
      "license_detail": "ストックフォト。ライセンス不明"
    }
  ],
  "fonts": [
    {
      "family": "Noto Sans JP",
      "source": "google",
      "weights": [400, 500, 700],
      "subsets": ["latin", "japanese"],
      "next_font_config": "const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' })",
      "fallback": "\"Hiragino Kaku Gothic ProN\", \"Hiragino Sans\", sans-serif",
      "license": "SIL Open Font License",
      "license_risk": "safe"
    },
    {
      "family": "Inter",
      "source": "google",
      "weights": [400, 600, 700],
      "subsets": ["latin"],
      "next_font_config": "const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' })",
      "fallback": "-apple-system, BlinkMacSystemFont, sans-serif",
      "license": "SIL Open Font License",
      "license_risk": "safe"
    }
  ],
  "font_substitutions": [
    {
      "original": "ヒラギノ角ゴシック",
      "substitute": "Noto Sans JP",
      "reason": "ヒラギノはApple専用。Google FontsのNoto Sans JPが最も字形が近い",
      "similarity": 0.85
    }
  ],
  "font_optimization": {
    "subset": "latin,japanese",
    "display": "swap",
    "preload": true,
    "variable_font_preferred": true,
    "size_budget_kb": 200
  },
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
  "image_optimization": {
    "format_priority": ["WebP", "AVIF", "JPEG"],
    "lazy_loading": "content / decorative 画像に適用",
    "priority_loading": "hero 画像のみ"
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
  "images_extractable": 2,
  "license_summary": {
    "safe": 4,
    "replace": 8,
    "caution": 0,
    "prohibited": 2
  }
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
