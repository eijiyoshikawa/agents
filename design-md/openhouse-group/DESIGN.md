# Design System: Open House Group Recruit

> Reference site: `https://recruit.openhouse-group.com/`
> 株式会社オープンハウスグループ 採用情報ポータル（新卒・中途・障がい者採用）
> 抽出元: 保存済みHTML（`採用情報｜株式会社オープンハウスグループ.html`）+ クラス命名・構造解析

## 1. Visual Theme & Atmosphere

オープンハウスグループの採用サイトは、**「日本一を目指す」野心と勢いを、白基調のクリーンな紙面に大判の社員写真で見せる**、日本企業の採用ポータルとしては高水準にモダンな構成。背景は純白（`#ffffff`）を基準とし、強い原色は控えめ。代わりに**実際の社員写真**（営業職・建設技術職・事務総合職それぞれのリアルな職場/人物カット）が紙面の主役を担い、コピー・タイポグラフィは黒ベースで補佐に回る。

レイアウトは縦長カード（`adoptionLink`）が3列のグリッドで並ぶフォトタイルパターンで、各カードに**日本語ラベル（職種名）+ 小タグ（職種カテゴリ）+ 英字キャッチコピー**を載せる。タイポグラフィでは**`rc-en` クラスを付与した英字テキスト専用に Work Sans**（Google Fonts）を当てており、日本語（macOS/Windowsシステムサンセリフフォールバック）と英字でフォントを切り替えることで、**「日本語=丁寧・誠実」「英字=シャープ・スピード感」**の二層構造を作っているのが核となる体験設計。

特徴的なのは「3カテゴリ（新卒/中途/障がい者）への明確な区分け」と「OPENIA（自社採用オウンドメディア）への動線」「1day選考会バナー」「ボトムワイヤ（コーポレートサイト・O-EN HOUSE PROJECT等への巨大バナー導線）」が並ぶ、**情報密度の高い縦長一画面構成**。スクロール進捗バー（`rc-progressBar`）、固定検索（`fixSearch`）、画像のパララックス追従（`js-stalker` / `js-stalkerItem`）など、**スクロール体験のリッチさ**で「動きのある力強い会社」を表現する。

**Key Characteristics:**
- 純白キャンバスに大判の社員フォトを敷き詰めるフォト主導の紙面
- 日本語＝システムサンセリフ / 英字＝Work Sans の二フォント運用（`rc-en` クラスで切替）
- 採用カテゴリを `graduate` / `career` / `disabilities` の3トラックで明確に区分
- 縦長フォトカード（画像 + 日本語タイトル + タグチップ）が主要ユニット
- 固定ヘッダー + ハンバーガーグローバルナビ + スクロール進捗バーで「読み進める」体験
- `bottomWire`（巨大画像 + 英字大見出しの導線ブロック）でブランド世界観を補強
- 検索UI（採用区分 / 職種 / 勤務地 / 未経験可チェック）が常時アクセス可能な`fixSearch`として常駐
- 「第二新卒大歓迎！」のような**スポット赤バッジ**で温度感のあるアクセントを付与
- 日本語キャッチに頼らず**英字大見出し（`OPEN HOUSE GROUP` / `RECRUITMENT` / `NEW GRADUATE RECRUITMENT`等）**でセクション境界を明示

## 2. Color Palette & Roles

> 注: 個別の `common.min.css` / `top.min.css` 内のトークンは保存HTMLには展開されていないため、HTMLインライン参照・ブランド一貫性・採用業界基調から導出した推奨パレット。実装時は本社コーポレートサイト（openhouse-group.co.jp）のロゴ・装飾色に合わせて再キャリブレートすること。

