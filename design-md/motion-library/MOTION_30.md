# WEBコンテンツ・モーション 30選

> **目的**: Web制作・システム開発時のモーション演出リファレンス。デザイン段階から実装段階まで、一貫した語彙で演出を指定・再現できるようにする。
>
> **適用範囲**: LP / コーポレートサイト / サービスサイト / ダッシュボード / 採用ページ など全Web成果物
>
> **参照エージェント**: Designer / UI/UX Designer / Engineer / Frontend Engineer / Web Builder（motion_analyzer / builder）
>
> **運用原則**:
> - モーションを追加・変更する際は、まず本ドキュメントから該当する motion_key を選ぶ
> - 該当するものがなければ本ドキュメントに新規追加してから実装（勝手に実装しない）
> - すべてのモーションは `prefers-reduced-motion: reduce` に対応し、ユーザー設定を尊重する
> - ページ内に同時発火する重いモーションは 2 つまで（パフォーマンス確保）

## 使い方

### デザイン段階（Designer / UI/UX Designer）
デザイン指示書に `motion_key: circle-reveal` のように記載する。

### 実装段階（Engineer / Frontend Engineer / Web Builder builder）
`motion_key` を元に本ドキュメントの「推奨実装」「サンプル」セクションを参照する。

### 解析段階（Web Builder motion_analyzer）
参考サイトで検出したモーションを、最も近い `motion_key` にマッピングして出力する。

## カテゴリ索引

