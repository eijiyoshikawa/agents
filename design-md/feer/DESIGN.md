# Design System: feer

> **位置付け**: 当組織における **和文B2B / コーポレートサイト・サービスサイト系のデフォルト基準デザイン**。
> 日本語コピーが主体で、信頼感・誠実さと先進性（AI / クリエイティブ）を両立させる必要があるWeb案件で最初に参照する。
> 海外SaaS系（linear.app / framer / notion など）とは目的が異なるため、案件タイプで使い分ける。

出典: https://feer-design.com （株式会社feer コーポレートサイト）

---

## 1. Visual Theme & Atmosphere

feerのサイトは「**和の余白 × ネオブルータリズム × エディトリアル**」を、温かいオレンジと黒で統合した、日本のB2B / コーポレートサイトとして稀有なトーンを持つ。
背景はピュアな白ではなく、わずかにオフホワイト寄りのクリーム (`#FFF9EF`) を採用し、紙質感のあるニュートラル土台を作る。その上に、墨に近い `#1a1a1a` の本文と、ブランドオレンジ `#ef6c02` のアクセントを「文字組みと余白で見せる」設計。

タイポグラフィは日本語と欧文の混植を前提とし、見出しに大きめのトラッキング・字間制御と「一文字ずつの分解配置」を多用する（例: 「異 な る こ と な か れ 、 優 れ ろ 。」）。「No.001 / ISSUE」「SYS / LIVE」「LAT 35.69 / LON 139.69」のような **エディトリアル / コックピット風メタ表示** がページ全体に配置され、紙のような落ち着きと、デジタルプロダクトらしいテック感を同居させている。

モーションは控えめで上品。`growFromBottom`（下から `scale .9 → 1` + `translateY 16px → 0` + `opacity 0 → 1`）を主役の登場演出とし、それ以外はTailwindの `transition-{property} duration-200/300/500 ease-[cubic-bezier(.4,0,.2,1)]` をベースに、hoverでの `-translate-y-1`・アンダーラインの `w-0 → w-full`・矢印の `group-hover:translate-x-1` といった「気づくか気づかないか」のミクロ操作で品位を作る。サイト全体に流れる横スクロール文字列 `★ CREATIVE × AI ● FEEL × FREE ● AI.INTEGRATION ● EST.2020 ●` と、`scroll-snap-type: y mandatory` を活かしたセクション切替が、和文B2Bにありがちな単調さを排除している。

**Key Characteristics:**
- クリーム地 (`#FFF9EF`) × 墨 (`#1a1a1a`) × ブランドオレンジ (`#ef6c02`) の3色完結
- 日本語見出しを「一文字ずつ余白で分解」して配置する組み方
- エディトリアル風メタ表示（`No.0XX / ISSUE`, `SYS / LIVE`, `LAT/LON`）でタイポを「情報」として機能させる
- マーキー（横スクロール文字列）でブランドキーワードを永続的に流す
- モーション主役は `growFromBottom`（下から軽く立ち上がる）、それ以外は `cubic-bezier(.4,0,.2,1)` 標準curve
- hover演出は「-translate-y-1 / 下線 w-full / arrow translate-x-1」のミクロ3点セット
- `scroll-snap` でセクション送りを明示的に演出
- アクセントUI: ブリンクするテキストカーソル `▍`（`animation: blink 1s steps(1) infinite`）

---

## 2. Color Palette & Roles

### Primary
- **Brand Orange** (`#ef6c02`) — プライマリアクセント。CTA・進捗バー・キーワードハイライト・装飾線
- **Brand Orange Dark** (`#c14e00`) — hover時 / 押下時 / オレンジ on オレンジで階調が必要な時
- **Ink Black** (`#1a1a1a`) — 本文・見出し・墨ベタ・アイコン
- **Cream** (`#FFF9EF`) — ページ背景（純白を使わず温かみを残す）

### Surface
- **Off White Surface** (`#fcfbfa`) — カードや一段沈ませたパネル
- **Pure White** (`#ffffff`) — モーダル・最前面オーバーレイのみ（地としては使わない）

### Neutrals & Text
- **Ink Black** (`#1a1a1a`) — 本文・見出し
- **Muted Gray** (`#9ca3af`) — メタ情報・キャプション・補助テキスト
- **Border Gray** (`#e5e7eb`) — 区切り線・カード境界

