# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を
詳細に特定し、Builder が正確に再現できるモーション設計書を作成する。

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

### Step 6: 実装推奨の決定
検出したアニメーションの複雑さに応じて、最適な実装方法を推奨する:

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

## 使用するツール
- `Read`: site_scanner/output.json の読み込み
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し