### Primary Brand
- **Pure White** (`#ffffff`): ページ背景・カード面・グローバルナビ面 — 「クリーン・誠実」を象徴
- **Ink Black** (`#111111` 〜 `#1a1a1a` 目安): 本文・見出し・主要テキスト
- **Accent Red** (`#e60012` 目安): 「第二新卒大歓迎！」バッジ・主要CTA・1day選考会バナーのストロングアクセント（オープンハウスのコーポレートカラーに準拠）

### Secondary / Surface
- **Soft Gray** (`#f5f5f5` / `#fafafa`): セクション区切り背景・検索ドロワー面
- **Border Gray** (`#e5e5e5` / `#e0e0e0`): カード境界・区切り線
- **Mid Gray** (`#999999`): 補助テキスト・キャプション・タグ枠線
- **Sub Text Gray** (`#666666`): 説明文（職種条件で募集中の求人を検索できます。 等）

### Tag / Chip
- **Tag Outline** (`#cccccc` 目安, 1px border): `#` 付きハッシュタグ風チップ（OPENIA記事タグ）
- **Tag Filled (selected)** (背景 `#111` / 文字 `#fff`): 検索条件の選択中状態

### State
- **Hover Underline / Link** (`#111111` + 下線アニメーション): リンクホバー
- **Disabled** (`rgba(17, 17, 17, 0.32)`): 非活性チェックボックス・送信不可状態

### Photo Treatment
- 社員写真は**色補正なしの自然な肌色・スーツの黒/ネイビー**で統一
- 画像にはオーバーレイを乗せず、純粋に被写体の表情・職場の質感で語らせる

## 3. Typography Rules

### Font Family

| 用途 | フォントスタック |
|------|------------------|
| 日本語 UI / 本文 | `-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif` |
| 英字（`rc-en` クラス） | `"Work Sans", sans-serif` （Google Fonts, weight 100..900 / italic 100..900 をインポート） |

> HTMLヘッダで明示的にインポートされているのは Work Sans のみ。日本語フォントはOSフォールバックに委ねるのが Open House Group recruit の方針。

### Hierarchy

| ロール | フォント | サイズ目安 (PC) | サイズ目安 (SP) | ウェイト | 用途 |
|--------|----------|----------------|----------------|----------|------|
| Hero EN Title (`topContainer__ttlbefore` / `__ttlafter`) | Work Sans | 64–96px | 36–48px | 800–900 | `OPEN HOUSE GROUP` / `RECRUITMENT` メインビジュアル |
| Hero JP Subtitle (`topContainer__subttl`) | JP Sans | 16–18px | 13–14px | 500 | 「オープンハウスグループ採用情報」 |
| Section EN Heading (`linkSection__en` / `bottomWire__en` / `openiaSection__en`) | Work Sans | 40–56px | 28–36px | 700–800 | `NEW GRADUATE RECRUITMENT` 等 |
| Section JP Heading (`linkSection__jp` / `openiaSection__jp`) | JP Sans | 20–24px | 16–18px | 700 | 「新卒採用」「オープンハウスまるごとガイド」等 |
| Card Title (`adoptionLink__name`) | JP Sans | 18–22px | 16–18px | 700 | 「営業職」「建設技術職」等の職種名 |
| Card Tag (`adoptionLink__tag`) | JP Sans | 11–12px | 10–11px | 500 | 「営業職」「施工職」等のチップ |
| OPENIA Article Title (`openiaNews__txt`) | JP Sans | 16–18px | 14–15px | 700 | 記事タイトル（2-3行折返し） |
| OPENIA Tag (`openiaNews__tag`) | JP Sans | 11–12px | 10–11px | 400 | 「# 社員インタビュー」 |
| Body Text (`search__headerDescription` 等) | JP Sans | 14–15px | 13–14px | 400 | 説明文・補助テキスト |
| Button Label (`search__submit` / 各CTA) | JP Sans | 15–16px | 14–15px | 600 | 「検索する」「条件をクリアする」 |
| Welcome Badge (`adoptionLink__welcome`) | JP Sans | 12–13px | 11–12px | 700 | 「第二新卒大歓迎！」赤バッジ |
| Banner Sub (`onedayBanner__sub`) | JP Sans | 13–14px | 12px | 500 | 「中途採用 営業職」 |
| Banner Main (`onedayBanner__main`) | JP Sans + EN混在 | 28–36px | 22–26px | 800 | 「1day選考会」 |
| Footer Copyright (`rc-globalContent__copy`) | Work Sans | 11–12px | 10–11px | 400 | `©2024 Open House Group Co.,LTD.` |

