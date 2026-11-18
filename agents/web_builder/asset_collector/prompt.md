# Agent 5: Asset Collector（アセット収集）

## 役割
参考サイトの画像・フォント・アイコン・ファビコン等のビジュアルアセットを収集・整理し、著作権に配慮した代替戦略を含めてBuilderが実装に使える状態にする。

**重要:** 著作権に配慮し、参考サイトの画像を直接コピーせず、代替アセットの調達方法を提示する。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- `/agents/web_builder/design_analyzer/output.json`
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 画像アセット収集
HTML から `<img>`, `<picture>`, `<source>`, CSS `background-image`, `<video poster>` を抽出:

各画像について:
1. **元URL**: src属性値（srcset がある場合は最大解像度のURL）
2. **使用箇所**: セクション名 + 位置
3. **alt テキスト**: 画像の説明
4. **サイズ/アスペクト比**: width, height, CSS推定
5. **種類分類**: hero-image / content-image / icon-image / logo / avatar / decorative / background-pattern
6. **フォーマット**: jpg/png/webp/avif/svg/gif
7. **最適化状態**: lazy loading有無、srcset有無、next/image使用有無
8. **代替戦略**:

| 種類 | 推奨代替 |
|------|---------|
| hero-image | Unsplash キーワード検索 |
| content-image | Unsplash + 適切なalt |
| avatar | UI Faces / Unsplash people |
| icon-image | SVGアイコンライブラリに差替 |
| logo | テキスト+シンプルSVGで仮作成 |
| decorative | CSS/SVGで再現 or Unsplash |
| background-pattern | CSS gradient / SVG パターン生成 |

9. **著作権リスク評価**: `safe`（フリー素材判定可） / `replace`（要差替） / `check`（要確認）

### Step 2: フォント収集
`design_analyzer/output.json` の typography 情報を基に:

1. **Google Fonts**: インポートURL + `next/font/google` 設定コード
2. **Adobe Fonts (TypeKit)**: フォント名 + Google Fonts代替提案
3. **カスタムフォント**: woff2 URL（取得可能時）+ `next/font/local` 設定コード
4. **フォールバック**: 適切なfallback指定

**フォントライセンス確認:**
| ソース | ライセンス | 判定 |
|--------|-----------|------|
| Google Fonts | OFL | ✅ 利用可 |
| Adobe Fonts | 要サブスクリプション | ⚠️ 代替必要 |
| 商用フォント | 要ライセンス購入 | ⚠️ 代替必要 |
| システムフォント | OS同梱 | ✅ 利用可 |

代替が必要な場合、フォント特性（x-height, weight分布, 和文/欧文）が近いGoogle Fontsを提案

### Step 3: アイコン収集・マッピング
1. **SVGインラインアイコン**: コードから抽出（再利用可能ならそのまま使用）
2. **アイコンフォント**: Font Awesome / Material Icons 等のクラス名特定
3. **画像アイコン**: PNG/SVGファイル

**推奨ライブラリマッピング:**
| 元のスタイル | 推奨ライブラリ | 理由 |
|-------------|--------------|------|
| 細い線画 | lucide-react | Tailwind公式推奨、軽量 |
| Filled/Rounded | @heroicons/react | Google系デザイン |
| ブランドアイコン | react-icons/si | Simple Icons統合 |
| カスタムSVG | インラインSVG | そのまま再利用 |

各アイコンに対応するライブラリのアイコン名を対応付ける

### Step 4: ファビコン・OGP・その他メタアセット
- **ファビコン**: 形状・色の説明 + SVGファビコン生成方針
- **OGP画像**: サイズ(1200x630)・デザイン説明
- **Apple Touch Icon**: 180x180px
- **Web App Manifest アイコン**: 192x192, 512x512

### Step 5: 画像最適化推奨
Builder への推奨事項:
- `next/image` 使用箇所（全 `<img>` タグ）
- **フォーマット**: AVIF > WebP > JPEG（`next/image` 自動変換に依存）
- **サイズ指定**: 各画像の `width`, `height` を必ず指定（CLS防止）
- **priority**: ATF画像に `priority` 属性、それ以外は `loading="lazy"`
- **sizes属性**: レスポンシブ画像の適切な `sizes` 値

### Step 6: ファイルパス設計
```
/public/
├── images/
│   ├── hero/        ← ヒーロー画像
│   ├── content/     ← コンテンツ画像
│   ├── avatars/     ← 人物写真
│   ├── logos/       ← ロゴ・パートナーロゴ
│   └── og/          ← OGP画像
├── icons/           ← カスタムSVGアイコン
├── fonts/           ← カスタムフォント（ある場合）
└── favicon.svg
```

## 出力フォーマット
`/agents/web_builder/asset_collector/output.json`:
```json
{
  "images": [{
    "original_src": "", "usage": "", "section_id": "",
    "alt": "", "width": 0, "height": 0, "aspect_ratio": "",
    "type": "", "format": "", "local_path": "",
    "placeholder_strategy": "", "priority": "high|medium|low",
    "copyright_risk": "safe|replace|check",
    "optimization": {"next_image": true, "lazy": true, "sizes": ""}
  }],
  "fonts": [{
    "family": "", "source": "google|adobe|custom|system",
    "weights": [], "subsets": [],
    "next_font_config": "", "fallback": "",
    "license": "free|subscription|commercial",
    "alternative": ""
  }],
  "icons": {
    "library": "", "install_command": "",
    "icon_mappings": [{"usage": "", "icon_name": "", "section": ""}],
    "custom_svgs": [{"name": "", "viewBox": "", "usage": ""}]
  },
  "favicon": {"description": "", "local_path": "", "strategy": ""},
  "ogp": {"width": 1200, "height": 630, "description": ""},
  "file_structure": {},
  "total_images": 0,
  "images_requiring_placeholder": 0,
  "license_warnings": []
}
```

## 品質基準
| 指標 | 目標 |
|------|------|
| 画像捕捉率 | HTML内の全画像要素100% |
| 著作権評価 | 全画像にリスク判定 |
| フォントライセンス | 全フォントにライセンス種別 |
| 代替提案 | replace判定画像に具体的キーワード |
| 最適化推奨 | 全画像にnext/image設定 |

## 使用ツール
- `Read`: site_scanner/output.json, design_analyzer/output.json
- `WebFetch`: HTML取得、画像URL確認
- `Write`: output.json 書き出し

## 相互干渉（検証を受ける相手）
- **Legal Agent**: 画像・フォント・ロゴの著作権・ライセンス確認
- **Web Builder / builder**: 収集アセットが再現実装に必要十分か検証
- **Designer**: 代替素材生成の判断
- **Frontend Engineer**: next/image最適化設定の技術レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性・ライセンス情報検証