### Semantic & Accent（控えめに、装飾として点で使う）
- **Teal** (`#0fa388`)
- **Purple** (`#953bab`) / **Indigo** (`#4f4fd4`) / **Magenta** (`#dc62e3`)
- **Coral** (`#ed315d`) / **Soft Orange** (`#ff6b46`)

> アクセント7色は **「サービスタグ / カテゴリチップ / イラスト内ハイライト」専用**。本文配色には用いない。ブランドの主軸はあくまでオレンジ1色。

### Gradient System
- 使わない。常にフラットカラー + 余白 + タイポで階調を作る。
- 例外: スクロール進捗バー (`#ef6c02` の `scaleX` 変化) のみ動的なグラデーション的振る舞いを許可。

---

## 3. Typography Rules

### Font Family
- **Display / Body（日本語混植）**: `Work Sans` + 日本語webfont（カスタム woff2 3種をpreload）
- **Body fallback**: `Roboto, sans-serif`
- **System fallback chain**: `Work Sans, -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif`
- **Mono**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`（メタ表示・コックピット風ラベル）

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Display | Work Sans + JP | 80–120px | 700 | 1.05 | -0.02em / 日本語は **char-by-char gap 0.3–0.5em** | 一文字ずつ余白配置で「組む」 |
| Section Display | Work Sans + JP | 56–72px | 700 | 1.10 | -0.01em | エディトリアル風大見出し |
| Section Heading (en) | Work Sans | 36–48px | 600 | 1.15 | 0 | "[ ABOUT ]" 等の角括弧見出し |
| Sub-heading | Work Sans + JP | 24–28px | 600 | 1.30 | 0 | カード見出し |
| Body | Work Sans + JP | 15–16px | 400 | 1.75 | 0 | 日本語本文は1.75行送りで圧迫感を回避 |
| Body Small | Work Sans + JP | 13–14px | 400 | 1.70 | 0 | キャプション |
| Meta / Cockpit | Mono | 11–12px | 500 | 1.20 | 0.05em | `SYS / LIVE — 10:04:18` 等 |
| Marquee | Work Sans | 18–24px | 600 | 1.00 | 0.1em | 横スクロール文字列 |
| Number Label | Work Sans | 11–13px | 600 | 1.00 | 0.08em | `01 / 04` 連番 |

### Principles
- **文字組みで見せる**: 大見出しは「字間を広げて一文字ずつ置く」ことでブランドの落ち着きを演出。CSS では `letter-spacing` ではなく、各文字を `<span>` で分けて `gap` で制御するのが推奨（縦横自在）
- **角括弧見出し**: 章タイトルは `[ ABOUT ]` `[ SERVICE ]` `[ TIPS ]` のように **半角ブラケット + スペース + 大文字** で統一
- **エディトリアルメタ**: 各セクションに `No.0XX / ISSUE` や `01 / 04` のようなナンバリングを必ず添えて、雑誌的なリズムを作る
- **混植の余白**: 日本語本文の line-height は欧文より広め（1.7–1.8）に設定。詰めない
- **Mono の役割**: モノスペースは「コードを書く」ためではなく **コックピット計器の数値ラベル** のために使う。座標・時刻・処理状態の表示が代表用途

---

## 4. Component Stylings

### Buttons
- **Primary CTA**: 背景 `#1a1a1a`、文字 `#FFF9EF`、`rounded-full`、`px-6 py-3`。hover で `-translate-y-1` + `bg-[#ef6c02]` に変化
- **Secondary CTA**: 背景 `transparent`、`border-[#1a1a1a]` 1px、`rounded-full`。hover で `bg-[#1a1a1a] text-[#FFF9EF]` 反転
- **Inline Link**: 下線は `relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] hover:after:w-full` で `0 → 100%` に伸びる
- **Icon Link Arrow**: 矢印は `group-hover:translate-x-1 transition-transform duration-300` で右に1単位スライド
- **Transition curve**: 全button hover は `transition duration-300 ease-[cubic-bezier(.4,0,.2,1)]`

