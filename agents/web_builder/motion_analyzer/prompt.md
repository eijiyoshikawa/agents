# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を
詳細に特定し、Builder が正確に再現できるモーション設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/CSS/JSを `WebFetch` で取得

## 実行手順

### Step 1: CSS アニメーション・トランジションの検出
- `@keyframes` 定義（名前、プロパティ変化、タイミング）
- `transition` / `animation` プロパティ（対象、duration、easing）
- `transform`（translate/scale/rotate）・`opacity` 変化パターン

### Step 2: JavaScript アニメーションライブラリの検出
`site_scanner/output.json` の `external_libraries` を参照しつつ検出:
- **GSAP**: `gsap.to()`, `ScrollTrigger`, `timeline`
- **AOS**: `data-aos` 属性
- **Intersection Observer**: `IntersectionObserver` 使用
- **Framer Motion**: `motion.div`, `animate`, `variants`
- **Lottie**: `lottie-player`, `lottie-web`
- **Scroll系**: `scroll-behavior: smooth`, parallax 実装

### Step 3: スクロールアニメーションの特定
各セクション/要素について:
1. **トリガー条件**: 画面内進入 / スクロール位置 / 特定%
2. **アニメーション種類**: `fade-in`, `fade-in-up`, `fade-in-left/right`, `scale-in`, `slide-in`, `stagger`（子要素順次表示）
3. **タイミング**: duration, delay, easing, stagger間隔

### Step 4: スクロール駆動アニメーション検出（CSS scroll-timeline）
CSS `scroll-timeline` / `animation-timeline: scroll()` / `view()` を検出:
- `scroll-timeline-name`, `scroll-timeline-axis` の定義
- `animation-timeline: scroll()` / `animation-timeline: view()` の使用
- `animation-range` によるトリガー範囲指定
- JS版 `ScrollTimeline` / `ViewTimeline` API の使用

### Step 5: View Transitions API の検出
ページ遷移・DOM変更時の View Transitions を検出:
- `document.startViewTransition()` の呼び出し
- CSS `view-transition-name` プロパティの定義
- `::view-transition-*` 疑似要素によるカスタムスタイル
- MPA 向け `@view-transition { navigation: auto; }` メタ指定
- SPA フレームワーク統合（Next.js `useViewTransition` 等）

### Step 6: ホバーエフェクトの特定
- ボタン: 色変化、拡大、シャドウ変化、矢印移動
- カード: 浮き上がり（translateY + shadow）、画像ズーム
- リンク: 下線アニメーション、色変化
- 画像: ズーム、オーバーレイ表示

### Step 7: ページ遷移・特殊アニメーションの検出
- ページ遷移（fade/slide/View Transitions API）、ローディング
- パララックス、数値カウントアップ、テキストアニメーション
- スクロール連動プログレスバー

### Step 8: パフォーマンス影響評価
検出した各アニメーションに対し以下を評価:

| レベル | 基準 | 推奨対応 |
|--------|------|----------|
| **low** | `opacity`/`transform` のみ。GPU合成レイヤーで完結 | そのまま実装 |
| **medium** | レイアウト非トリガーだが要素数多・同時発火5+ | `will-change` 付与、stagger で分散 |
| **high** | `width`/`height`/`top` 等レイアウトトリガー or 重いフィルタ | CSS変数/transform に置換、又は削除検討 |

評価項目: 対象プロパティ（compositorのみか）、同時発火数、Lottie/Canvas有無、モバイル影響

### Step 9: アニメーション優先度ランキング
時間制約がある場合の実装優先度を `priority` フィールドで付与:
- **P1（必須）**: ブランド印象を決定するヒーロー演出、主要CTA hover
- **P2（推奨）**: セクション進入アニメーション、カード hover
- **P3（余裕時）**: マイクロインタラクション、装飾的パララックス、ローディング