### Principles
- **英字は太く、大きく、Work Sans 700–900**: セクションの「ボーダー」役。視線を強く引きつける。
- **日本語は素直なシステムサンセリフ**: 読みやすさと汎用性を最優先。装飾は最小限。
- **英字と日本語の組み合わせは必ず縦積み or 大小コントラスト**: 同列にしない（`__en` と `__jp` を `<span>` で分けて改行する）。
- **大文字英字（all-caps）が標準**: `OPEN HOUSE GROUP`, `RECRUITMENT`, `OPENIA` 等は字間を素のまま、weightで強さを出す。
- **キャッチコピーは `<br>` で改行を明示的にコントロール**（`u-only-show--pc` / `u-only-show--sp` で PC/SP 別の改行位置を切替）。

## 4. Component Stylings

### Header (`rc-header`)
- 高さ: 約 70–80px (PC) / 56–64px (SP)
- 背景: `#ffffff`
- 左: `rc-headerLogo` ロゴ画像（200×39.5px、PNG）
- 右: `rc-headerOuter`（`CORPORATE SITE` 英字テキストリンク）+ `rc-headerHamburger`（ハンバーガーアイコン）
- ハンバーガークリックで `rc-global` ドロワー（`rc-globalBg` で背景フェード）展開

### Global Navigation Drawer (`rc-global` / `rc-globalContent`)
- 全画面オーバーレイ
- 3カラム（新卒採用 / 中途採用 / 障がい者採用）
- 各カラムは「**日本語タイトル + 英字キャプション (`rc-en`)**」のヘッダー + リンクリスト（`__list`）
- PC/SP でリンク順を別出し（`--displayPc` / `--displaySp` クラスで切替）
- 下部に外部リンクと著作権表記

### Hero (`topContainer`)
- 上部: 巨大英字タイトル `OPEN HOUSE GROUP` / `RECRUITMENT` 縦積み + 日本語サブタイトル
- スクロール進捗バー (`rc-progressBar`, 縦/横どちらか, `style="height: 0%"` で動的更新)

### Adoption Cards (`adoptionLink`)
基本構造:
```
.adoptionLink
  └ .adoptionLink__link (a)
      ├ .adoptionLink__img (picture: PC 336×497 / SP 343×240)
      ├ .adoptionLink__welcome (任意・赤バッジ「第二新卒大歓迎！」)
      └ .adoptionLink__txts
          ├ .adoptionLink__name (職種名)
          └ .adoptionLink__tags
              └ .adoptionLink__tag × n
```
- 画像はPC縦長 (`336×497`)、SP横長 (`343×240`) と**ブレークポイントで完全に異なる画像**を `<picture>` で出し分け
- カード自体は背景白・境界線なしのフォト主導
- ホバーで画像が微拡大 + テキストアンダーライン（推定）
- バリアント: `graduateLink` / `careerLink`（採用区分でクラス追加）

### Tags / Chips (`adoptionLink__tag`, `openiaNews__tag`)
- 採用カードタグ: 細枠の角丸ピル（`border-radius` 推定 9999px or 16px）、フォント 11–12px、文字色 `#666`、枠 `#ccc`
- OPENIA記事タグ: `# 社員インタビュー` のハッシュ付き、枠なし・薄グレー文字
- パディング: `4px 10px` 程度

