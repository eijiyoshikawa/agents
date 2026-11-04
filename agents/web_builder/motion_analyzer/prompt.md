# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を
詳細に特定し、パフォーマンス影響とアクセシビリティを評価した上で、
Builder が正確に再現できるモーション設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json` を読み込む
- 各ページのHTML/CSS/JSを `WebFetch` で取得

## 実行手順

### Step 1: CSS アニメーション・トランジションの検出
- `@keyframes` 定義（アニメーション名、プロパティ変化、タイミング）
- `transition` プロパティ（対象、duration、easing）
- `animation` プロパティ（keyframes参照、繰り返し、方向）
- `transform` / `opacity` の変化パターン
- **イージング分類**: linear / ease / ease-out / cubic-bezier（カスタム値を記録）

### Step 2: JavaScript アニメーションライブラリの検出
`site_scanner` の `external_libraries` を参照しつつ検出:
- **GSAP**: `gsap.to()`, `ScrollTrigger`, `timeline`
- **AOS**: `data-aos="fade-up"` 等
- **Framer Motion**: `motion.div`, `animate`, `variants`
- **Intersection Observer**: ネイティブスクロール検出
- **Lottie**: `lottie-player`
- **Scroll系**: `scroll-behavior: smooth`, parallax

### Step 3: スクロールアニメーションの特定
各セクション/要素について:
1. **トリガー条件**: on-load / scroll-into-view / scroll-position
2. **アニメーション種類**: fade-in / fade-in-up / fade-in-left / scale-in / slide-in / stagger
3. **タイミング**: duration / delay / easing（cubic-bezier値を正確に記録）
4. **スタガー**: 子要素の順次表示間隔

### Step 4: ホバーエフェクトの特定
- ボタン: 色変化 / 拡大 / シャドウ変化 / 矢印移動
- カード: 浮き上がり / 画像ズーム
- リンク: 下線アニメーション / 色変化

### Step 5: 特殊アニメーションの検出
ページ遷移 / ローディング / パララックス / カウントアップ / テキストアニメーション / プログレスバー

### Step 6: パフォーマンス影響評価
各アニメーションのパフォーマンスインパクトを評価:
- **GPU合成プロパティ**: `transform` / `opacity` のみ → 低負荷（推奨）
- **レイアウト発火**: `width` / `height` / `margin` 変化 → 高負荷（要代替案）
- **ペイント発火**: `background-color` / `box-shadow` 変化 → 中負荷
- **同時発火数**: 1ページあたりの同時アニメーション数（2件以内推奨、CLS/INP悪化防止）
- **フレームバジェット**: 60fps維持に問題がある複雑なアニメーションを警告

### Step 7: アクセシビリティ評価
- **`prefers-reduced-motion`対応**: 参考サイトがreduced-motionを尊重しているか
- **フラッシュリスク**: 3Hz以上の点滅アニメーションがないか（WCAG 2.3.1）
- **注意散漫リスク**: 常時再生ループアニメーションの有無
- Builder への必須指示: 対応状況に関わらず、再現サイトでは全モーションに `prefers-reduced-motion: reduce` フォールバック必須

### Step 8: 実装推奨と MOTION_30 マッピング
検出したモーションを `/design-md/motion-library/MOTION_30.md` の `motion_key` にマッピング:
- **CSS only**: シンプルなhover、transition、基本keyframes
- **framer-motion**: スクロールアニメーション、ページ遷移
- **GSAP**: 複雑なタイムライン、ScrollTrigger連動

マッピング手順: 検出モーション → MOTION_30から最も近い`motion_key`選択 → 該当なしは`custom`

## 出力フォーマット

`/agents/web_builder/motion_analyzer/output.json` に保存:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1, p, buttons",
      "motion_key": "grow-from-bottom",
      "type": "fade-in-up",
      "trigger": "on-load",
      "duration": "0.8s", "delay": "0.2s", "stagger": "0.15s",
      "easing": "cubic-bezier(0.0, 0.0, 0.2, 1)",
      "performance_impact": "low",
      "gpu_composited": true,
      "implementation": "framer-motion variants + staggerChildren"
    }
  ],
  "hover_effects": [
    {
      "target": "primary-button",
      "effects": ["背景色変化", "translateY(-2px)", "shadow追加"],
      "duration": "0.3s", "easing": "ease",
      "performance_impact": "low",
      "implementation": "CSS transition + Tailwind hover:"
    }
  ],
  "page_transitions": {"type": "fade | slide | none", "duration": "0.3s"},
  "special_animations": [
    {"type": "parallax", "section_id": "hero", "performance_impact": "medium", "description": ""}
  ],
  "performance_summary": {
    "max_concurrent_animations": 0,
    "layout_triggering_animations": 0,
    "total_animation_count": 0,
    "complexity_level": "low | medium | high",
    "recommendations": ["高負荷アニメーションの代替案等"]
  },
  "accessibility": {
    "reduced_motion_supported": false,
    "flash_risk": false,
    "auto_play_loops": 0
  },
  "recommended_library": "framer-motion | GSAP | CSS only",
  "proposed_motion": []
}
```

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: モーション設計が実装可能か、パフォーマンス基準内か検証
- **Web Builder / interaction_analyzer**: インタラクションとアニメーションの重複・競合検証
- **UI/UX Designer**: モーションのUX適切性・アクセシビリティレビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