### Step 10: Reduced Motion フォールバック文書化
各アニメーションに `prefers-reduced-motion: reduce` 時のフォールバックを記録:
- `opacity` 系: `duration: 0` で即表示（位置移動なし）
- `transform` 系: 移動距離をゼロにし opacity のみ残す
- ループ/パララックス: 完全停止、静的状態を表示
- View Transitions: `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*) { animation-duration: 0s; } }`

### Step 11: 実装推奨の決定
- **CSS only**: シンプルなhover、transition、基本keyframes、scroll-timeline
- **framer-motion**: React向けスクロールアニメーション、ページ遷移
- **GSAP**: 複雑なタイムライン、ScrollTrigger連動

## 出力フォーマット

`/agents/web_builder/motion_analyzer/output.json` に保存:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero", "target": "h1, p, buttons",
      "motion_key": "masking-reveal", "type": "fade-in-up",
      "trigger": "on-load", "duration": "0.8s", "delay": "0.2s",
      "stagger": "0.15s", "easing": "ease-out",
      "implementation": "framer-motion variants + staggerChildren",
      "perf_impact": "low", "priority": "P1",
      "reduced_motion": "instant opacity, no translateY"
    }
  ],
  "scroll_driven_animations": [
    {
      "section_id": "progress-bar", "api": "CSS scroll-timeline",
      "timeline": "scroll(root block)", "range": "0% 100%",
      "motion_key": "scroll-progress-bar", "implementation": "CSS animation-timeline",
      "perf_impact": "low", "priority": "P2",
      "reduced_motion": "static full-width bar"
    }
  ],
  "view_transitions": [
    {
      "scope": "SPA", "trigger": "route-change",
      "transition_names": ["hero-image", "page-content"],
      "custom_styles": "::view-transition-old { animation: fade-out 0.2s }",
      "implementation": "document.startViewTransition + Next.js router",
      "perf_impact": "low", "priority": "P2",
      "reduced_motion": "animation-duration: 0s on all groups"
    }
  ],
  "hover_effects": [
    {
      "target": "primary-button",
      "effects": ["背景色暗化", "translateY(-2px)", "shadow-lg"],
      "duration": "0.3s", "easing": "ease",
      "implementation": "CSS transition + Tailwind hover:",
      "perf_impact": "low", "priority": "P1"
    }
  ],
  "page_transitions": {
    "type": "view-transition", "duration": "0.3s",
    "implementation": "View Transitions API + fallback framer-motion"
  },
  "special_animations": [
    {
      "type": "parallax", "section_id": "hero", "motion_key": "custom",
      "description": "背景画像が0.5倍速スクロール",
      "implementation": "CSS scroll-timeline or framer-motion useScroll",
      "perf_impact": "medium", "priority": "P3",
      "reduced_motion": "static background, no parallax"
    }
  ],
  "loading_animation": { "has_loader": false, "type": "none" },
  "recommended_library": "framer-motion",
  "recommended_library_reason": "Next.js統合性、スクロール/遷移/ホバーを統一的に扱える",
  "complexity_level": "medium",
  "total_animation_count": 12,
  "perf_summary": {
    "high_impact_count": 0, "medium_impact_count": 2,
    "recommendation": "will-change付与でmedium→low化可能"
  },
  "proposed_motion": []
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し

## モーション語彙のマッピング（必須参照）

検出モーションは **`/design-md/motion-library/MOTION_30.md` の `motion_key`** に必ずマッピング。

**手順:**
1. 検出モーションの演出・発火条件・ライブラリを整理
2. MOTION_30.md の30件+和文B2B 3件から最も近い `motion_key` を選択
3. 複数候補は演出忠実度が高い方を優先
4. 該当なしは `motion_key: "custom"` + `proposed_motion` に追加候補を記録

**よくあるマッピング例:**
- 画面が円形展開 → `circle-reveal` / 斜めパネル遷移 → `slanted-slide`
- 文字が下からマスク表示 → `masking-reveal` / 数字ドラムロール → `slot-counter`
- カード3D傾斜 → `card-tilt` / 常時ノイズ背景 → `overlay-texture`
- スクロール進捗バー → `scroll-progress-bar` / キーワード横流れ → `marquee-keywords`
