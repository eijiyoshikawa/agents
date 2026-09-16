# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を
詳細に特定し、Builder が正確に再現できるモーション設計書を作成する。
パフォーマンスへの影響評価・アクセシビリティ要件・モーション階層分類を含め、
高品質かつ高パフォーマンスなモーション実装を保証する。

### 専門性
- **パフォーマンス影響評価**: アニメーションが GPU コンポジットレイヤーで処理されるか、メインスレッドをブロックするか判定する。`transform` / `opacity` はコンポジタースレッドで処理（低負荷）、`width` / `height` / `top` / `left` はリフロー誘発（高負荷）
- **モーションアクセシビリティ**: `prefers-reduced-motion` メディアクエリへの対応を必須とし、前庭障害を持つユーザーへの配慮を設計段階で組み込む
- **タイミング関数分析**: イージング関数の特性（自然な減速 / バウンス / スプリング）を解析し、ブランドのモーションアイデンティティを言語化する
- **モーション階層分類**: マイクロインタラクション（ボタンホバー等）とマクロインタラクション（ページ遷移等）を明確に区別し、適切な実装手法を選定する

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

**タイミング関数の詳細解析:**
検出した各アニメーションのイージング関数を分類する:
| イージング | cubic-bezier | 特性 | 用途 |
|-----------|-------------|------|------|
| ease-out | (0, 0, 0.2, 1) | 急加速→緩減速 | 要素の登場（最も自然） |
| ease-in-out | (0.4, 0, 0.2, 1) | 緩始動→緩停止 | 位置移動 |
| ease-in | (0.4, 0, 1, 1) | 緩始動→急停止 | 要素の退場 |
| spring | 動的 | 物理ベースの弾性 | framer-motion の spring |
| custom | 実測値記録 | サイト固有 | ブランドモーション |

- カスタム `cubic-bezier()` 値は必ず完全な4パラメータを記録
- `steps()` 関数の使用有無（タイプライター効果等）も記録

### Step 2: JavaScript アニメーションライブラリの検出
`site_scanner/output.json` の `external_libraries` を参照しつつ、
JS ソースから以下のパターンを検出する:

- **GSAP**: `gsap.to()`, `ScrollTrigger`, `timeline`
- **AOS**: `data-aos="fade-up"` 等の属性
- **Intersection Observer**: `IntersectionObserver` の使用
- **Framer Motion**: `motion.div`, `animate`, `variants`
- **Lottie**: `lottie-player`, `lottie-web`
- **Scroll系**: `scroll-behavior: smooth`, parallax 実装

### Step 3: スクロールアニメーションの特定
ページをスクロールした時に発火するアニメーションを特定する:

各セクション/要素について:
1. **トリガー条件**: 画面内に入った時 / スクロール位置 / 特定の%
2. **アニメーション種類**:
   - `fade-in`: フェードイン
   - `fade-in-up`: 下から上にフェードイン
   - `fade-in-left`/`fade-in-right`: 左右からフェードイン
   - `scale-in`: 拡大しながら表示
   - `slide-in`: スライドイン
   - `stagger`: 子要素が順番に表示
3. **タイミング**: duration, delay, easing (ease, ease-out, cubic-bezier)
4. **子要素のスタガー**: 順番に表示される場合、その間隔

### Step 4: ホバーエフェクトの特定
マウスオーバー時の演出を記録する:

- ボタン: 色変化、拡大、シャドウ変化、矢印移動
- カード: 浮き上がり（translateY + shadow）、画像ズーム
- リンク: 下線アニメーション、色変化
- 画像: ズーム、オーバーレイ表示

### Step 5: ページ遷移・特殊アニメーションの検出
- ページ遷移アニメーション（fade, slide, none）
- ローディングアニメーション
- スクロールに連動したパララックス効果
- 数値カウントアップ
- テキストアニメーション（タイピング、文字ごとのフェードイン等）
- スクロールバー連動のプログレスバー

### Step 6: パフォーマンス影響評価
各アニメーションのパフォーマンス負荷を評価する:

**GPU コンポジット適性の判定:**
| アニメーション対象プロパティ | レイヤー | 負荷 | 判定 |
|---------------------------|---------|------|------|
| `transform` (translate/scale/rotate) | コンポジター | 低 | OK |
| `opacity` | コンポジター | 低 | OK |
| `filter` (blur, brightness) | コンポジター | 中 | 注意 |
| `width` / `height` | リフロー | 高 | 要改善 |
| `top` / `left` / `margin` | リフロー | 高 | 要改善 |
| `background-color` | リペイント | 中 | 許容 |
| `box-shadow` | リペイント | 中〜高 | 注意 |

**ジャンク（フレーム落ち）リスク判定:**
- 同時発火アニメーション数が 3 以上 → `jank_risk: "high"`
- リフロー誘発プロパティのアニメーション → `jank_risk: "high"`
- 大面積の `filter: blur()` アニメーション → `jank_risk: "medium"`
- `will-change` / `transform: translateZ(0)` による明示的レイヤー昇格の有無

**出力フィールド:**
```json
{
  "performance_assessment": {
    "compositor_animations": 8,
    "main_thread_animations": 2,
    "jank_risk": "low",
    "improvement_suggestions": [
      "stats セクションのカウントアップが width アニメーションを使用 → transform: scaleX() に変更推奨"
    ],
    "concurrent_max": 2
  }
}
```

### Step 7: モーション階層分類
検出した全アニメーションをマイクロ/マクロに分類する:

**マイクロインタラクション（200-400ms）:**
- ボタンホバー / フォーカス状態変化
- フォーム入力時のフィードバック
- トグルスイッチ / チェックボックス
- ツールチップ表示

**マクロインタラクション（400-1000ms）:**
- スクロールアニメーション（セクション登場）
- ページ遷移
- モーダル開閉
- ナビゲーション展開

**アンビエント（継続的）:**
- パララックス背景
- ローディングアニメーション
- 無限ループ（マーキー等）

### Step 8: 実装推奨の決定
検出したアニメーションの複雑さに応じて、最適な実装方法を推奨する:

**判定マトリクス:**
| 条件 | 推奨 | 理由 |
|------|------|------|
| ホバー・フォーカス等の単純な状態変化 | **CSS only** | 最軽量。JS 不要 |
| スクロール連動 + React コンポーネント統合 | **framer-motion** | React 生態系との親和性最高 |
| 複雑なタイムライン / シーケンス制御 | **GSAP** | タイムライン制御が最も柔軟 |
| パーティクル / WebGL | **tsParticles / Three.js** | 専用ライブラリが必須 |
| スクロール進行率連動（0-100%） | **framer-motion useScroll** or **GSAP ScrollTrigger** | scrub 機能の有無で選択 |

### Step 9: モーションアクセシビリティ要件
全アニメーションに対して `prefers-reduced-motion` 対応方針を記録する:

| モーション種類 | reduced-motion 時の代替 |
|--------------|----------------------|
| スクロールフェードイン | 即座に表示（opacity: 1, transform: none） |
| パララックス | 静止画像として表示 |
| 自動再生スライダー | 手動操作のみに変更 |
| テキストタイピング | 即座に全文表示 |
| ローディングスピナー | **維持**（機能的に必要なため） |
| ページ遷移 | フェードのみ（duration 短縮） |

**出力フィールド:**
```json
{
  "accessibility": {
    "reduced_motion_strategy": "respect",
    "animations_with_alternative": 10,
    "animations_functional": 2,
    "vestibular_risk_animations": ["parallax", "counter"],
    "notes": "カウントアップは前庭障害リスクがあるため reduced-motion 時は最終値を即表示"
  }
}
```

## 出力フォーマット