### Cards & Containers
- **Service Card**: `bg-[#fcfbfa]`、`border border-[#e5e7eb]`、`rounded-2xl`、`p-8`。hover で `border-[#1a1a1a]` + `-translate-y-1` + 影なし（紙の質感を壊さない）
- **Tag Chip**: `bg-transparent` / `border border-current` / `rounded-full` / `px-3 py-1` / 11px。`# Digital Ads` のようにハッシュタグ表記
- **Numbered Cell**: 左上に大きな番号（`01` `02` …）を `Work Sans 64px 700` で配置し、その下にタイトル＋本文を流す「雑誌のリード組」パターン
- **Borderless Divider**: 装飾線は使わず、**1pxの細線 + 角括弧見出し + 余白80px** で章を切る

### Hero Section
- 左上にロゴ・右上にナビ・中央に巨大な日本語見出しを文字ばらし配置
- 右下に `SYS / LIVE — 10:04:18` のような **更新中表示**（実際に時刻が秒更新で進む）
- 下端に `★ CREATIVE × AI ● FEEL × FREE ● ...` のマーキーを永続再生

### Marquee
```tsx
<div className="overflow-hidden whitespace-nowrap py-4 border-y border-[#1a1a1a]">
  <div className="inline-flex gap-8 animate-[marquee_30s_linear_infinite]">
    {Array(8).fill("★ CREATIVE × AI ● FEEL × FREE ● AI.INTEGRATION ● EST.2020 ●").map((t, i) => (
      <span key={i} className="font-semibold tracking-[0.1em]">{t}</span>
    ))}
  </div>
</div>
```
```css
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .animate-\[marquee_30s_linear_infinite\] { animation: none; } }
```

### Scroll Progress Bar
```tsx
<div aria-hidden className="fixed left-0 top-0 z-50 h-[2px] w-full origin-left bg-[#ef6c02]"
     style={{ transform: `scaleX(${progress})` }} />
```

### Blinking Caret（思考中インジケータ）
```tsx
<span aria-hidden className="ml-1 inline-block w-[0.5em] h-[1em] bg-current align-middle"
      style={{ animation: "blink 1s steps(1) infinite" }} />
```

---

## 5. Layout & Spacing

- **Container**: `max-w-[1280px] mx-auto px-6 md:px-10`
- **Section padding**: 縦 `py-24 md:py-32`、章間は最低 96px
- **Grid**: 12カラム / `gap-8`。サービスカード等は 2×2 / 4×1 のシンプルな割付を優先
- **Scroll snap**: ファーストビュー〜主要セクションは `scroll-snap-type: y mandatory` + 各 `section` に `snap-start` を付与。ただし読み物（記事）セクションは snap を切る
- **Sticky Nav**: 上部ナビは `sticky top-0 z-40 bg-[#FFF9EF]/80 backdrop-blur-md border-b border-[#1a1a1a]/10`

---

## 6. Motion Tokens（feer 標準）

> MOTION_30 に対する **feer 系プロジェクトのデフォルト値** として固定する。
> 個別 `motion_key` を選ぶ前に、まずこのトークンセットを土台にする。

### Duration Scale
| token | ms | 用途 |
|-------|----|----|
| `motion-fast` | 200 | hover / focus / 小さなUI変化 |
| `motion-base` | 300 | 標準のtransition（推奨デフォルト） |
| `motion-slow` | 500 | カード反転・アコーディオン |
| `motion-grow` | 400 | `growFromBottom` / `growFromTop` 登場演出 |
| `motion-marquee` | 30000 | 横スクロール文字列の一周 |

### Easing
| token | bezier | 用途 |
|-------|--------|----|
| `ease-standard` | `cubic-bezier(.4, 0, .2, 1)` | hover / 標準transition すべて |
| `ease-grow` | `cubic-bezier(.28, .84, .42, 1)` | `growFromBottom` / `growFromTop` 登場 |
| `ease-marquee` | `linear` | マーキー |