### "1day" Promo Banner (`onedayBanner`)
- 横長フルブリードカード（PC: 1028×235 程度）
- 左: 画像 / 右: テキスト
- テキストは `__sub`（細）+ `__main`（極太、`1day` を `rc-en` で英字強調）の二段構成

### Search (`search` / `fixSearch`)
- 通常版 `search` はインライン、`fixSearch` はスクロール追従のフローティング検索
- 構造:
  - `search__header`（タイトル + 説明）
  - `search__terms` → `search__selects`（採用区分 / 職種 / 勤務地 のアコーディオン）
  - `search__welcome`（「未経験可」チェックボックス単独）
  - `search__selected`（選択中タグ一覧、`x-show` で動的表示）
  - `search__bottom`（件数表示 + 「検索する」/「条件をクリア」ボタン）
- 採用区分のドロップダウン:
  - 閉じた状態は **横長ボタン + 右端に + アイコン**（`search__selectIcon` の2spanで作るプラス記号）
  - 開いた状態 (`is-open` クラス) でリストが下に展開
- チェックボックス (`checkbox`): カスタム矩形 + チェック時に塗りつぶし（推定 `#111` / `#fff`）
- 検索送信ボタン (`search__submit`):
  - 背景: `#111111`（near-black）
  - 文字: `#ffffff`
  - 内蔵SVG虫眼鏡アイコン（15×16, fill `#ffffff`）右寄せ
  - パディング: 縦 14–16px / 横 28–32px
  - 角丸: 推定 4–8px（採用業界の硬めの印象に寄せる）

### OPENIA News Slider (`openiaScroller` / Swiper)
- Swiper.js ベースの水平スワイプスライダー（`swiper-initialized swiper-horizontal`）
- 1スライド: 画像 (392×260) + 2-3行タイトル + ハッシュタグ群
- スライド間ギャップ: 約 24–32px
- アクティブ/ネクストに `swiper-slide-active` / `swiper-slide-next` クラスで状態管理

### Bottom Wire (`bottomWires` / `bottomWire`)
- 「外部サイトへの導線」セクション
- 各 `bottomWire` は: **英字大見出し (`CORPORATE SITE` / `O-EN HOUSE PROJECT`) + 日本語キャプション + 画像 (201×231)**
- `--reverse` 修飾子で左右反転レイアウト
- 画像はマウス位置に追従してパララックス移動 (`js-stalkerItem` の `transform: translate(x, y)` 制御)

### Welcome Badge (`adoptionLink__welcome`)
- 赤背景 + 白文字の小バッジ「第二新卒大歓迎！」
- 中途採用カードの右上などに絶対配置
- 推定: 背景 `#e60012`, 文字 `#ffffff`, パディング `4px 10px`, 角丸 `2–4px`, weight 700

### Selected Filter Pill (`selectedList__tag`)
- 検索条件選択時に表示される削除可能タグ
- `<span class="selectedList__icon">` で×アイコン + `<span class="selectedList__text">` でラベル
- 推定: 黒背景 `#111` + 白文字、`border-radius: 4px`、`padding: 6px 12px`

## 5. Layout Principles

### Container
- 最大幅: 約 **1100–1200px**（PC, `topContainer` / `linksContainer`）
- 中央寄せ、左右パディング: PC 40px / SP 16–20px

### Grid
- 採用カードグリッド: PC **3カラム**（`grid-template-columns: repeat(3, 1fr)` 相当）, SP 1カラム（縦積み・横スクロール無し）
- カード間ギャップ: PC 24–32px / SP 16px
- OPENIAスライダー: 横スクロール（Swiper）固定