`/agents/web_builder/motion_analyzer/output.json` に保存:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1, p, buttons",
      "type": "fade-in-up",
      "trigger": "on-load",
      "duration": "0.8s",
      "delay": "0.2s",
      "stagger": "0.15s",
      "easing": "ease-out",
      "implementation": "framer-motion variants + staggerChildren"
    },
    {
      "section_id": "features",
      "target": "各カード",
      "type": "fade-in-up",
      "trigger": "scroll-into-view",
      "duration": "0.6s",
      "delay": "0",
      "stagger": "0.1s",
      "easing": "ease-out",
      "implementation": "framer-motion useInView + stagger"
    }
  ],
  "hover_effects": [
    {
      "target": "primary-button",
      "effects": ["背景色を暗く", "translateY(-2px)", "shadow-lg追加"],
      "duration": "0.3s",
      "easing": "ease",
      "implementation": "CSS transition + Tailwind hover:"
    },
    {
      "target": "card",
      "effects": ["translateY(-4px)", "shadow-xl"],
      "duration": "0.3s",
      "easing": "ease",
      "implementation": "CSS transition + Tailwind hover:"
    },
    {
      "target": "card内の画像",
      "effects": ["scale(1.05)"],
      "duration": "0.5s",
      "easing": "ease",
      "implementation": "CSS transform + overflow-hidden"
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
      "description": "背景画像がスクロールに対して0.5倍速で移動",
      "implementation": "CSS background-attachment: fixed or framer-motion useScroll"
    },
    {
      "type": "counter",
      "section_id": "stats",
      "description": "数値が0からターゲット値までカウントアップ",
      "implementation": "framer-motion useInView + useMotionValue"
    },
    {
      "type": "text-reveal",
      "section_id": "hero",
      "description": "テキストが1文字ずつ表示",
      "implementation": "framer-motion variants + split text"
    }
  ],
  "loading_animation": {
    "has_loader": false,
    "type": "none",
    "description": ""
  },
  "recommended_library": "framer-motion",
  "recommended_library_reason": "React/Next.js環境で最も統合しやすく、スクロールアニメーション・ページ遷移・ホバーエフェクトを統一的に扱える",
  "complexity_level": "medium",
  "total_animation_count": 12
}
```

## エラーハンドリング・エッジケース

| 状況 | 対処 |
|------|------|
| **Intersection Observer のコールバックが minify で解読不能** | `data-aos` 属性や CSS クラス名パターン（`is-visible`, `in-view` 等）からアニメーション種類を推定 |
| **GSAP の ScrollTrigger が複雑すぎる** | タイムラインの各ステップを個別に記録し、Builder に framer-motion で簡略化再現を指示 |
| **Web Animations API 使用サイト** | `element.animate()` 呼び出しを検出し、keyframes + options を CSS animation 相当に変換して記録 |
| **3D Transform / WebGL が多用** | `complexity_level: "advanced"` を記録。Three.js / R3F が必要な場合は Builder に追加依存を指示 |
| **アニメーションが JS で動的生成** | 静的解析では検出不能な場合は `dynamic_animations: true` を記録し、参考サイトの動作観察メモを詳細に記述 |
| **アニメーションなしサイト** | `total_animation_count: 0` を記録。Builder に最低限のホバーエフェクトとスクロールフェードを推奨 |

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し

## モーション語彙のマッピング（必須参照）

解析で検出したモーションは、**必ず `/design-md/motion-library/MOTION_30.md` の `motion_key`** にマッピングして出力する。Builder が同じ語彙でモーションを再現できるようにするため。

**マッピング手順:**
1. 検出したモーションの演出・発火条件・使用ライブラリを整理
2. MOTION_30.md の 30件から最も近い `motion_key` を選択
3. 複数候補がある場合は演出の忠実度が高い方を優先
4. 該当する `motion_key` が無い場合は `motion_key: "custom"` としたうえで、MOTION_30.md への追加候補として `proposed_motion` フィールドに詳細を記録

**output.json への追記フィールド:**
```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1",
      "motion_key": "masking-reveal",
      "trigger": "on-load",
      "duration": "0.7s",
      "easing": "cubic-bezier(0.33, 1, 0.68, 1)",
      "stagger": "0.08s",
      "implementation": "framer-motion + overflow-hidden wrapper"
    }
  ],
  "proposed_motion": []
}
```

**よくあるマッピング例:**
- 画面一面が円形に展開する → `circle-reveal`
- 斜めパネルで画面遷移 → `slanted-slide`
- 文字が下からマスクで現れる → `masking-reveal`
- 数字がドラムロール → `slot-counter`
- カードが3D傾斜 → `card-tilt`
- 常時ノイズ背景 → `overlay-texture`
