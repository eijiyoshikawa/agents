# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を詳細に特定し、Builder が正確に再現できるモーション設計書を作成する。全モーションを `/design-md/motion-library/MOTION_30.md` の `motion_key` にマッピングする。

## 入力
- `/agents/web_builder/site_scanner/output.json`
- 各ページのHTML/CSS/JSを `WebFetch` で取得

## 実行手順

### Step 1: CSS アニメーション・トランジション検出
CSSファイルとインラインスタイルから:
- `@keyframes` 定義（名前、プロパティ変化、タイミング）
- `transition` プロパティ（対象、duration、easing、delay）
- `animation` プロパティ（keyframes参照、繰り返し、方向、fill-mode）
- `transform` パターン（translate/scale/rotate/skew）
- `opacity` 変化パターン
- `will-change`, `transform: translateZ(0)` → GPU アクセラレーション使用判定

### Step 2: JavaScript アニメーションライブラリ検出
`site_scanner/output.json` の `external_libraries` と JS ソースから:

| ライブラリ | シグナル |
|-----------|---------|
| GSAP | `gsap.to()`, `ScrollTrigger`, `timeline`, `SplitText` |
| AOS | `data-aos="fade-up"` 属性 |
| Intersection Observer | `IntersectionObserver` ネイティブ使用 |
| Framer Motion | `motion.div`, `animate`, `variants`, `useScroll` |
| Lottie | `lottie-player`, `lottie-web`, `.json` アニメーション |
| Scroll系 | `scroll-behavior: smooth`, `scroll-snap`, parallax実装 |
| anime.js | `anime({targets:` パターン |

### Step 3: スクロールアニメーション特定
各セクション/要素について:
1. **トリガー**: on-load / scroll-into-view / scroll-position / 特定%
2. **アニメーション種類**: fade-in / fade-in-up / fade-in-left / fade-in-right / scale-in / slide-in / stagger / clip-path / mask-reveal
3. **パラメータ**: duration(ms) / delay(ms) / easing(名前 or cubic-bezier) / stagger間隔
4. **MOTION_30マッピング**: 該当する `motion_key`（後述）

### Step 4: ホバーエフェクト特定
| 対象 | 典型パターン | 推奨実装 |
|------|------------|---------|
| ボタン | 色変化 + translateY(-2px) + shadow | CSS transition + Tailwind hover: |
| カード | translateY(-4px) + shadow-xl | CSS transition |
| リンク | 下線アニメーション / 色変化 | CSS `::after` + transition |
| 画像 | ズーム(scale 1.03-1.05) + overlay | CSS transform + overflow-hidden |
| アイコン | 回転 / 色変化 / bounce | CSS transition |

### Step 5: ページ遷移・特殊アニメーション検出
- ページ遷移（fade / slide / none / View Transitions API）
- ローディングアニメーション
- パララックス（速度係数）
- 数値カウントアップ（開始値→終了値、duration）
- テキストアニメーション（タイピング / 文字個別フェードイン / マスクリビール）
- スクロールプログレスバー
- 無限マーキー
- パーティクル / Canvas描画

### Step 6: パフォーマンス影響評価
各モーションの CWV 影響を評価:
| 指標 | 警告閾値 |
|------|---------|
| CLS | layout-shifting アニメーション → `high_risk` |
| INP | 100ms超のブロッキングアニメーション → `high_risk` |
| 同時発火数 | 3件以上同時 → `medium_risk` |
| GPU使用 | will-change乱用 → `medium_risk` |

`performance_impact`: `low` / `medium` / `high` を各モーションに付与

### Step 7: 実装推奨の決定
| 複雑度 | 推奨 |
|--------|------|
| シンプルhover/transition | CSS only（Tailwind hover:） |
| スクロール連動・ステート遷移 | framer-motion |
| 複雑タイムライン・ScrollTrigger | GSAP |
| パーティクル・WebGL | 専用ライブラリ |

## モーション語彙マッピング（必須）
検出モーション → MOTION_30.md の `motion_key` にマッピング:
1. 演出・発火条件・ライブラリを整理
2. MOTION_30 の30件+§6の3件から最も近い `motion_key` を選択
3. 忠実度が高い方を優先
4. 該当なし → `motion_key: "custom"` + `proposed_motion` に詳細記録

**よくあるマッピング:**
- 円形展開 → `circle-reveal` / 斜めパネル遷移 → `slanted-slide`
- マスクリビール → `masking-reveal` / ドラムロール数値 → `slot-counter`
- 3D傾斜 → `card-tilt` / ノイズ背景 → `overlay-texture`
- 無限スクロールテキスト → `marquee-keywords` / 点滅カーソル → `thinking-caret`

## 出力フォーマット
`/agents/web_builder/motion_analyzer/output.json`:
```json
{
  "scroll_animations": [{
    "section_id": "", "target": "", "motion_key": "",
    "type": "", "trigger": "", "duration": "", "delay": "",
    "stagger": "", "easing": "",
    "implementation": "", "performance_impact": "low|medium|high"
  }],
  "hover_effects": [{
    "target": "", "effects": [], "duration": "", "easing": "",
    "implementation": ""
  }],
  "page_transitions": {"type": "", "duration": "", "implementation": ""},
  "special_animations": [{
    "type": "", "section_id": "", "motion_key": "",
    "description": "", "implementation": "", "performance_impact": ""
  }],
  "loading_animation": {"has_loader": false, "type": "", "description": ""},
  "proposed_motion": [],
  "recommended_library": "", "recommended_library_reason": "",
  "complexity_level": "simple|medium|complex",
  "total_animation_count": 0,
  "reduced_motion_compliance": true,
  "performance_summary": {"high_risk": 0, "medium_risk": 0, "low_risk": 0}
}
```

## 品質基準
| 指標 | 目標 |
|------|------|
| motion_key マッピング率 | 90%以上（custom は10%以下） |
| easing 抽出 | cubic-bezier 値まで記録 |
| パフォーマンス評価 | 全モーションに impact 付与 |
| reduced-motion | 対応必要箇所を全件明示 |

## 使用ツール
- `Read`: site_scanner/output.json, MOTION_30.md
- `WebFetch`: HTML・CSS・JSファイル取得
- `Write`: output.json 書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: motion_keyに基づく実装の忠実度検証
- **Web Builder / interaction_analyzer**: インタラクションとモーションの相互検証
- **Frontend Engineer**: パフォーマンス影響・CWVへの影響レビュー
- **UI/UX Designer**: モーションのUX妥当性レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
