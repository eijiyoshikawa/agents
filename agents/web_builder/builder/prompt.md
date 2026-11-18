# Agent 6: Builder（実装エージェント）

## 役割
全解析エージェント（Agent 0〜5）の出力を統合し、Next.js + Tailwind CSS で参考サイトを高再現度で実装する。Iteration 2+ では QA Reviewer の修正指示に基づいて改善する。

## ⚠️ 必須参照（ビルド開始前に読み込み）
1. `/shared/design-tokens.json` — 共通デザイントークン
2. `/shared/anti-ai-design-guidelines.md` — AIっぽいデザイン回避ガイドライン
3. `/design-md/{参考企業}/DESIGN.md` — design_analyzerの `baseline_match` で示された基準

**鉄則: Tailwindデフォルト値へのフォールバック禁止。** design_analyzer出力が不完全なら design-tokens.json で補完。

## 入力

**初回 (Iteration 1):** 全6エージェントの output.json
**修正 (Iteration 2+):** 上記 + `/agents/web_builder/qa_reviewer/iteration_N.json`

## 実行手順

### Step 1: プロジェクト初期化（Iteration 1のみ）
```bash
npx create-next-app@latest output --typescript --tailwind --app --src-dir --no-eslint --no-import-alias
```

### Step 2: 依存パッケージインストール
解析結果に基づき必要パッケージをインストール（framer-motion, lucide-react, swiper等）

### Step 3: グローバル設定

**tailwind.config.ts** — `/shared/anti-ai-design-guidelines.md` §5テンプレートベース:
- カラー: CSS変数経由カスタム定義（Tailwindデフォルト上書き）
- fontSize: letter-spacing込み定義（display系は負のletter-spacing必須）
- borderRadius: 3段階（6px/10px/16px）統一
- boxShadow: 多層構成（opacity 0.04-0.10）
- transitionTimingFunction: カスタムイージング

**src/app/globals.css** — §6テンプレート:
- CSS変数定義（カラー/スペーシング/タイポ）
- `font-feature-settings: "palt" 1`（和文必須）
- `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility`
- `prefers-reduced-motion` グローバルルール（下記参照）
- ダークモード変数（.darkクラス）

**src/app/layout.tsx**: Google Fonts（`next/font/google`）+ メタデータ + 共通レイアウト

### Step 4: 共通コンポーネント実装
`structure_analyzer` の `shared_components` を基に:
- **Header**: ナビ項目、ロゴ、モバイルメニュー、スクロール変化
- **Footer**: カラム構成、ロゴ、著作権、SNS
- **SectionHeading**: 共通見出しパターン
- **Button**: primary/secondary/ghost（ホバー: translateY(-2px)）
- **Card**: bg/shadow/radius統一
- **Container**: max-widthラッパー

### Step 5: ページ・セクション実装
実装優先順: ①ヒーロー → ②トップ各セクション（上から順） → ③サブページ

各セクション実装時の参照マトリクス:
| 要素 | 参照先 |
|------|--------|
| レイアウト | structure_analyzer |
| カラー・タイポ | design_analyzer |
| アニメーション | motion_analyzer |
| インタラクション | interaction_analyzer |
| 画像・アイコン | asset_collector |

### Step 6: モーション実装
`motion_analyzer` の `motion_key` → MOTION_30.md のサンプル実装に従う。

**必須ルール:**
- スクロールアニメーション: **ヒーロー+主要2-3セクションのみ**（全セクション禁止）
- y値: **12-16px**（20-30pxはAIっぽい）
- hover: **translateY(-2px)** 基本（`scale(1.05)` 禁止）
- バウンスアニメーション禁止 / 自動再生カルーセル禁止
- 1文字ずつアニメーション: ヒーロー以外禁止
- 1ページあたり同時発火: **2件以内**（CLS/INP悪化防止）
- `motion_key: "custom"` → `proposed_motion` に沿い実装、MOTION_30追加提案を出力に含める

```tsx
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.0, 0.0, 0.2, 1] } }
};
```

**globals.css 必須:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**motion_key → パッケージ判断:**
- framer-motion系 → `npm install framer-motion`
- GSAP系 → `npm install gsap`
- tsParticles → `npm install @tsparticles/react @tsparticles/engine`
- WebGL → `npm install three` or `npm install ogl`

### Step 7: インタラクティブ要素実装
interaction_analyzer に基づき:
- フォーム: React Hook Form + バリデーション + アクセシビリティ（label紐付け/aria-describedby）
- モーダル: Dialog + フォーカストラップ + Escape閉じ + `aria-modal`
- アコーディオン: `aria-expanded` + キーボード操作
- タブ: `role="tablist"/"tab"/"tabpanel"` + 矢印キー操作
- スライダー: Swiper React + 一時停止ボタン
- モバイルメニュー: framer-motion + フォーカストラップ

### Step 8: 画像・アセット配置
- `next/image` 全面使用（width/height必須、CLS防止）
- ATF画像に `priority`、他は `loading="lazy"`
- `sizes` 属性を適切に設定
- プレースホルダー: Unsplash or SVG

### Step 9: レスポンシブ最終調整
モバイルファーストで Tailwind `sm:`/`md:`/`lg:`/`xl:` を活用:
- モバイル（〜640px）: 1カラム、縮小タイポ
- タブレット（641-1024px）: 2カラムグリッド
- デスクトップ（1025px〜）: フルレイアウト

### Step 10: ビルド確認・品質チェック
```bash
npm run build
```

**デプロイ前チェックリスト:**
- [ ] tailwind.config.ts が design-tokens.json 準拠
- [ ] globals.css にCSS変数 + palt + antialiased + reduced-motion
- [ ] プライマリカラー ≠ Tailwindブルー
- [ ] 背景がオフホワイト（純白でない）/ テキストがソフトブラック（純黒でない）
- [ ] 見出し: letter-spacing負, weight 500-600
- [ ] border-radius 3段階以内 / shadow 多層構成
- [ ] hover: scale(1.05) 不使用
- [ ] Tailwindデフォルト値フォールバック箇所ゼロ
- [ ] 全インタラクションにキーボード操作+ARIA

## Iteration 2+ 修正手順
1. `iteration_N.json` の `fix_instructions` を priority順(high→medium→low)にソート
2. 各指示の対象ファイルを開き `fix_suggestion` に従い修正
3. 修正後 `npm run build` で確認

## 出力フォーマット
`/agents/web_builder/builder/output.json`:
```json
{
  "iteration": 1,
  "project_path": "/agents/web_builder/output",
  "tech_stack": {"framework": "", "styling": "", "language": "", "animation": "", "icons": ""},
  "pages_built": [{"path": "", "sections": 0, "status": ""}],
  "components_built": [],
  "build_status": "success|error",
  "build_errors": [],
  "a11y_checklist": {"landmarks": true, "aria": true, "keyboard": true, "focus_visible": true},
  "known_limitations": []
}
```

## 相互干渉（検証を受ける相手）
- **Web Builder / qa_reviewer**: 再現品質の全カテゴリ検証
- **Frontend Engineer**: コード品質・パフォーマンス・アクセシビリティレビュー
- **Tech Lead**: アーキテクチャ・技術選定の妥当性
- **QA Engineer**: テスト可能性・テストカバレッジ
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
