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

### Step 5.5: パフォーマンス影響評価

検出した各モーションが Core Web Vitals に与える影響を推定し、Builder が安全に実装できる情報を提供する。

#### CLS（Cumulative Layout Shift）への影響
以下のパターンはレイアウトシフトを引き起こすリスクがある:

| リスクパターン | CLS影響 | 対策 |
|-------------|---------|------|
| スクロールアニメーションで `height: 0 → auto` | **高** | `max-height` + `overflow-hidden` で代用、または `will-change: height` |
| `transform: translateY()` からの登場 | **低** | transform は compositor 上で動作するため CLS に影響しない |
| `width` / `margin` / `padding` のアニメーション | **中** | transform に置き換え推奨 |
| フォント読み込み後のリフロー | **中** | `font-display: swap` + `size-adjust` |
| 画像遅延読み込みでの領域確保なし | **高** | `aspect-ratio` or 固定 `width`/`height` 必須 |

#### INP（Interaction to Next Paint）への影響
インタラクションのレスポンス速度を阻害するパターンを評価する:

| リスクパターン | INP影響 | 対策 |
|-------------|---------|------|
| 重い JS ライブラリの同期読み込み（GSAP全量等） | **高** | 動的 import + `requestIdleCallback` |
| メインスレッドをブロックするアニメーション計算 | **中** | CSS アニメーション or `will-change` で GPU 委譲 |
| 大量のDOM操作を伴うスタガーアニメーション | **中** | 可視範囲のみアニメーション（`IntersectionObserver`） |
| `requestAnimationFrame` の過剰使用 | **低** | フレーム数制限、スロットリング |

#### 各モーションへのリスクスコア付与
検出した各モーションに `performance_risk` フィールドを追加する:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "motion_key": "masking-reveal",
      "performance_risk": {
        "cls_impact": "none",
        "inp_impact": "low",
        "gpu_composited": true,
        "recommendation": "transform + opacity のみ使用しており安全"
      }
    }
  ]
}
```

### Step 5.7: prefers-reduced-motion 対応の確認

#### 参考サイトの対応状況を確認
CSS から `@media (prefers-reduced-motion: reduce)` の有無を検出する:

- **対応あり**: 定義内容（どのアニメーションが抑制されるか）を記録
- **対応なし**: Builder に対応を必須として指示

#### 推奨対応方針
```json
{
  "reduced_motion": {
    "reference_site_support": false,
    "builder_requirement": "必須",
    "policy": {
      "scroll_animations": "完全無効化（即座に表示）",
      "hover_effects": "維持（色変化のみ。transform は無効化）",
      "page_transitions": "無効化（即座に切り替え）",
      "decorative_animations": "完全無効化",
      "essential_animations": "維持（ローディングスピナー等、情報伝達に必要なもの）"
    }
  }
}
```

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
      "motion_key": "masking-reveal",
      "trigger": "on-load",
      "duration": "0.8s",
      "delay": "0.2s",
      "stagger": "0.15s",
      "easing": "ease-out",
      "implementation": "framer-motion variants + staggerChildren",
      "performance_risk": {
        "cls_impact": "none",
        "inp_impact": "low",
        "gpu_composited": true,
        "recommendation": "安全"
      }
    },
    {
      "section_id": "features",
      "target": "各カード",
      "type": "fade-in-up",
      "motion_key": "inbound-slide",
      "trigger": "scroll-into-view",
      "duration": "0.6s",
      "delay": "0",
      "stagger": "0.1s",
      "easing": "ease-out",
      "implementation": "framer-motion useInView + stagger",
      "performance_risk": {
        "cls_impact": "none",
        "inp_impact": "low",
        "gpu_composited": true,
        "recommendation": "安全"
      }
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
  "reduced_motion": {
    "reference_site_support": false,
    "builder_requirement": "必須",
    "policy": {
      "scroll_animations": "完全無効化",
      "hover_effects": "色変化のみ維持",
      "page_transitions": "無効化",
      "decorative_animations": "完全無効化",
      "essential_animations": "維持"
    }
  },
  "recommended_library": "framer-motion",
  "recommended_library_reason": "React/Next.js環境で最も統合しやすく、スクロールアニメーション・ページ遷移・ホバーエフェクトを統一的に扱える",
  "complexity_level": "medium",
  "total_animation_count": 12,
  "proposed_motion": []
}
```

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

**MOTION_30.md との照合チェックリスト:**
- [ ] 検出した全モーションに `motion_key` が割り当てられているか
- [ ] `motion_key` の選択根拠（演出の一致度）が明記されているか
- [ ] MOTION_30.md に存在しないモーションは `proposed_motion` に記録されているか
- [ ] 和文B2B案件では §6 の3モーション（`marquee-keywords` / `thinking-caret` / `scroll-progress-bar`）の適用可否を検討したか

**output.json への追記フィールド:**
```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1",
      "motion_key": "masking-reveal",
      "motion_key_confidence": 0.9,
      "motion_key_rationale": "テキストが下からマスクで現れる演出が masking-reveal と完全一致",
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


## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: モーション設計書の実装再現性を検証
- **Web Builder / interaction_analyzer**: インタラクションとアニメーションの相互検証
- **Web Builder / qa_reviewer**: デプロイ後のモーション動作確認
- **QA Engineer**: パフォーマンス影響の技術レビュー
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