### Spacing Scale (推定)
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 40px
2xl: 64px
3xl: 96px   ← セクション間
4xl: 120px  ← ヒーロー〜本文
```

### Sectioning
- 各セクションは **「英字大見出し + 日本語サブ + 本文」** の3要素ヘッダーで開始
- セクション間は背景色を変えず、余白（80–120px）と英字大見出しの存在感だけで境界を作る

### Whitespace Philosophy
- カード周辺は**写真を最大化、テキスト周辺の余白を厚めに**取り「読ませる」より「眺めさせる」設計
- 検索UIだけは情報密度を上げ、選択肢を一望できるリストビューに

## 6. Depth & Elevation

- **ほぼフラット**: シャドウはほとんど用いず、写真と余白でレイヤーを表現
- カードホバー時のみ控えめなシャドウ: `0 4px 16px rgba(0, 0, 0, 0.08)` 程度を推奨
- 固定検索 `fixSearch` は浮遊感を出すため `0 -2px 12px rgba(0, 0, 0, 0.06)` を上方向に
- グローバルナビドロワー (`rc-global`) は背景に半透明黒オーバーレイ (`rc-globalBg`, `rgba(0, 0, 0, 0.4)` 程度) + 白パネルで深度

## 7. Do's and Don'ts

### Do
- ✅ 英字（Work Sans）+ 日本語（システムサンセリフ）の**フォント二刀流**を守る。クラス `rc-en` を全英字テキストに必ず付与
- ✅ セクション見出しは「英字 + 日本語」の**2行縦積み**を基本フォーマットに
- ✅ 採用カードは**写真ありき**。社員写真・現場写真を裁ち落としで主役に
- ✅ PC/SP で**画像も改行も別配信**（`<picture media>` + `<br class="u-only-show--pc">`）
- ✅ 数値・実績・キャッチには**赤バッジ**でアクセントを入れて温度感を出す
- ✅ スクロール体験を演出（進捗バー・パララックス・固定検索）
- ✅ 3トラック（新卒 / 中途 / 障がい者）の**情報の階層と独立性を明確に**保つ

### Don't
- ❌ 写真の上に半透明グラデーションオーバーレイを乗せて文字を読ませる構成にしない（このサイトは写真と文字を分離する）
- ❌ 日本語に明朝体・装飾フォントを使わない（誠実さ・近代感が崩れる）
- ❌ 英字を細いウェイト（300以下）で使わない。Work Sans 700+ がアイデンティティ
- ❌ カードに濃い背景色やボーダーを付けない（白背景＋写真の構成が崩れる）
- ❌ 採用区分のカラーコーディング（新卒=青 / 中途=緑 などの色分け）をしない。色ではなく**英字キャプション + 写真**でカテゴリを区別する
- ❌ シャドウ・グラデーション・ガラス効果などの装飾エフェクトに頼らない

## 8. Responsive Behavior

### Breakpoints
- **PC**: ≥ 769px（メイン: 1024px / 1280px / 1440px）
- **SP**: ≤ 768px（HTML内 `media="(max-width: 768px)"` から確認）

### 主要切替
| 要素 | PC | SP |
|------|----|-----|
| ヘッダーロゴ | 200×39.5px | 縮小（〜140px幅程度推奨） |
| ハンバーガー | 表示（メニューはドロワー展開） | 同じ |
| `CORPORATE SITE` リンク | ヘッダー右に表示 | 非表示（ドロワー内のみ） |
| 採用カード画像 | 縦長 336×497 | 横長 343×240（**画像自体を差し替え**） |
| カードグリッド | 3カラム | 1カラム縦積み |
| グローバルナビリンク順 | `--displayPc` の順序 | `--displaySp` の順序（インターンと正社員を交互に） |
| キャッチコピーの改行 | `u-only-show--pc` の位置で改行 | `u-only-show--sp` の位置で改行 |
| 検索UI | 通常インライン + 必要に応じ `fixSearch` | `fixSearch` を底部固定で常時表示 |
| `bottomWire` 画像パララックス | あり (`js-stalker`) | 弱化 or 無効化 |

### Touch Target
- ボタン・チップは **最低 44×44px**（モバイル基準）
- 検索アコーディオンの開閉ヒット領域はラベル + アイコン全体

### Sticky / Fixed
- `fixSearch`: SP では画面下部に固定（「条件に合う求人 63件」+「検索する」ボタン）
- ヘッダーはスクロール時も固定（白背景維持）
- スクロール進捗バー `rc-progressBar` はビューポート左端/上端に縦/横ライン

## 9. Agent Prompt Guide

### Quick Color Reference
```
Background:        #ffffff
Primary text:      #111111 ~ #1a1a1a
Secondary text:    #666666
Caption text:      #999999
Border / divider:  #e5e5e5
Surface (soft):    #f5f5f5 / #fafafa
Accent (red):      #e60012   ← 「第二新卒大歓迎！」バッジ・主要CTA
Selected pill:     bg #111 / text #fff
```

### Quick Typography Reference
```
EN headings:   "Work Sans", weight 700-900, all-caps OK
JP headings:   system-ui Japanese sans, weight 700
JP body:       system-ui Japanese sans, weight 400-500, 14-16px
Pair pattern:  EN大見出し → 改行 → JP小見出し（縦積み）
```

### Ready-to-Use Prompts

**採用サイトのトップを作る場合:**
> Open House Group recruit 風の採用ポータルトップを実装してください。背景は純白、ヘッダーは固定で左にロゴ、右に英字 `CORPORATE SITE` リンクとハンバーガー。ヒーローは Work Sans 800 の `COMPANY NAME` / `RECRUITMENT` を縦積みで巨大表示し、下に小さな日本語サブタイトルを置く。職種ごとの採用カードを 3カラム グリッドで並べ、各カードは縦長社員写真 + 職種名（日本語太字）+ タグチップ（細枠、角丸ピル）の3層。カテゴリ（新卒 / 中途 / 障がい者）は色分けせず、セクション見出しの「英字 + 日本語」2行ヘッダーだけで区別する。「第二新卒大歓迎！」のような促進バッジは赤背景 `#e60012` + 白文字 + 小角丸でカードに重ねる。

