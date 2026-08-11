# AIデザイン回避ガイドライン

> **目的**: AI生成デザインに共通する「のっぺりした既視感」を排除し、プロの人間デザイナーが作ったような個性と品質を持つデザインを生成するためのガイドライン。
>
> **対象**: Designer Agent, Frontend Engineer, Web Builder, UI/UX Designer, Marketing Agent
>
> **参照元**: `/design-md/` に格納された54社以上のプレミアムブランドデザインシステムの分析結果

---

## 1. 絶対に避けるべきパターン（AI臭の原因）

### カラー
| NG パターン | 理由 | 代替 |
|------------|------|------|
| Tailwindブルー `#3B82F6` をプライマリに | AI生成の99%がこの色を使う | `/shared/design-tokens.json` のprimary参照 or ブランド固有色 |
| 純黒 `#000000` のテキスト | 目に硬い、デジタル臭がする | `#1a1a1a` 〜 `#2d2d2d` の範囲 |
| 純白 `#ffffff` の背景 | 無個性、眩しい | `#faf9f6`（暖色系）や `#f8f9fa`（寒色系）|
| クールグレー `#6b7280` `#9ca3af` | Tailwindデフォルト感 | 暖色寄りグレーで温度感を出す |
| 5色以上のブランドカラー | まとまりがなく素人っぽい | 1クロマティックアクセント + ニュートラル |

### タイポグラフィ
| NG パターン | 理由 | 代替 |
|------------|------|------|
| Interをデフォルト設定で使用 | 最頻出AIフォント | OpenType `cv01`, `ss03` を有効化するか別フォントを選択 |
| Poppinsを見出しに | AI LPの典型 | Sora, Space Grotesk, DM Sans, Outfit 等 |
| 見出しに `font-bold`（700）以上 | 叫んでるように見える | 500-600が洗練。Stripe:300, Linear:510 |
| letter-spacing未設定 | のっぺり | display: -2〜-3px, body: 0, caption: +0.5px |
| 全サイズ均一のline-height | メリハリがない | display: 1.05-1.15, body: 1.7-1.8 |

### レイアウト
| NG パターン | 理由 | 代替 |
|------------|------|------|
| 均等なパディング全セクション同じ | 退屈、テンプレート感 | ヒーロー:大 → 本文:中 → CTA:大 のリズム |
| 4カラムカードグリッド | 情報過多で安っぽい | 3カラムが最適。1-2カラムも使い分け |
| ヒーローがh1サイズ | 弱い、印象に残らない | display_xl (72px) を使う |
| 全セクション中央揃え | 単調 | 左揃え+中央揃えを混在 |

### コンポーネント
| NG パターン | 理由 | 代替 |
|------------|------|------|
| 全ボタンがピル形状 | Tailwindデフォルト感 | 角丸6-8pxが主流。ピルはタグ/バッジのみ |
| 全要素に同じborder-radius | デザインシステムの不在を示す | 3段階（sm:6, md:10, lg:16）を使い分け |
| ドロップシャドウ opacity 0.2+ | 浮いて見える、Material Design風 | 0.04-0.10の多層シャドウ |
| カードに影だけ or 枠だけ | 安い | 影 + 薄い枠のダブル使い |
| hover: scale(1.05) | やりすぎ、ゲームUI感 | scale(1.01) or translateY(-2px) |

### アニメーション
| NG パターン | 理由 | 代替 |
|------------|------|------|
| 全セクションにfadeInUp | うるさい、逆に安っぽい | ヒーロー+主要CTAセクションのみ |
| y: 20-30px のスライドイン | 動きすぎ | y: 12-16px が上品 |
| 1文字ずつのテキストアニメ | ヒーロー以外で使うとウザい | fade-in のみ |
| バウンスアニメーション | プロは使わない | ease-out or カスタムcubic-bezier |
| 自動再生カルーセル | UXが悪い、古い | 静的グリッド or ユーザー操作型スライダー |
| パララックス全セクション | 2015年感 | 控えめに1箇所のみ、もしくは不使用 |

---

## 2. プレミアムブランドの共通パターン（真似すべきもの）

### フォント選定フロー
```
1. クライアントにカスタムフォントがあるか？
   → YES: それを使う
   → NO: 次へ

2. ブランドの「温度」は？
   → 温かい/親しみ: DM Sans, Plus Jakarta Sans, Outfit
   → クール/テック: Space Grotesk, Manrope, Geist
   → 洗練/ラグジュアリー: Sora, サーセリフ系
   → 信頼/コーポレート: Noto Sans JP (palt有効)

3. 日本語対応は必要か？
   → YES: Noto Sans JP + 欧文はdisplayフォントで差別化
   → NO: 上記から選択

4. OpenType機能を必ず確認:
   font-feature-settings: "palt" 1;  /* 日本語 */
   font-feature-settings: "cv01", "ss03";  /* Inter使用時 */
```

