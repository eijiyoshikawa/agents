# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を詳細に特定し、
パフォーマンス影響を評価した上で、Builder が正確に再現できるモーション設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/CSS/JSを `WebFetch` で取得

## 実行手順

### Step 1: CSS アニメーション・トランジションの検出
CSSファイルとインラインスタイルから以下を検出する:
- `@keyframes` 定義（アニメーション名、プロパティ変化、タイミング）
- `transition` プロパティ（対象プロパティ、duration、easing）
- `animation` プロパティ（参照するkeyframes、繰り返し、方向）
- `transform` の使用パターン（translate, scale, rotate）
- `opacity` の変化パターン

### Step 2: JavaScript アニメーションライブラリの検出
`site_scanner/output.json` の `external_libraries` を参照しつつ、JSソースから検出する:
- **GSAP**: `gsap.to()`, `ScrollTrigger`, `timeline`
- **AOS**: `data-aos="fade-up"` 等の属性
- **Intersection Observer**: `IntersectionObserver` の使用
- **Framer Motion**: `motion.div`, `animate`, `variants`
- **Lottie**: `lottie-player`, `lottie-web`
- **Scroll系**: `scroll-behavior: smooth`, parallax 実装

### Step 3: スクロールトリガーアニメーションの詳細分析
ページスクロール時に発火するアニメーションを特定する:

**トリガーメカニズムの分類:**
- **Intersection Observer**: threshold 値、rootMargin の設定
- **GSAP ScrollTrigger**: start/end ポイント、scrub、pin の設定
- **CSS scroll-timeline**: `@scroll-timeline`, `animation-timeline` の使用
- **Scroll-driven Animations**: `view()`, `scroll()` タイムラインの使用

**各アニメーションについて記録:**
1. **トリガー条件**: 画面内に入った時 / スクロール位置 / 特定の%
2. **アニメーション種類**: fade-in / fade-in-up / fade-in-left / scale-in / slide-in / stagger
3. **タイミング**: duration, delay, easing（名前付き / cubic-bezier 値）
4. **スタガー**: 子要素の順番表示の間隔
5. **スクロール連動度**: trigger-once / scrub（スクロール位置に連動） / pin

### Step 4: ホバーエフェクトの特定
マウスオーバー時の演出を記録する:
- ボタン: 色変化、拡大、シャドウ変化、矢印移動
- カード: 浮き上がり（translateY + shadow）、画像ズーム
- リンク: 下線アニメーション、色変化
- 画像: ズーム、オーバーレイ表示

### Step 5: ページ遷移パターンの検出
- **SPA遷移**: fade / slide / crossfade / shared-layout-animation
- **View Transitions API**: `::view-transition-*` 擬似要素の使用
- **ルーティングライブラリ連携**: Next.js App Router / Framer Motion AnimatePresence
- **遷移前後の要素対応**: 共有要素遷移（shared element transition）の有無

### Step 6: ローディング・フィードバックアニメーション

**ローディング状態:**
- 初回ページロード: プログレスバー / スピナー / ロゴアニメーション / スケルトン
- コンテンツ遅延読み込み: プレースホルダー / shimmer エフェクト / blur-up
- ページ遷移中: トップバープログレス / フェードオーバーレイ

**マイクロフィードバック:**
- フォーム送信: ボタン内スピナー / 成功チェックマーク / エラーシェイク
- コピー完了: ツールチップ変化 / アイコン変化
- いいね/お気に入り: ハートアニメーション / カウントアップ
- トースト通知: スライドイン方向、自動消去タイミング

### Step 7: テキスト・数値アニメーション
- テキスト表示: タイピング / 文字ごとのフェードイン / マスクリビール / スプリットテキスト
- 数値: カウントアップ / スロットカウンター / 桁ごとのロール
- スクロールバー連動プログレスバー
- マーキー（横スクロールテキスト）

### Step 8: パフォーマンス影響の評価
検出した各アニメーションのレンダリングコストを分類する:

**レイヤー分類（安価→高価）:**
- **Composite のみ**: `transform`(translate/scale/rotate), `opacity` → GPU処理、高パフォーマンス
- **Paint 発生**: `background-color`, `box-shadow`, `border-radius` 変化 → 中程度のコスト
- **Layout 発生**: `width`, `height`, `margin`, `padding`, `top/left` 変化 → 高コスト、要最適化

**評価項目:**
- `will-change` / `transform: translateZ(0)` によるレイヤー昇格の有無
- 同時アニメーション数の推定（過剰な同時実行は jank の原因）
- 大きな要素（ヒーロー画像等）のアニメーションコスト
- `contain` プロパティによるレイアウト封じ込めの有無

### Step 9: アクセシビリティ対応（Reduced Motion）の検出
- `@media (prefers-reduced-motion: reduce)` の有無
- 対応範囲: 全アニメーション停止 / 必須アニメーションのみ維持 / duration 短縮
- 未対応の場合、Builder への推奨フォールバックを記録

### Step 10: モーションデザインシステムの抽出
サイト全体で統一されたモーション設計パターンを抽出する:

**タイミング関数の体系:**
- 標準 easing（ease-out / ease-in-out / cubic-bezier 値）
- 用途別easing: 登場(ease-out) / 退場(ease-in) / 強調(spring/bounce)

**デュレーションスケール:**
- instant: 100ms以下（ホバー、トグル）
- fast: 150-250ms（ボタン、小要素の遷移）
- normal: 300-500ms（セクション表示、カード登場）
- slow: 600-1000ms（ヒーロー、ページ遷移）
- 全体の一貫性評価（統一されたスケールか、バラバラか）

### Step 11: 実装推奨の決定
検出したアニメーションの複雑さに応じて最適な実装方法を推奨する:
- **CSS only**: シンプルなhover、transition、基本的なkeyframes
- **framer-motion**: React向けスクロールアニメーション、ページ遷移
- **GSAP**: 複雑なタイムライン、ScrollTrigger連動、パフォーマンス重視

## 出力フォーマット

`/agents/web_builder/motion_analyzer/output.json` に保存:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1, p, buttons",
      "motion_key": "fade-in-up",
      "type": "fade-in-up",
      "trigger": "on-load",
      "trigger_mechanism": "none (initial load)",
      "duration": "0.8s",
      "delay": "0.2s",
      "stagger": "0.15s",
      "easing": "ease-out",
      "performance_layer": "composite",
      "implementation": "framer-motion variants + staggerChildren"
    }
  ],
  "hover_effects": [
    {
      "target": "primary-button",
      "effects": ["背景色を暗く", "translateY(-2px)", "shadow-lg追加"],
      "duration": "0.3s",
      "easing": "ease",
      "performance_layer": "composite + paint",
      "implementation": "CSS transition + Tailwind hover:"
    }
  ],
  "page_transitions": {
    "type": "fade",
    "method": "framer-motion AnimatePresence | View Transitions API | none",
    "duration": "0.3s",
    "shared_elements": false
  },
  "loading_animations": {
    "initial_load": {"type": "none | progress-bar | skeleton", "duration": "auto"},
    "content_lazy": {"type": "none | shimmer | blur-up"},
    "navigation": {"type": "none | top-bar-progress | fade-overlay"}
  },
  "micro_feedback": [
    {"trigger": "form-submit", "animation": "button-spinner → check-mark", "duration": "0.5s"},
    {"trigger": "copy-click", "animation": "icon-swap + tooltip", "duration": "1.5s"}
  ],
  "text_animations": [
    {"type": "text-reveal", "section_id": "hero", "motion_key": "masking-reveal", "implementation": "framer-motion + overflow-hidden"}
  ],
  "special_animations": [
    {"type": "parallax", "section_id": "hero", "description": "背景画像がスクロールに対して0.5倍速で移動", "performance_layer": "composite"}
  ],
  "performance_assessment": {
    "composite_only_ratio": "80%",
    "layout_triggering_animations": ["none | 該当アニメーションID"],
    "simultaneous_animation_peak": 5,
    "uses_will_change": true,
    "uses_contain": false,
    "overall_rating": "good | acceptable | needs-optimization"
  },
  "reduced_motion": {
    "implemented": true,
    "strategy": "all-disabled | essentials-only | duration-reduced",
    "uncovered_animations": []
  },
  "motion_design_system": {
    "easing": {
      "default": "cubic-bezier(0.4, 0, 0.2, 1)",
      "enter": "cubic-bezier(0, 0, 0.2, 1)",
      "exit": "cubic-bezier(0.4, 0, 1, 1)",
      "emphasis": "cubic-bezier(0.34, 1.56, 0.64, 1)"
    },
    "duration_scale": {
      "instant": "100ms",
      "fast": "200ms",
      "normal": "300ms",
      "slow": "600ms",
      "page": "800ms"
    },
    "consistency_score": "high | medium | low"
  },
  "proposed_motion": [],
  "recommended_library": "framer-motion",
  "recommended_library_reason": "理由",
  "complexity_level": "low | medium | high",
  "total_animation_count": 12
}
```

## モーション語彙のマッピング（必須参照）
検出したモーションは **`/design-md/motion-library/MOTION_30.md` の `motion_key`** にマッピングする。

**マッピング手順:**
1. 検出したモーションの演出・発火条件・使用ライブラリを整理
2. MOTION_30.md の 30件から最も近い `motion_key` を選択
3. 複数候補がある場合は演出の忠実度が高い方を優先
4. 該当なしの場合は `motion_key: "custom"` とし `proposed_motion` に追加候補を記録

**よくあるマッピング例:**
- 円形展開 → `circle-reveal` / 斜めパネル遷移 → `slanted-slide`
- マスクリビール → `masking-reveal` / 数字ドラムロール → `slot-counter`
- 3D傾斜カード → `card-tilt` / ノイズ背景 → `overlay-texture`

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: モーション設計書が実装に十分な精度で記述されているか検証
- **Web Builder / design_analyzer**: デザイントークン（easing, duration）との整合性検証
- **Frontend Engineer**: パフォーマンス影響とアクセシビリティ対応の妥当性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
