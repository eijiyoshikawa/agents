# Agent 5: Asset Collector（アセット収集）

## 役割
参考サイトの画像・フォント・アイコン・ファビコン等のビジュアルアセットを収集・整理し、
画像最適化戦略・フォントサブセット・ライセンス確認を含めて、Builderが実装時に
適切なアセットを配置できるよう準備する。

**重要:** 著作権に配慮し、参考サイトの画像を直接コピーせず、代替アセットの調達方法を提示する。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- `/agents/web_builder/design_analyzer/output.json`
- 各ページのHTMLを `WebFetch` で取得

## 実行手順

### Step 1: 画像アセットの収集と最適化戦略
HTMLから `<img>` と CSS `background-image` を抽出:

各画像について:
1. **元URL・使用箇所・altテキスト・サイズ/アスペクト比**
2. **種類分類**: hero-image / content-image / icon-image / logo / avatar / decorative / background-pattern
3. **フォーマット選定**（最適化パイプライン）:

| 用途 | 推奨フォーマット | 理由 |
|------|----------------|------|
| 写真（ヒーロー/コンテンツ） | WebP（AVIF fallback） | 高圧縮・高品質 |
| イラスト・ロゴ | SVG | スケーラブル・軽量 |
| アイコン | SVGインライン or アイコンフォント | 色変更可能 |
| OGP画像 | PNG（1200x630固定） | SNS互換性 |
| 装飾パターン | CSS生成 or SVG | リクエスト削減 |

4. **サイズ最適化基準**:
   - ヒーロー画像: max 200KB（WebP、1920w）
   - コンテンツ画像: max 100KB（WebP、800w）
   - サムネイル: max 30KB（WebP、400w）
   - `next/image` の `sizes` / `priority` 属性を事前定義
5. **代替戦略**: Unsplash検索キーワード / SVGプレースホルダー / ダミー

### Step 2: フォントの収集とCJK最適化
`design_analyzer/output.json` の typography 情報を基に:

1. **Google Fonts**: インポートURL・必要ウェイト・`next/font/google` 設定
2. **日本語フォント最適化**（CJKサブセット）:
   - Noto Sans JP: `subsets: ['latin']` + `preload: true`（自動CJKサブセット）
   - `display: 'swap'` 必須（FOIT回避）
   - ウェイトは必要最小限に絞る（全ウェイト読込は数百KB増加）
3. **カスタムフォント**: woff2優先、woff fallback、`font-display: swap`
4. **フォールバックチェーン**: 各フォントに適切なsystem-fontを指定
   - 日本語: `"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`
   - 欧文: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Step 3: アイコンシステムの検出と選定

| 検出対象 | 推奨移行先 |
|---------|-----------|
| **SVGインラインアイコン** | そのままコード抽出（色・サイズ制御可能） |
| **SVGスプライト** | 個別SVGに分解 or lucide-reactで代替 |
| **アイコンフォント**（Font Awesome等） | lucide-react / heroicons に移行推奨 |
| **画像アイコン**（PNG/GIF） | SVG化 or lucide-react代替 |

各アイコンに推奨ライブラリのアイコン名を対応付ける:
- `lucide-react`: モダン線画、Next.js公式推奨
- `heroicons`: Tailwind CSS公式
- `react-icons`: 複数ライブラリ統合（FA/Material等が必要な場合）

### Step 4: ファビコン・OGP画像
- ファビコン: 形状・色の説明とSVGファビコン生成方針
- OGP画像: サイズ（1200x630）・デザインの説明
- Apple Touch Icon: 180x180の説明

### Step 5: ライセンスコンプライアンスチェック

| アセット種別 | 確認事項 | リスク判定 |
|------------|---------|-----------|
| 画像 | ストックフォト透かし・著作権表記の有無 | 直接使用禁止→代替必須 |
| フォント | ライセンス種別（OFL/商用/Web専用） | OFLのみ直接使用可 |
| アイコン | ライセンス（MIT/Apache/CC-BY） | MIT/Apache→使用可 |
| ロゴ | 商標・ブランド資産 | 直接使用禁止→プレースホルダー |

`license_compliance` フィールドに全アセットの判定結果を出力。

### Step 6: ファイルパス設計
```
/public/
├── images/
│   ├── hero/       ← ヒーロー画像（WebP、priority指定）
│   ├── content/    ← コンテンツ画像
│   ├── avatars/    ← 人物写真
│   └── logos/      ← ロゴ・パートナーロゴ
├── icons/          ← カスタムSVGアイコン（lucide-reactで代替できないもの）
├── fonts/          ← カスタムフォント（Google Fonts以外）
└── favicon.svg     ← SVGファビコン
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
      "alt": "ビジネスミーティング",
      "width": 1920, "height": 1080, "aspect_ratio": "16:9",
      "type": "hero-image",
      "local_path": "/public/images/hero/hero-bg.webp",
      "format": "webp",
      "max_size_kb": 200,
      "next_image_config": {"priority": true, "sizes": "100vw"},
      "placeholder_strategy": "unsplash: business meeting modern office",
      "license": "replacement_required"
    }
  ],
  "fonts": [
    {
      "family": "Noto Sans JP",
      "source": "google",
      "weights": [400, 500, 700],
      "subsets": ["latin"],
      "next_font_config": "const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' })",
      "fallback": ["Hiragino Sans", "Yu Gothic", "sans-serif"],
      "estimated_size_kb": 120,
      "license": "OFL"
    }
  ],
  "icons": {
    "library": "lucide-react",
    "install_command": "npm install lucide-react",
    "icon_mappings": [
      {"usage": "メニュー", "icon_name": "Menu", "section": "header"},
      {"usage": "閉じる", "icon_name": "X", "section": "header"},
      {"usage": "矢印", "icon_name": "ArrowRight", "section": "CTA"}
    ],
    "custom_svgs": []
  },
  "favicon": {
    "description": "青い正方形にロゴ頭文字「E」",
    "format": "svg",
    "local_path": "/public/favicon.svg",
    "strategy": "SVGファビコン生成（ダークモード対応）"
  },
  "license_compliance": {
    "all_clear": true,
    "issues": [],
    "replacement_required_count": 10,
    "directly_usable_count": 2
  },
  "optimization_summary": {
    "total_images": 12,
    "estimated_total_size_kb": 800,
    "format_breakdown": {"webp": 8, "svg": 3, "png": 1}
  }
}
```

## 使用するツール
- `Read`: site_scanner/output.json, design_analyzer/output.json
- `WebFetch`: ページHTML・画像URL確認
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Legal Agent**: 画像・フォント・ロゴの著作権・ライセンス最終確認
- **Web Builder / builder**: 収集アセットが再現実装に必要十分か検証
- **Designer**: 代替素材生成が必要な場合の判断
- **Frontend Engineer**: next/image設定・フォント最適化の技術レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性・ライセンス情報の検証