### カラー戦略
```
1. design-md/ から業界・テイストが近い企業を選ぶ
2. その企業のプライマリカラーを「参考」にする（丸パクリはしない）
3. ニュートラルは必ず暖色か寒色に振る（純粋なグレーは使わない）
4. セマンティックカラー（成功/警告/エラー）もTailwindデフォルトから変更
5. ダークモードは反転ではなく独立設計（暗い背景に暖色アクセントは映える）
```

### レイアウトのリズム
```
ヒーロー（85vh, 大きな余白）
   ↓ 120px
ソーシャルプルーフ（ロゴ列 or 実績数値）
   ↓ 120px
メインベネフィット（3カラム or 左右交互）
   ↓ 80px
詳細機能（背景色変更でセクション切り替え）
   ↓ 120px
事例・テスティモニアル
   ↓ 80px
CTA（大きな余白で再度目立たせる）
   ↓ 64px
フッター
```

### シャドウの使い方
```
プレミアム: 多層シャドウ（ambient + direct の2層以上）
  box-shadow:
    0px 2px 8px rgba(26, 26, 26, 0.06),    /* ambient */
    0px 1px 2px rgba(26, 26, 26, 0.04);     /* direct */

さらにリッチに: シャドウ + リングの組み合わせ
  box-shadow:
    0px 0px 0px 1px rgba(26, 26, 26, 0.06), /* ring border */
    0px 2px 8px rgba(26, 26, 26, 0.06);     /* ambient */
```

---

## 3. プロジェクト開始時チェックリスト

デザイン作業を開始する前に、以下を必ず確認:

- [ ] `/shared/design-tokens.json` を読み込んだか
- [ ] プライマリカラーが `#3B82F6`（Tailwindブルー）でないか
- [ ] 背景色が純白 `#ffffff` でないか
- [ ] フォントにOpenType機能を設定したか
- [ ] letter-spacingを見出しサイズ別に設定したか
- [ ] border-radiusが3段階以内に収まっているか
- [ ] シャドウが多層構成か（単層ドロップシャドウではないか）
- [ ] アニメーションがヒーロー+主要セクション限定か
- [ ] `/design-md/` から参考ブランドを1社以上選定したか
- [ ] hover効果が `scale(1.05)` でないか

---

## 4. design-md 活用フロー

```
案件受領
  ↓
クライアントの業界・テイスト・競合を分析
  ↓
/design-md/ から最も近いブランド2-3社を選定
  例: SaaS → Linear, Vercel, Stripe
  例: D2C → Airbnb, Spotify, Apple
  例: BtoB → Notion, IBM, Hashicorp
  例: クリエイティブ → Framer, Figma, Cursor
  ↓
選定したDESIGN.mdのカラー・タイポ・コンポーネントパターンを参照
  ↓
/shared/design-tokens.json をプロジェクト用にカスタマイズ
  ↓
カスタマイズ済みトークンを全デザイン系エージェントに配布
  ↓
制作開始
```

---

## 5. Tailwind CSS設定テンプレート

`design-tokens.json` を反映した `tailwind.config.ts` の例:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
          subtle: "var(--color-border-subtle)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        "display-xl": ["72px", { lineHeight: "1.05", letterSpacing: "-3px" }],
        "display-lg": ["56px", { lineHeight: "1.1", letterSpacing: "-2px" }],
        "h1": ["48px", { lineHeight: "1.15", letterSpacing: "-1.5px" }],
        "h2": ["36px", { lineHeight: "1.2", letterSpacing: "-1px" }],
        "h3": ["28px", { lineHeight: "1.3", letterSpacing: "-0.5px" }],
        "body-lg": ["18px", { lineHeight: "1.75", letterSpacing: "0" }],
        "body": ["16px", { lineHeight: "1.75", letterSpacing: "0" }],
        "caption": ["12px", { lineHeight: "1.5", letterSpacing: "0.5px" }],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      boxShadow: {
        sm: "0px 1px 2px rgba(26,26,26,0.04)",
        md: "0px 2px 8px rgba(26,26,26,0.06), 0px 1px 2px rgba(26,26,26,0.04)",
        lg: "0px 8px 24px rgba(26,26,26,0.08), 0px 2px 8px rgba(26,26,26,0.04)",
        ring: "0px 0px 0px 1px rgba(26,26,26,0.06)",
      },
      transitionTimingFunction: {
        entrance: "cubic-bezier(0.0, 0.0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 6. CSS変数テンプレート（globals.css）

```css
:root {
  /* Colors */
  --color-primary: #c96442;
  --color-primary-hover: #b5593b;
  --color-background: #faf9f6;
  --color-surface: #ffffff;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #6b6b6b;
  --color-border: #e8e5e0;
  --color-border-strong: #d1cdc6;
  --color-border-subtle: #f0eee9;

  /* Typography */
  font-feature-settings: "palt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.dark {
  --color-background: #0a0a0b;
  --color-surface: #141415;
  --color-text-primary: #faf9f6;
  --color-text-secondary: #9a9a9a;
  --color-border: #2a2a2b;
  --color-border-strong: #3a3a3b;
  --color-border-subtle: #1e1e1f;
}
```