1. [ナビゲーション・遷移系](#1-ナビゲーション遷移系)（6）
2. [テキスト・タイポグラフィ系](#2-テキストタイポグラフィ系)（6）
3. [インタラクション系](#3-インタラクションホバークリック系)（6）
4. [スクロール・背景系](#4-スクロール背景系)（6）
5. [ベンチャー・先進性特化系](#5-ベンチャー先進性特化系)（6）
6. [和文B2B / コーポレート系（feer 追加）](#6-和文b2b--コーポレート系feer-追加)（3）

## 案件タイプ別 デフォルト基準

| 案件タイプ | デフォルト参照 |
|-----------|--------------|
| 和文 コーポレート / 採用 / サービスサイト（B2B） | **`/design-md/feer/DESIGN.md`** をデフォルト採用 |
| 海外SaaS / ダッシュボード | `linear.app` / `framer` / `notion` 等を選択 |
| LP / キャンペーン（B2C） | feer を雛形にトーン調整、または `airbnb` / `figma` を参照 |

和文B2B 案件では feer のモーショントークン（`duration` 300ms / `easing` `cubic-bezier(.4,0,.2,1)` / 主要登場演出 `grow-from-bottom`）を Tailwind config の既定にする。詳細は `design-md/feer/DESIGN.md` §6 参照。

## アクセシビリティ共通ルール

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

すべてのモーション実装は上記グローバル CSS を前提とする。加えて、モーションに依存して情報を伝える演出（例: タイピング・エフェクト）は、reduced-motion 環境では **即時表示** にフォールバックする。

---

## 1. ナビゲーション・遷移系

### 1.1 サークル・リビール (`circle-reveal`)

- **演出**: 円形がボタンから画面全体へ広がる
- **活用例**: ハンバーガーメニュー、モーダル起動
- **言語化**: ボタンを起点に円形が拡大し、画面を塗りつぶす
- **推奨実装**: CSS `clip-path: circle()` + transition、または framer-motion の `animate={{ clipPath }}`
- **パラメータ目安**: duration 0.6s / easing `cubic-bezier(0.77, 0, 0.175, 1)` / 起点座標 = クリック位置

```tsx
// framer-motion
<motion.div
  initial={{ clipPath: "circle(0% at var(--x) var(--y))" }}
  animate={{ clipPath: "circle(150% at var(--x) var(--y))" }}
  transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
/>
```

- **アクセシビリティ**: reduced-motion では即時フェードに差し替え。キーボード操作時は起点を画面中央に固定

### 1.2 スランテッド・スライド (`slanted-slide`)

- **演出**: 斜めの面が高速で画面を横切る
- **活用例**: ページ遷移、メインビジュアルの登場
- **言語化**: 鋭い角度の面がハイスピードでスライドし画面を切り替える
- **推奨実装**: 全画面オーバーレイ div を `transform: skewX(-12deg) translateX()` で滑走
- **パラメータ目安**: duration 0.5s / skew -12deg / easing `cubic-bezier(0.86, 0, 0.07, 1)`

```tsx
<motion.div
  className="fixed inset-0 origin-right bg-black"
  style={{ transform: "skewX(-12deg)" }}
  initial={{ x: "-110%" }}
  animate={{ x: "110%" }}
  transition={{ duration: 0.5, ease: [0.86, 0, 0.07, 1] }}
/>
```

- **アクセシビリティ**: reduced-motion 時は skew を 0 にしフェードに置換

### 1.3 ドロステ・ズーム (`droste-zoom`)

- **演出**: 画面中央へ吸い込まれるように進む
- **活用例**: ギャラリー → 詳細ページ遷移、ブランドイントロ
- **言語化**: 視点を中央に固定し、奥行きを突き抜けるような没入感
- **推奨実装**: framer-motion `layoutId` + `scale` / GSAP timeline
- **パラメータ目安**: scale 1 → 8 / duration 0.8s / easing `power3.inOut`

```tsx
<motion.img layoutId={`card-${id}`} src={src} />
// 詳細ページで同じ layoutId を持つ要素へ共有遷移
```

- **アクセシビリティ**: reduced-motion では `layoutId` 共有のみでスケール無効化

### 1.4 スプリット・カーテン (`split-curtain`)

- **演出**: 画面が中央から上下または左右に割れる
- **活用例**: サイトのオープニング、章の区切り
- **言語化**: 幕が開くように、中央から外側へパネルが分割移動する
- **推奨実装**: 2枚のオーバーレイ div を `translateY(-100%)` / `translateY(100%)` へ
- **パラメータ目安**: duration 0.9s / easing `cubic-bezier(0.83, 0, 0.17, 1)` / ディレイなし

```tsx
<>
  <motion.div className="fixed inset-x-0 top-0 h-1/2 bg-neutral-900"
    initial={{ y: 0 }} animate={{ y: "-100%" }} transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }} />
  <motion.div className="fixed inset-x-0 bottom-0 h-1/2 bg-neutral-900"
    initial={{ y: 0 }} animate={{ y: "100%" }} transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }} />
</>
```

- **アクセシビリティ**: reduced-motion では一瞬のフェードアウトに置換

### 1.5 ドロワー・プッシュ (`drawer-push`)

- **演出**: メニューが出る際、本体コンテンツを押し出す
- **活用例**: スマホ用グローバルメニュー、設定パネル
- **言語化**: メニューが重なるのではなく、既存画面を横にスライドさせる
- **推奨実装**: ルートラッパーに `transform: translateX(-80vw)` を適用、ドロワーは `right: -80vw`
- **パラメータ目安**: duration 0.35s / easing `ease-out` / ドロワー幅 80vw（PC時 360px）

```tsx
<motion.main animate={{ x: isOpen ? -320 : 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
  {children}
</motion.main>
<motion.aside animate={{ x: isOpen ? 0 : 320 }} transition={{ duration: 0.35, ease: "easeOut" }} />
```

- **アクセシビリティ**: ドロワー開閉時に `aria-expanded` を同期、reduced-motion では transform なしで display 切替

### 1.6 スタック・カード (`stack-card`)

- **演出**: ページがトランプのように重なったカード状に捲れる
- **活用例**: ストーリー仕立てのサービス紹介、ケーススタディ
- **言語化**: 下の階層が上に重なっていく、奥行きのあるレイヤー遷移
- **推奨実装**: 各セクションを `position: sticky; top: 0` で積層、`transform: scale(0.95) translateY(-20px)` を段階適用
- **パラメータ目安**: duration scroll連動 / easing `linear` / カード間 scale 差 0.04

```tsx
// Frameworkless (CSS only)
// section { position: sticky; top: 0; height: 100vh; }
// section:nth-child(n) { transform: scale(calc(1 - 0.04 * var(--depth))); }
```

- **アクセシビリティ**: reduced-motion では sticky を解除し通常の縦並びに変更

## 2. テキスト・タイポグラフィ系

### 2.1 タイピング・エフェクト (`typing-effect`)

- **演出**: 1文字ずつコードのように打たれる
- **活用例**: メインコピー、AIチャット風UI、ターミナル風ヒーロー
- **言語化**: カーソル点滅を伴い、入力中のようなリズムで表示
- **推奨実装**: `typewriter-effect` ライブラリ or 自作 `setInterval` / framer-motion + `useEffect`
- **パラメータ目安**: 1文字 40-80ms / カーソル点滅 1Hz

```tsx
// 自作
const [shown, setShown] = useState("");
useEffect(() => {
  let i = 0;
  const t = setInterval(() => setShown(text.slice(0, ++i)), 60);
  return () => clearInterval(t);
}, [text]);
return <span>{shown}<span className="animate-pulse">|</span></span>;
```

- **アクセシビリティ**: スクリーンリーダー用に完成形を `aria-label` に持たせ、reduced-motion では即時全文表示

### 2.2 マスキング・リビール (`masking-reveal`)

- **演出**: 見えない枠の中から文字が浮き出る
- **活用例**: 各セクションの見出し、章タイトル
- **言語化**: テキストを一行ずつ、下から上へスライドして露出させる
- **推奨実装**: 親要素 `overflow: hidden`、子要素 `translateY(100%)` → `translateY(0)`
- **パラメータ目安**: duration 0.7s / easing `cubic-bezier(0.33, 1, 0.68, 1)` / stagger 0.08s

```tsx
<span className="inline-block overflow-hidden">
  <motion.span
    className="inline-block"
    initial={{ y: "100%" }}
    whileInView={{ y: 0 }}
    transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
  >
    {text}
  </motion.span>
</span>
```

- **アクセシビリティ**: reduced-motion ではマスクなしで即時表示

### 2.3 キネティック・フロー (`kinetic-flow`)

- **演出**: 巨大な文字がスクロールで横流れる
- **活用例**: 背景の装飾テキスト、セクションの区切り
- **言語化**: スクロール量に同期して、文字を高速で水平移動させる
- **推奨実装**: GSAP ScrollTrigger + `xPercent`、または framer-motion `useScroll` + `useTransform`
- **パラメータ目安**: スクロール 100vh で -50% 移動 / フォントサイズ 12-20vw

```tsx
const { scrollYProgress } = useScroll();
const x = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
return <motion.div style={{ x }} className="whitespace-nowrap text-[20vw]">{marqueeText}</motion.div>;
```

- **アクセシビリティ**: 文字情報として重要でない装飾用途に限定。reduced-motion では静止

### 2.4 文字バラバラ・フェード (`letter-scatter-fade`)

- **演出**: 1文字単位でランダムに表示される
- **活用例**: 印象的なキャッチコピー、ヒーローの見出し
- **言語化**: 文字ごとにディレイをかけ、バラバラと浮かび上がらせる
- **推奨実装**: 文字を `<span>` 分割し、各 span に `opacity` + `y` のアニメーションをランダム delay で適用
- **パラメータ目安**: duration 0.6s / delay 0〜0.4s ランダム / y 20px → 0

```tsx
{text.split("").map((ch, i) => (
  <motion.span
    key={i}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: Math.random() * 0.4 }}
  >
    {ch}
  </motion.span>
))}
```

- **アクセシビリティ**: 元テキストを `aria-label` に保持。reduced-motion では全文即時表示

### 2.5 テキスト・スクランブル (`text-scramble`)

- **演出**: 文字がランダムに変化して正解になる
- **活用例**: 近未来的なタイトル、プロダクト名のイントロ
- **言語化**: デジタルノイズのように文字が入れ替わり、最後に静止する
- **推奨実装**: `requestAnimationFrame` で一定フレームごとに文字をランダム置換しつつ、固定位置から確定させる
- **パラメータ目安**: 全体 duration 1.2s / 1文字確定タイミング 0〜1秒

```ts
function scramble(target: string, onUpdate: (s: string) => void) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let frame = 0;
  const duration = 72; // frames
  const id = setInterval(() => {
    frame++;
    onUpdate(target.split("").map((c, i) =>
      frame / duration > i / target.length ? c : chars[Math.floor(Math.random() * chars.length)]
    ).join(""));
    if (frame >= duration) clearInterval(id);
  }, 1000 / 60);
}
```

- **アクセシビリティ**: `aria-label` に最終文字列。reduced-motion では即時確定

### 2.6 ストローク・ドローイング (`stroke-drawing`)

- **演出**: 文字の外形線が描かれてから塗り潰される
- **活用例**: ロゴアニメーション、ブランドイントロ
- **言語化**: SVG のパスをなぞるように線を描画し、最後に色を満たす
- **推奨実装**: SVG `stroke-dasharray` + `stroke-dashoffset` で線を描画、完了後 `fill-opacity` をアニメート
- **パラメータ目安**: 線描画 1.5s / 塗り 0.6s / easing `ease-in-out`

```tsx
<motion.path
  d={pathData}
  fill="transparent"
  stroke="currentColor"
  strokeWidth={2}
  initial={{ pathLength: 0, fillOpacity: 0 }}
  animate={{ pathLength: 1, fillOpacity: 1 }}
  transition={{ pathLength: { duration: 1.5 }, fillOpacity: { delay: 1.5, duration: 0.6 } }}
/>
```

- **アクセシビリティ**: SVG に `<title>` / `aria-label` を付与。reduced-motion では最終形を即時表示

## 3. インタラクション（ホバー・クリック）系

### 3.1 マグネティック・マウス (`magnetic-mouse`)

- **演出**: ボタンがカーソルに吸い寄せられる
- **活用例**: 重要な CTA ボタン、プライマリナビゲーション
- **言語化**: 磁石のように、カーソルの近接に合わせて要素を微動させる
- **推奨実装**: `mousemove` で要素中心との距離を測り、`translate` を係数付きで適用
- **パラメータ目安**: 反応範囲 100px / 最大変位 12px / easing `ease-out` 0.2s

```tsx
function Magnetic({ children }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <motion.button
      ref={ref}
      onMouseMove={e => {
        const r = ref.current!.getBoundingClientRect();
        setPos({ x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.3 });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={pos}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
    >{children}</motion.button>
  );
}
```

- **アクセシビリティ**: キーボードフォーカス時は発火しない。reduced-motion では完全無効化

### 3.2 グリッチ・ホバー (`glitch-hover`)

- **演出**: 一瞬だけ画像や文字がブレる
- **活用例**: ロゴ、エンジニア採用枠のヒーロー
- **言語化**: デジタルなノイズと色収差を一瞬だけ発生させる
- **推奨実装**: CSS `::before` `::after` で RGB 色収差の複製を配置、keyframes で瞬間的に translate
- **パラメータ目安**: duration 0.4s / ズレ量 2-4px / 色 R / G / B 分解

```css
.glitch:hover::before { transform: translate(-2px, 0); color: #f0f; mix-blend-mode: screen; }
.glitch:hover::after  { transform: translate(2px, 0);  color: #0ff; mix-blend-mode: screen; }
```

- **アクセシビリティ**: 光感受性への配慮として連続発火を抑制。reduced-motion では無効化

### 3.3 リキッド・ホバー (`liquid-hover`)

- **演出**: 触れた場所が水面のように揺らぐ
- **活用例**: チームメンバーの写真、作品ギャラリー
- **言語化**: マウスの位置に応じて、画像に液体のような歪みを加える
- **推奨実装**: WebGL シェーダ（Three.js / OGL）で画像に波紋ディスプレイスメントマップ
- **パラメータ目安**: 波紋半径 180px / 強度 0.05 / 減衰 0.95

```ts
// 概略: fragment shader にて mouse.xy と uv の距離からディスプレイスメントを計算
uniform vec2 uMouse;
uniform float uStrength;
vec2 disp = (uv - uMouse) * uStrength * exp(-distance(uv, uMouse) * 5.0);
gl_FragColor = texture2D(uTexture, uv + disp);
```

- **アクセシビリティ**: タッチデバイスでは静止画像にフォールバック。reduced-motion で無効化

### 3.4 バースト・エフェクト (`burst-effect`)

- **演出**: クリックした場所から粒子が弾ける
- **活用例**: 「応募する」「送信する」ボタン、いいねボタン
- **言語化**: 押下した座標から、小さな図形を放射状に散らす
- **推奨実装**: Canvas 2D で粒子生成、または `mo.js` / `tsParticles` 利用
- **パラメータ目安**: 粒子数 12-20 / 初速 100-200px/s / lifetime 0.5s

```tsx
function burst(x: number, y: number) {
  const particles = Array.from({ length: 16 }, (_, i) => {
    const el = document.createElement("span");
    el.className = "fixed pointer-events-none w-1 h-1 rounded-full bg-primary";
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    document.body.appendChild(el);
    el.animate([
      { transform: "translate(0,0)", opacity: 1 },
      { transform: `translate(${Math.cos(i) * 80}px, ${Math.sin(i) * 80}px)`, opacity: 0 }
    ], { duration: 500, easing: "ease-out" }).onfinish = () => el.remove();
  });
}
```

- **アクセシビリティ**: 装飾用途のみ（成功状態の唯一の通知手段にしない）。reduced-motion で無効化

### 3.5 アンダーライン・ドロー (`underline-draw`)

- **演出**: 下線が左から右へスッと引かれる
- **活用例**: テキストリンク、ナビゲーションメニュー
- **言語化**: ホバー時に中心または左から、線が伸びるように表示する
- **推奨実装**: `::after` を `width: 0` → `100%` にトランジション、または `scaleX(0)` → `scaleX(1)` + `transform-origin: left`
- **パラメータ目安**: duration 0.3s / easing `ease-out`

```css
.link { position: relative; }
.link::after {
  content: ""; position: absolute; left: 0; bottom: -2px;
  width: 100%; height: 1px; background: currentColor;
  transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease-out;
}
.link:hover::after { transform: scaleX(1); }
```

- **アクセシビリティ**: reduced-motion では即時表示。線だけでなく `text-decoration` のフォールバックも残す

### 3.6 フローティング・フロート (`floating-float`)

- **演出**: 浮いているように常に微振動する
- **活用例**: 浮遊アイコン、サービスロゴ、3Dオブジェクト
- **言語化**: 上下に数ピクセル、ゆったりとしたイージングでループさせる
- **推奨実装**: CSS `@keyframes` でループ、または framer-motion `animate={{ y: [0, -6, 0] }}` + `repeat: Infinity`
- **パラメータ目安**: 振幅 4-8px / 周期 3-4s / easing `ease-in-out`

```css
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.float { animation: float 3.5s ease-in-out infinite; }
```

- **アクセシビリティ**: reduced-motion で `animation: none` に上書き。ページ内に複数使う場合は位相をずらす

## 4. スクロール・背景系

### 4.1 パララックス・デプス (`parallax-depth`)

- **演出**: 背景と前景の速度を変えて動かす
- **活用例**: メインビジュアル、ストーリーテリング型LP
- **言語化**: 視差効果を利用して、画面に立体感と奥行きを与える
- **推奨実装**: framer-motion `useScroll` + `useTransform` でレイヤーごとに y 変換、またはGSAP ScrollTrigger
- **パラメータ目安**: 背景 speed 0.3 / 中景 0.6 / 前景 1.0

```tsx
const { scrollY } = useScroll();
const bgY = useTransform(scrollY, v => v * 0.3);
const fgY = useTransform(scrollY, v => v * 0.8);
return (<>
  <motion.img style={{ y: bgY }} className="absolute inset-0" src="/bg.webp" />
  <motion.img style={{ y: fgY }} className="absolute inset-0" src="/fg.webp" />
</>);
```

- **アクセシビリティ**: モバイルでは無効化または強度を下げる。reduced-motion で完全無効化

### 4.2 パーティクル・コネクト (`particle-connect`)

- **演出**: 点と点が線で結ばれながら動く
- **活用例**: AI / IT / テック系のヒーロー背景
- **言語化**: 粒子が浮遊し、距離が近いもの同士をラインで繋ぐ
- **推奨実装**: `tsParticles` (`@tsparticles/react`) or Canvas 2D 自作
- **パラメータ目安**: 粒子数 60-100 / リンク距離 150px / 移動速度 0.5-1

```tsx
import Particles from "@tsparticles/react";
<Particles options={{
  particles: {
    number: { value: 80 },
    links: { enable: true, distance: 150, opacity: 0.3 },
    move: { enable: true, speed: 0.8 },
  },
}} />
```

- **アクセシビリティ**: 装飾のみの用途。reduced-motion では静止画像にフォールバック

### 4.3 プログレッシブ・シャープ (`progressive-sharp`)

- **演出**: ぼかし状態からピントが合う
- **活用例**: 実績紹介の画像、フォト主体のセクション
- **言語化**: 強いブラーから、徐々に鮮明な画像へ変化させる
- **推奨実装**: `filter: blur(20px)` → `blur(0)` を Intersection Observer で発火
- **パラメータ目安**: duration 1.0s / easing `ease-out` / blur 20px → 0

```tsx
<motion.img
  initial={{ filter: "blur(20px)", opacity: 0 }}
  whileInView={{ filter: "blur(0px)", opacity: 1 }}
  viewport={{ once: true, margin: "-10%" }}
  transition={{ duration: 1 }}
/>
```

- **アクセシビリティ**: reduced-motion では blur なしで即時表示

### 4.4 セクション・スナップ (`section-snap`)

- **演出**: スクロールすると次の階層へ吸着
- **活用例**: 縦長 LP、1枚完結サイト、ストーリー型サイト
- **言語化**: 中途半端な位置で止めず、セクションの頭に自動で合わせる
- **推奨実装**: CSS `scroll-snap-type: y mandatory` + 各セクションに `scroll-snap-align: start`
- **パラメータ目安**: `scroll-snap-type: y mandatory`（強制）または `y proximity`（近接時のみ）

```css
html { scroll-snap-type: y proximity; scroll-behavior: smooth; }
section { scroll-snap-align: start; min-height: 100vh; }
```

- **アクセシビリティ**: キーボードスクロールを阻害しないよう `proximity` を推奨。reduced-motion では `scroll-behavior: auto`

### 4.5 パス・アニメーション (`path-animation`)

- **演出**: 線に沿ってスクロールが進む
- **活用例**: 沿革、サービスの流れ、プロセスフロー
- **言語化**: 1本の繋がった線が、スクロールに合わせて伸びていく
- **推奨実装**: SVG `<path>` + `stroke-dasharray` / `stroke-dashoffset` を scroll progress で変化
- **パラメータ目安**: `pathLength` 0 → 1 をスクロール量に完全同期

```tsx
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
<svg ref={ref}>
  <motion.path d="M ..." stroke="black" strokeWidth={2} fill="none"
    style={{ pathLength: scrollYProgress }} />
</svg>
```

- **アクセシビリティ**: 情報伝達手段として線のみに依存せず、各ノードにテキストラベルを併記

### 4.6 インバウンド・スライド (`inbound-slide`)

- **演出**: 左右交互に要素が飛び込んでくる
- **活用例**: 特徴紹介セクション、機能一覧
- **言語化**: 画面外からバネのような動き（Back Out）で要素を挿入する
- **推奨実装**: Intersection Observer + CSS transition、または framer-motion `whileInView`
- **パラメータ目安**: 変位 80px / duration 0.8s / easing `back.out(1.7)` (GSAP) or `[0.34, 1.56, 0.64, 1]`

```tsx
<motion.div
  initial={{ x: fromLeft ? -80 : 80, opacity: 0 }}
  whileInView={{ x: 0, opacity: 1 }}
  viewport={{ once: true, margin: "-10%" }}
  transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
/>
```

- **アクセシビリティ**: reduced-motion ではフェードインのみ。横スクロールを発生させない（overflow-x: hidden を親に）

## 5. ベンチャー・先進性特化系

### 5.1 スロット・カウンター (`slot-counter`)

- **演出**: 数字が回転しながら止まる
- **活用例**: 導入実績、社員数、KPI 表示
- **言語化**: 目的の数値まで、ドラムロールのように数字を回す
- **推奨実装**: framer-motion `useMotionValue` + `animate()`、または `react-countup`
- **パラメータ目安**: duration 1.5-2.0s / easing `ease-out` / 桁ごとに回転表示

```tsx
const count = useMotionValue(0);
const rounded = useTransform(count, Math.round);
useEffect(() => {
  const anim = animate(count, target, { duration: 2, ease: "easeOut" });
  return () => anim.stop();
}, [target]);
return <motion.span>{rounded}</motion.span>;
```

- **アクセシビリティ**: `aria-live="polite"` + 最終値を `aria-label` に固定値で記述。reduced-motion で即時表示

### 5.2 ネオン・パルス (`neon-pulse`)

- **演出**: 枠線が脈打つように光る
- **活用例**: 「急募」タグ、限定情報、警告バッジ
- **言語化**: 輝度を周期的に変化させ、エネルギーが通っている質感を出す
- **推奨実装**: `box-shadow` + `filter: drop-shadow` を keyframes で周期変化
- **パラメータ目安**: 周期 1.5-2s / easing `ease-in-out` / 輝度差 40-60%

```css
@keyframes neon-pulse {
  0%, 100% { box-shadow: 0 0 8px var(--accent), 0 0 16px var(--accent); }
  50%      { box-shadow: 0 0 16px var(--accent), 0 0 32px var(--accent); }
}
.neon { animation: neon-pulse 1.8s ease-in-out infinite; }
```

- **アクセシビリティ**: 光感受性配慮で点滅は 3Hz 未満。reduced-motion で停止

### 5.3 カード・チルト (`card-tilt`)

- **演出**: マウスに合わせてカードが傾く
- **活用例**: サービス紹介パネル、プロダクトカード
- **言語化**: カーソルの位置に応じて、3D 的に要素の角度を傾ける
- **推奨実装**: `vanilla-tilt.js` もしくは mousemove から `rotateX` / `rotateY` を算出
- **パラメータ目安**: 最大角 10deg / perspective 1000px / easing `ease-out` 0.2s

```tsx
function Tilt({ children }) {
  const ref = useRef<HTMLDivElement>(null);
  return <div
    ref={ref}
    style={{ perspective: 1000 }}
    onMouseMove={e => {
      const r = ref.current!.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      ref.current!.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    }}
    onMouseLeave={() => { ref.current!.style.transform = "none"; }}
  >{children}</div>;
}
```

- **アクセシビリティ**: タッチデバイス・キーボード操作では無効。reduced-motion で無効化

### 5.4 スケルトン・ローディング (`skeleton-loading`)

- **演出**: 読み込み中に中身の形だけ光る
- **活用例**: データフェッチ中の一覧、ダッシュボードカード
- **言語化**: グレーの枠内で、光が左から右へ流れるような予感を与える
- **推奨実装**: グラデーション背景を `background-position` でアニメート
- **パラメータ目安**: 周期 1.5s / easing `linear` / グラデーション 3色（base / highlight / base）

```css
.skeleton {
  background: linear-gradient(90deg, #eee 0%, #f8f8f8 50%, #eee 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s linear infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
```

- **アクセシビリティ**: `aria-busy="true"` + スクリーンリーダー用に "読み込み中" を伝える。reduced-motion で静止グレーに

### 5.5 ダイナミック・カーソル (`dynamic-cursor`)

- **演出**: マウスの形自体が状況で変化する
- **活用例**: サイト全体の一貫した演出、クリエイティブサイト
- **言語化**: クリックできる場所でカーソルが巨大化・反転する演出
- **推奨実装**: OS カーソルを `cursor: none` で隠し、`position: fixed` の独自 div を mousemove で追従
- **パラメータ目安**: 通常 12px / ホバー時 48px / transition 0.2s ease-out / `mix-blend-mode: difference`

```tsx
const [pos, setPos] = useState({ x: 0, y: 0 });
const [hover, setHover] = useState(false);
useEffect(() => {
  const on = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
  window.addEventListener("mousemove", on);
  return () => window.removeEventListener("mousemove", on);
}, []);
return <motion.div
  className="fixed pointer-events-none rounded-full mix-blend-difference bg-white"
  animate={{ x: pos.x - (hover ? 24 : 6), y: pos.y - (hover ? 24 : 6), width: hover ? 48 : 12, height: hover ? 48 : 12 }}
  transition={{ type: "spring", mass: 0.3, stiffness: 300, damping: 25 }}
/>;
```

- **アクセシビリティ**: タッチデバイスでは無効。OS カーソルを完全に隠す場合はフォーカスリングを必ず残す。reduced-motion で無効化

### 5.6 オーバーレイ・テクスチャ (`overlay-texture`)

- **演出**: 常に砂嵐のようなノイズが乗る
- **活用例**: サイト全体の質感向上、フィルム風ブランディング
- **言語化**: 非常に薄いフィルムノイズを全体に重ね、生きてる感を出す
- **推奨実装**: 固定配置の SVG ノイズ or PNG テクスチャを `position: fixed; inset: 0; pointer-events: none; mix-blend-mode: overlay;`
- **パラメータ目安**: opacity 0.04-0.08 / 周期アニメーション 0.2s（ランダム translate）/ `pointer-events: none` 必須

```tsx
<div className="fixed inset-0 pointer-events-none z-50 opacity-[0.05] mix-blend-overlay"
  style={{ backgroundImage: "url('/noise.png')", backgroundSize: "200px" }}>
</div>
```

SVG版（JSバンドル増なし）:
```html
<svg xmlns="http://www.w3.org/2000/svg" style="position:fixed;inset:0;pointer-events:none;opacity:0.05;mix-blend-mode:overlay;">
  <filter id="n"><feTurbulence baseFrequency="0.9" /></filter>
  <rect width="100%" height="100%" filter="url(#n)" />
</svg>
```

- **アクセシビリティ**: 文字背景のコントラスト比を検証（ノイズで WCAG 基準を下回らないこと）。reduced-motion では静止のみ許容

---

## 6. 和文B2B / コーポレート系（feer 追加）

> 和文B2B案件のデフォルト基準である `design-md/feer/DESIGN.md` で多用するモーション群。
> 30選とは別カテゴリとして登録し、和文コーポレート案件では **まずここから選ぶ**。

### 6.1 マーキー・キーワード (`marquee-keywords`)

- **演出**: ブランドキーワードが横方向にエンドレスでスクロールし続ける
- **活用例**: コーポレートサイトの章間セパレータ、ブランドフッター、ヒーロー直下のシグネチャ帯
- **言語化**: 「★ CREATIVE × AI ● FEEL × FREE ●」のようなキーワード列を `translateX` で永続再生
- **推奨実装**: 同一テキスト2連結 + `transform: translateX(0 → -50%)` を `linear` で無限ループ
- **パラメータ目安**: 1周 25–40s / easing `linear` / フォントウェイト 600 / `tracking-[0.1em]` / `will-change: transform`

```tsx
<div className="overflow-hidden whitespace-nowrap py-4 border-y border-current">
  <div className="inline-flex gap-8 animate-[marquee_30s_linear_infinite] will-change-transform">
    {Array(8).fill("★ KEYWORDS ● KEYWORDS ●").map((t, i) => <span key={i}>{t}</span>)}
  </div>
</div>
```
```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```

- **アクセシビリティ**: 装飾用途のため `aria-hidden="true"`。`prefers-reduced-motion` で `animation: none` に切替（静止表示で意味は保たれる）。3Hz以上の点滅を含めない

### 6.2 シンキング・キャレット (`thinking-caret`)

- **演出**: 文末や入力欄にブリンクするテキストカーソルが出現し続ける
- **活用例**: AI/チャット系コンポーネント、ライブ更新表示、「処理中…」の意思表示
- **言語化**: コンソール風のカーソル `▍` を `steps(1)` で点滅させ、現在進行形の状態を示唆する
- **推奨実装**: `animation: blink 1s steps(1) infinite`、`steps(1)` がフェードでなくパチパチした古典的点滅を作る要点
- **パラメータ目安**: 周期 1s / `steps(1)` / 高さ `1em` / 幅 `0.5em`（または `2px`）

```tsx
<span aria-hidden
  className="ml-1 inline-block w-[0.5em] h-[1em] bg-current align-middle"
  style={{ animation: "blink 1s steps(1) infinite" }} />
```
```css
@keyframes blink { 50% { opacity: 0; } }
```

- **アクセシビリティ**: 装飾なので `aria-hidden`。状態を伝える場合は別途 `aria-live="polite"` で文言を出す。reduced-motion では非表示 or 静止表示

### 6.3 スクロール・プログレス・バー (`scroll-progress-bar`)

- **演出**: ページ最上部に固定された 2px の細線が、スクロール進行度に応じて左から伸びる
- **活用例**: 長尺コーポレートサイト・記事ページ・コンテンツマガジンの進捗インジケータ
- **言語化**: ブランドオレンジ等のアクセント線が `scaleX: 0 → 1` で滑らかに伸び、現在地を視覚化する
- **推奨実装**: `position: fixed; top: 0; height: 2px; transform-origin: left;` を `scaleX(progress)` で更新。`useScroll` + `useTransform` か手書きの scroll listener
- **パラメータ目安**: 高さ 2px / 色 ブランドアクセント / `transform: scaleX(0→1)` / transition なし（毎フレーム更新）

```tsx
const { scrollYProgress } = useScroll();
return <motion.div aria-hidden
  className="fixed left-0 top-0 z-50 h-[2px] w-full origin-left bg-brand"
  style={{ scaleX: scrollYProgress }} />;
```

- **アクセシビリティ**: 装飾用途のため `aria-hidden`。色のみでなく位置でも進捗が伝わる（バーの長さ）ためコントラストは AA を満たせば十分。reduced-motion でも有効でよい（情報伝達であり、装飾ではない）

---

## 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-04-24 | 初版作成（30モーション収録） | Claude Code |
| 2026-05-15 | 和文B2B/コーポレート系 3 motion_key 追加（`marquee-keywords` / `thinking-caret` / `scroll-progress-bar`）。`design-md/feer/DESIGN.md` を和文B2Bデフォルト基準として登録 | Claude Code |
