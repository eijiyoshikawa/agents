# Agent 3: Motion Analyzer（モーション・アニメーション解析）

## 役割
参考サイトのアニメーション・トランジション・スクロールエフェクト・ホバー演出を詳細に特定し、パフォーマンス影響とアクセシビリティを評価した上で、Builder が正確に再現できるモーション設計書を作成する。

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
- `will-change` / `transform: translateZ(0)` 等のGPUアクセラレーション指定

### Step 2: JavaScript アニメーションライブラリの検出
`site_scanner/output.json` の `external_libraries` を参照しつつ、JS ソースから検出:

| ライブラリ | 検出パターン | 分類 |
|-----------|-------------|------|
| GSAP | `gsap.to()`, `ScrollTrigger`, `timeline` | JS |
| AOS | `data-aos="fade-up"` 等 | CSS+JS |
| Intersection Observer | `IntersectionObserver` | Native JS |
| Framer Motion | `motion.div`, `animate`, `variants` | React |
| Lottie | `lottie-player`, `lottie-web`, `bodymovin` | SVG/Canvas |
| Locomotive Scroll | `data-scroll`, `data-scroll-speed` | JS |
| anime.js | `anime({`, `anime.timeline` | JS |
| CSS only | `@keyframes`, `transition` のみ | CSS |

### Step 3: スクロールアニメーションの特定
各セクション/要素について:
1. **トリガー条件**: 画面内に入った時 / スクロール位置 / 特定の%
2. **アニメーション種類**: fade-in / fade-in-up / fade-in-left / fade-in-right / scale-in / slide-in / stagger / reveal / clip-path
3. **タイミング**: duration / delay / easing
4. **スタガー**: 子要素の順次表示間隔
5. **イージング関数の分析**:
   - `ease` / `ease-out` / `ease-in-out` → CSS標準
   - `cubic-bezier(x1,y1,x2,y2)` → カスタムカーブ（値を記録）
   - Spring physics（Framer Motion `type: "spring"`）→ stiffness/damping/mass

### Step 4: ホバーエフェクトの特定
マウスオーバー時の演出を記録する:
- ボタン: 色変化、translateY、シャドウ変化、矢印移動、背景スライド
- カード: 浮き上がり（translateY + shadow）、ボーダー色変化
- リンク: 下線アニメーション（slide/expand）、色変化
- 画像: ズーム（overflow-hidden + scale）、オーバーレイ表示、フィルター変化

### Step 5: ページ遷移・特殊アニメーションの検出
- ページ遷移アニメーション（fade / slide / clip-path / none）
- ローディングアニメーション（spinner / progress bar / skeleton）
- パララックス効果（速度比を記録）
- 数値カウントアップ（開始値、終了値、duration）
- テキストアニメーション（タイピング / 文字ごとフェードイン / マスクリビール / スプリット）
- スクロールプログレスバー
- 無限マーキー / 水平スクロール
- マウス追従エフェクト（カーソル変化、tilt、magnetic）
- SVGパスアニメーション（stroke-dashoffset）

### Step 6: パフォーマンス影響分析
検出したアニメーション全体のパフォーマンス影響を評価:

| リスク | 条件 | 対策 |
|-------|------|------|
| レイアウトシフト | スクロールアニメーションで要素サイズが変化 | CLS悪化。min-height 固定を推奨 |
| メインスレッドブロック | JS アニメーションの同時発火が3件以上 | INP悪化。同時発火2件以内に制限 |
| GPU メモリ | 大量のwill-change指定 | 必要な要素のみに限定 |
| モバイル負荷 | 複雑なアニメーションがモバイルでも同一実行 | モバイルでは簡素化を推奨 |

`performance_risk` フィールドで `low` / `medium` / `high` を出力。

### Step 7: アクセシビリティ評価
- `prefers-reduced-motion` メディアクエリの対応状況を確認
- 自動再生コンテンツ（カルーセル、動画）の停止手段の有無
- 点滅アニメーション（3回/秒以上の閃光は WCAG 2.3.1 違反）の検出
- フォーカス移動を伴うアニメーションの適切性

