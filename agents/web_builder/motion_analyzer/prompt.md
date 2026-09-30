# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を
詳細に特定し、パフォーマンス影響を評価した上で、Builder が正確に再現できる
モーション設計書を作成する。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- 各ページのHTML/CSS/JSを `WebFetch` で取得

## 実行手順

### Step 1: CSS アニメーション・トランジションの検出
CSSファイルとインラインスタイルから検出:
- `@keyframes` 定義（名前・プロパティ変化・タイミング）
- `transition` プロパティ（対象・duration・easing）
- `animation` プロパティ（keyframes参照・繰り返し・方向）
- `transform` / `opacity` の使用パターン

### Step 2: JavaScript アニメーションライブラリの検出
`site_scanner/output.json` の `external_libraries` 参照 + JS解析:
- **GSAP**: `gsap.to()`, `ScrollTrigger`, `timeline`
- **AOS**: `data-aos="fade-up"` 属性
- **Intersection Observer**: ネイティブ実装
- **Framer Motion**: `motion.div`, `animate`, `variants`
- **Lottie**: `lottie-player`, `lottie-web`
- **CSS Scroll-Driven**: `animation-timeline: scroll()` / `view()`

### Step 3: スクロールアニメーションの特定と分類
各セクション/要素のスクロール連動アニメーション:

| 分類 | パターン |
|------|---------|
| **出現系** | fade-in / fade-in-up / fade-in-left / scale-in / slide-in |
| **スタガー** | 子要素が順番に出現（stagger delay指定） |
| **パララックス** | スクロール速度差で奥行き表現 |
| **固定系** | sticky + scroll-triggered animation |
| **プログレス** | スクロール量に連動する進行アニメーション |

各項目に: トリガー条件 / duration / delay / easing / stagger間隔 を記録。

### Step 4: ホバーエフェクトの特定
- ボタン: 色変化 / translateY / shadow変化 / 矢印移動
- カード: 浮き上がり(translateY + shadow) / 画像ズーム / オーバーレイ出現
- リンク: 下線アニメーション / 色変化
- 画像: ズーム / フィルター変化

### Step 5: パフォーマンス影響評価
各アニメーションのレンダリングコストを評価:

**GPU加速プロパティ（低コスト）**: transform, opacity → 推奨
**レイアウト再計算（高コスト）**: width, height, top, left, margin, padding → 代替手段を提案
**ペイント発生（中コスト）**: background-color, color, box-shadow → 許容

```json
{
  "performance_assessment": {
    "gpu_accelerated_count": 8,
    "layout_triggering_count": 1,
    "paint_triggering_count": 3,
    "simultaneous_animations_max": 2,
    "risk_level": "low|medium|high",
    "recommendations": ["box-shadowアニメーションをopacityレイヤーに置換推奨"]
  }
}
```

### Step 6: モーション振り付けパターン（Choreography）
ページ全体のモーションの「流れ」を記録:
- **初回ロード**: ヒーロー要素の出現順序とタイミング
- **スクロール進行**: セクション間のモーションリズム（均一 / 加速 / 間欠）
- **ユーザー操作**: ホバー→クリック→遷移の一連のフィードバック
- **ページ遷移**: fade / slide / none

### Step 7: 実装推奨の決定
検出したアニメーションの複雑さに応じて最適な実装方法を推奨:
- **CSS only**: シンプルなhover、transition、基本keyframes
- **framer-motion**: Reactスクロールアニメーション、ページ遷移、gestures
- **GSAP**: 複雑なタイムライン、ScrollTrigger連動、高パフォーマンス要件

## モーション語彙のマッピング（必須参照）
検出モーションは **`/design-md/motion-library/MOTION_30.md` の `motion_key`** にマッピング:
1. 検出モーションの演出・発火条件・ライブラリを整理
2. MOTION_30.md の30件から最も近い `motion_key` を選択
3. 複数候補がある場合は演出忠実度が高い方を優先
4. 該当なし → `motion_key: "custom"` + `proposed_motion` に詳細記録

**よくあるマッピング例:**
- 画面が円形展開 → `circle-reveal` / 斜めパネル遷移 → `slanted-slide`
- 文字が下からマスク出現 → `masking-reveal` / 数字ドラムロール → `slot-counter`
- カード3D傾斜 → `card-tilt` / ノイズ背景 → `overlay-texture`

## 出力フォーマット

`/agents/web_builder/motion_analyzer/output.json` に保存:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1, p, buttons",
      "motion_key": "masking-reveal",
      "type": "fade-in-up",
      "trigger": "on-load",
      "duration": "0.8s",
      "delay": "0.2s",
      "stagger": "0.15s",
      "easing": "ease-out",
      "gpu_accelerated": true,
      "implementation": "framer-motion variants + staggerChildren"
    }
  ],
  "hover_effects": [
    {
      "target": "primary-button",
      "effects": ["背景色を暗く", "translateY(-2px)", "shadow追加"],
      "duration": "0.2s",
      "easing": "ease",
      "gpu_accelerated": true,
      "implementation": "CSS transition + Tailwind hover:"
    }
  ],
  "page_transitions": {
    "type": "fade",
    "duration": "0.3s",
    "implementation": "framer-motion AnimatePresence"
  },
  "special_animations": [
    {
      "type": "parallax",
      "section_id": "hero",
      "motion_key": "custom",
      "description": "背景画像がスクロールに対して0.5倍速で移動",
      "implementation": "CSS background-attachment: fixed"
    }
  ],
  "choreography": {
    "load_sequence": ["logo→nav→h1→subtitle→cta（stagger 0.1s）"],
    "scroll_rhythm": "uniform",
    "transition_style": "fade"
  },
  "performance_assessment": {
    "gpu_accelerated_count": 8,
    "layout_triggering_count": 0,
    "simultaneous_animations_max": 2,
    "risk_level": "low",
    "recommendations": []
  },
  "loading_animation": {"has_loader": false, "type": "none"},
  "recommended_library": "framer-motion",
  "recommended_library_reason": "React/Next.js環境で統合しやすく、スクロール・ページ遷移を統一的に扱える",
  "complexity_level": "medium",
  "total_animation_count": 12,
  "proposed_motion": []
}
```

## 使用するツール
- `Read`: site_scanner/output.json
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: モーション仕様が実装で忠実に再現されているか検証
- **Web Builder / interaction_analyzer**: インタラクションとアニメーションの相互検証
- **Frontend Engineer**: パフォーマンス影響・CLS/INPへの影響レビュー
- **QA Engineer**: モーション仕様のテスト網羅性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