**フォトタイル・カードコンポーネント:**
> 写真主導のリンクカードを作って。縦長アスペクト（PC 336×497 / SP 343×240）、画像は `<picture>` で出し分け。下に日本語の職種名（18–22px / weight 700）、その下に細枠角丸ピルのタグを横並びで複数表示。ホバーで画像がわずかに拡大（scale 1.02）+ タイトル下線。背景白、境界線なし、シャドウなし — 写真と余白で立体感を出す。

**英字 + 日本語の見出しパターン:**
> セクション見出しは2行構成。1行目に Work Sans 700–800 の英字（all-caps、例: `NEW GRADUATE RECRUITMENT`）、2行目にやや小さい日本語太字（例: 「新卒採用」）。英字には `rc-en` 相当のクラス。色は両方とも `#111`、装飾下線や色アクセントは入れない。

**検索フォーム（採用区分・職種・勤務地）:**
> 縦並びのアコーディオン式検索フォーム。各セクションは横幅いっぱいのボタン（左テキスト「採用区分を選ぶ」、右に+アイコン）、開くとチェックボックスのリストが展開。選択中の条件は別パネルで黒背景・白文字のピル群として一覧表示、各ピルに×アイコン。下部に「条件に合う求人 N件」の件数表示と、黒背景白文字の「検索する」ボタン（右に虫眼鏡SVGアイコン）+ アウトラインの「条件をクリアする」ボタンを並べる。

**ボトムワイヤ（外部リンク誘導大バナー）:**
> ページ最下部に「外部サイト誘導用」の巨大画像ブロックを左右交互に並べる。各ブロックは: 左側に英字超大見出し（`CORPORATE SITE` 等、2行改行、Work Sans 800）+ 日本語キャプション、右側に正方形に近い写真（201×231）。マウス移動に応じて画像が translate でわずかにパララックス追従。`--reverse` 修飾子で左右反転バリアントを用意。