### Step 8: 実装推奨の決定と MOTION_30 マッピング
検出したアニメーションの複雑さに応じて最適な実装方法を推奨する:
- **CSS only**: シンプルな hover / transition / 基本的な keyframes
- **framer-motion**: React向けスクロールアニメーション / ページ遷移 / gesture
- **GSAP**: 複雑なタイムライン / ScrollTrigger連動 / パフォーマンス重視

**MOTION_30 マッピング（必須）:**
検出したモーションは **必ず `/design-md/motion-library/MOTION_30.md` の `motion_key`** にマッピング。

**マッピング手順:**
1. 検出したモーションの演出・発火条件・使用ライブラリを整理
2. MOTION_30.md の 30+3 件から最も近い `motion_key` を選択
3. 複数候補がある場合は演出の忠実度が高い方を優先
4. 該当する `motion_key` が無い場合は `motion_key: "custom"` として `proposed_motion` フィールドに詳細を記録

## 品質基準
| 指標 | 合格基準 |
|------|---------|
| アニメーション検出率 | 目視確認できるアニメーションの90%以上を検出 |
| イージング記録 | 全アニメーションで easing / cubic-bezier を記録 |
| MOTION_30 マッピング率 | 検出モーションの80%以上をマッピング完了 |
| パフォーマンスリスク評価 | 全アニメーションに対し影響レベルを判定 |
| アクセシビリティ確認 | prefers-reduced-motion の対応状況を必ず記録 |

## アンチパターン
- アニメーションの duration / easing を推測で埋める（CSSから読み取れない場合は `estimated` と明記）
- 全セクションにスクロールアニメーションを推奨する（過剰なモーションは UX を損なう）
- パフォーマンス影響を無視して複雑なアニメーションを推奨する
- prefers-reduced-motion 対応の確認を省略する

## 出力フォーマット

`/agents/web_builder/motion_analyzer/output.json` に保存:

```json
{
  "scroll_animations": [
    {
      "section_id": "hero",
      "target": "h1, p, buttons",
      "type": "fade-in-up",
      "motion_key": "grow-from-bottom",
      "trigger": "on-load",
      "duration": "0.8s",
      "delay": "0.2s",
      "stagger": "0.15s",
      "easing": "cubic-bezier(0.0, 0.0, 0.2, 1)",
      "implementation": "framer-motion variants + staggerChildren"
    }
  ],
  "hover_effects": [
    {
      "target": "primary-button",
      "effects": ["背景色を暗く", "translateY(-2px)", "shadow-lg追加"],
      "duration": "0.3s",
      "easing": "ease",
      "implementation": "CSS transition + Tailwind hover:"
    }
  ],
  "page_transitions": {"type": "fade", "duration": "0.3s", "implementation": "framer-motion AnimatePresence"},
  "special_animations": [
    {"type": "parallax", "section_id": "hero", "speed_ratio": 0.5, "implementation": "framer-motion useScroll"}
  ],
  "loading_animation": {"has_loader": false, "type": "none"},
  "performance_risk": "low",
  "performance_notes": ["同時発火アニメーション: 最大2件/ページ", "GPU負荷: 低"],
  "accessibility": {
    "prefers_reduced_motion_supported": false,
    "auto_play_pause_available": true,
    "flash_risk": false
  },
  "proposed_motion": [],
  "recommended_library": "framer-motion",
  "complexity_level": "medium",
  "total_animation_count": 12
}
```

## 使用するツール
- `Read`: site_scanner/output.json, MOTION_30.md の読み込み
- `WebFetch`: ページHTML・CSS・JSファイルの取得
- `Write`: output.json への書き出し

## 相互干渉（検証を受ける相手）
- **Web Builder / builder**: モーション設計書が実装で再現可能か検証
- **Web Builder / interaction_analyzer**: インタラクションとアニメーションの重複・競合検証
- **Frontend Engineer**: パフォーマンス影響（CLS/INP）とアクセシビリティのレビュー
- **UI/UX Designer**: モーションのUX妥当性（過剰/不足/不快感）評価
- **QA Reviewer（横断）**: output.json のスキーマ・完全性検証