### Keyframes（feer 既定）
```css
@keyframes growFromBottom {
  0%   { opacity: 0; transform: scale(.9) translateY(16px); }
  100% { opacity: 1; transform: scale(1)  translateY(0);    }
}
@keyframes growFromTop {
  0%   { opacity: 0; transform: scale(.9) translate(-50%, -16px); }
  100% { opacity: 1; transform: scale(1)  translate(-50%, 0);     }
}
@keyframes blink   { 50% { opacity: 0; } }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Tailwind config snippet（feer プロジェクトのデフォルト）
```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        ink:    "#1a1a1a",
        cream:  "#FFF9EF",
        brand:  { DEFAULT: "#ef6c02", dark: "#c14e00" },
        surface:"#fcfbfa",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.4, 0, .2, 1)",
        grow:     "cubic-bezier(.28, .84, .42, 1)",
      },
      transitionDuration: {
        200: "200ms", 300: "300ms", 400: "400ms", 500: "500ms",
      },
      keyframes: {
        growFromBottom: { "0%": { opacity:"0", transform:"scale(.9) translateY(16px)"}, "100%": { opacity:"1", transform:"scale(1) translateY(0)"} },
        blink: { "50%": { opacity:"0" } },
        marquee: { from:{transform:"translateX(0)"}, to:{transform:"translateX(-50%)"} },
      },
      animation: {
        "grow-from-bottom": "growFromBottom .4s cubic-bezier(.28,.84,.42,1) both",
        blink: "blink 1s steps(1) infinite",
        marquee: "marquee 30s linear infinite",
      },
      willChange: { transform: "transform" },
    },
  },
}
```

### MOTION_30 マッピング（feer サイトで検出済み）
| feer での使い方 | MOTION_30 motion_key | パラメータ上書き |
|----------------|----------------------|-----------------|
| セクション主要要素の登場 | `fade-up`（=grow系の汎用） | duration 400ms / easing `ease-grow` / translateY 16px / scale .9 |
| 矢印が右にずれるinline link | `magnetic-mouse`（簡易版） | translate-x 4px / duration 300ms |
| 横スクロールキーワード | （新規）`marquee-keywords` | 後述 |
| ブリンクするテキストカーソル | （新規）`thinking-caret` | 後述 |
| スクロール進捗バー | （新規）`scroll-progress-bar` | 後述 |

> 上記の新規3点は MOTION_30.md の「ベンチャー・先進性特化系」に登録済み（feer導入時に追加）。

---

## 7. Voice & Copy Patterns

feer のコピーは、**サイト全体で短文の並置 + 句読点による間** を多用する。Web制作エージェントはこの語感を踏襲する:

- 「異なることなかれ、優れろ。」のように **読点で間を作って一拍置く** ヘッドラインを推奨
- 章タイトルは「`[ ABOUT ]` `[ SERVICE ]`」のように **角括弧 + 半角スペース + 英大文字**
- メタは数字 + スラッシュで構造化（`No.001 / ISSUE`、`01 / 04`）
- 行末を体言止めにせず「**……。**」で締めて余韻を残す
- 「お客様『に』ではなく、お客様『と』」のような **括弧で一語をピックアップする強調** が定型

---

## 8. Accessibility & Performance

- **コントラスト**: `#1a1a1a` on `#FFF9EF` で 16.4:1。`#ef6c02` on `#FFF9EF` で 3.6:1 → **見出しサイズ以上でのみ使用可**、本文文字色には使わない
- **`prefers-reduced-motion`**: 全モーションでフォールバック必須。マーキーは静止、grow は即時表示
- **Font preload**: 日本語webfont 3種を `<link rel="preload" as="font" crossorigin>` で先読み
- **Will-change**: マーキー・スクロール進捗バーにのみ `will-change: transform`。他は付けない（GPU乱用回避）

---

## 9. このDESIGN.mdを使うタイミング

| プロジェクトタイプ | 採否 |
|------------------|------|
| 日本語コーポレートサイト / 採用サイト | **デフォルト採用** |
| 日本語サービスサイト / プロダクトLP（B2B） | **デフォルト採用** |
| 日本語LP（B2C・キャンペーン） | 雛形として採用、彩度を上げて派生 |
| 海外SaaS / ダッシュボード | 採用しない（`linear.app` / `framer` / `notion` を参照） |
| ダークモード必須案件 | 採用しない（feerはライト固定） |

判断に迷う場合は **Designer + UI/UX Designer が合議** し、QA Reviewer が最終確認する。

---

## 改訂履歴

| 日付 | 改訂内容 | 担当 |
|------|---------|------|
| 2026-05-15 | 初版作成（feer-design.com から抽出、和文B2B/コーポレートのデフォルト基準として登録） | Claude Code |
