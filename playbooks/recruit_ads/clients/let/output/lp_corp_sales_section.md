# LP 法人セールス専用セクション 追加設計

> 対象LP: LP-A (recruit-se01) / LP-B (recruit-se02)
> 目的: CRTV→LP遷移後、法人セールス志望者が迷子にならない導線設計
> 担当: Engineer + Designer + Content Creator
> 起票: 2026-05-25

## 1. 問題の整理

現状のLP は SNSマーケ職が前面に出る3職種混在ページ。法人セールス志望者が来ると:

- 「コーポレートセールスってどこ？」と探す手間
- SNSマーケ職の詳細を読んでしまい関心が逸れる
- フォームまで辿り着けず離脱

→ **CRTVから法人セールス志望者を「直接該当セクションへ着地」させる導線が必要**

## 2. 解決策（2つの選択肢）

### Option A: アンカーリンク + 動的FV（推奨・低コスト）

既存LP に最小限の改修で実現。

- URL に `?role=sales` / `?role=corp-sales` 等のパラメータを追加
- LP 側で URL パラメータを読み、**FV のキャッチコピーを動的に切替**
- ページ内アンカー `#corporate-sales` で該当セクションへスクロール
- ヘッダーナビに「法人セールスはこちら」ボタン追加

**メリット**: 既存LPを大きく変えず実装可能、即着手可
**デメリット**: 専用LP感は出ない、SNSマーケ情報が混在し続ける

### Option B: 法人セールス専用LP（中長期）

LP-A / LP-B とは別に `/recruit/corporate-sales` 等のURLで専用ページ。

**メリット**: 完全集中、メッセージマッチ最高、CVR最大化
**デメリット**: 制作工数（1-2週間）、配信開始の遅れ

→ **Sprint 1〜2 は Option A で開始、データ取れたら Option B 検討**

## 3. Option A の実装仕様

### 3.1 URL パラメータ

```
https://recruit-se01.let-inc.net/?role=corp-sales&utm_*...&exp_id=...&lp_id=lp-a

→ ?role= の値で挙動切替
  - role=corp-sales (法人セールス)  → 動的FV + アンカー誘導
  - role=marketing  (SNSマーケ)    → 既存FV
  - role=cmo                       → 動的FV
  - role 未指定                    → 既存FV
```

### 3.2 動的FV コピー差替

法人セールス流入時のFV:

```
キャッチ:   時代に乗るな。時代を作れ。
サブ:       建設業の未来を、共に変える法人セールスへ。  ← ★差替部分
タグ:       SNSマーケ｜CMO候補｜【コーポレートセールス】 ← ★該当を強調
CTA:        コーポレートセールスの詳細を見る ↓        ← ★差替
            （クリックで #corporate-sales へスクロール）
SCROLL
```

実装イメージ（Next.js / React の場合）:

```tsx
// app/page.tsx の FV コンポーネント擬似コード
'use client'
import { useSearchParams } from 'next/navigation'

export default function HeroFV() {
  const params = useSearchParams()
  const role = params.get('role')
  
  const subCopy = role === 'corp-sales'
    ? '建設業の未来を、共に変える法人セールスへ。'
    : '建設業の未来を、共に変える仲間へ。'
  
  const ctaText = role === 'corp-sales'
    ? 'コーポレートセールスの詳細を見る'
    : '詳しく見る'
  
  const ctaAnchor = role === 'corp-sales' ? '#corporate-sales' : '#about'
  
  return (
    <section>
      <h1>時代に乗るな。時代を作れ。</h1>
      <p>{subCopy}</p>
      <a href={ctaAnchor} className="cta">{ctaText}</a>
    </section>
  )
}
```

### 3.3 コーポレートセールス専用セクション内容

LP-A / LP-B どちらにも追加（id="corporate-sales"）:

```
┌─────────────────────────────────────────────┐
│ id="corporate-sales"                          │
│                                               │
│ ROLE / コーポレートセールス                    │
│                                               │
│ OVERVIEW / 業務概要                           │
│ 建設業の中小〜大手企業に対し、HR×AI×MARKETING │
│ ソリューションを提案する法人営業職。           │
│ 採用ブランディング・SNS運用・AI業務効率化等の  │
│ 商材を、経営層・人事責任者へ提案・受注する。   │
│                                               │
│ DUTIES / 具体的な業務内容                     │
│ ・新規開拓 / リード対応                       │
│ ・経営層・人事責任者への提案                  │
│ ・受注後のディレクション（プロジェクト立上げ） │
│ ・既存顧客のアップセル / クロスセル           │
│ ・営業数値の可視化・KPI設計                   │
│                                               │
│ PERSONA / 求める人物像                        │
│ ・業界変革に本気で挑みたい人                  │
│ ・数字に強く、自走できる人                    │
│ ・経営目線で考えられる人                      │
│                                               │
│ MUST / 必須要件                               │
│ ・法人営業経験 2年以上                        │
│                                               │
│ WELCOME / 歓迎要件                            │
│ ・SaaS / 人材 / 広告 / 商社 / メーカー営業経験 │
│ ・マーケティング関係企業出身                   │
│ ・テレアポ経験者                               │
│ ・マネジメント経験                             │
│                                               │
│ EMPLOYMENT / 雇用形態                         │
│ 正社員（試用期間3ヶ月）                       │
│                                               │
│ SALARY / 給与                                 │
│ 月給30万円〜＋賞与（規定あり）                │
│ 年収例: 400万円〜800万円                      │
│                                               │
│ DAILY SCHEDULE / 1日のスケジュール（例）       │
│ 9:00  出社・MTG・営業数値確認                 │
│ 10:00 アポイント獲得活動 / 提案資料作成       │
│ 12:00 ランチ                                  │
│ 13:00 クライアント訪問・オンライン商談         │
│ 16:00 提案フォロー・社内ディレクション         │
│ 17:30 翌日準備・チーム振り返り                │
│ 18:00 退社                                    │
│                                               │
│ [LINEで応募する] ← 大きめCTA                  │
│                                               │
└─────────────────────────────────────────────┘
```

### 3.4 ヘッダーナビの追加

既存ナビに「コーポレートセールス」リンク追加:

```html
<nav>
  <a href="#about">ABOUT</a>
  <a href="#work">WORK</a>
  <a href="#corporate-sales">コーポレートセールス</a>  <!-- 追加 -->
  <a href="#culture">CULTURE</a>
  <a href="#entry">ENTRY</a>
</nav>
```

### 3.5 計測連動

GTM トリガーに以下を追加:

| イベント | 発火条件 |
|---|---|
| `view_corp_sales_section` | 該当セクション 50% スクロール |
| `click_corp_sales_cta` | セクション内 CTA タップ |
| `click_corp_sales_line` | LINE 友だち追加ボタンタップ（lp_id 付与） |

これにより「LP遷移→該当セクション到達→LINE誘導」のファネルを GA4 / Pixel で計測可能に。

## 4. 実装スケジュール（最速）

| Day | アクション | 担当 | 所要 |
|---|---|---|---|
| D-5 (5/26火) | コーポレートセールス専用セクションのコピー確定 | Marketing + ユーザー | 2h |
| D-5 (5/26火) | 動的FV のスペック確定 | Engineer | 1h |
| D-4 (5/27水) | LP-A / LP-B にセクション追加実装 | Engineer | 4-6h |
| D-3 (5/28木) | 動的FV 実装 + URL パラメータ対応 | Engineer | 2-4h |
| D-2 (5/29金) | GTM トリガー追加・計測テスト | Engineer + Data Analyst | 2h |
| D-1 (6/01月) | QA・実機確認（PC/スマホ各種） | QA Engineer | 2h |
| 6/02火 | ステージング→本番デプロイ | Engineer | 1h |
| **6/03水** | **配信開始時に間に合う** | - | - |

合計工数: 約14-20h（Engineer 2-3日相当）

## 5. CRTV側の対応

CRTV から LP へのリンク URL に `?role=corp-sales` を含める:

```
LP-A 行き:
https://recruit-se01.let-inc.net/?role=corp-sales
&utm_source=tt
&utm_medium=paid-social
&utm_campaign=tt_eigyo_osaka-city_cv_202606_001
&utm_content=ugc_c001_a
&utm_term=smart-audience_h1-salary_m
&exp_id=EXP-20260525-001
&lp_id=lp-a

LP-B 行き:
https://recruit-se02.let-inc.net/?role=corp-sales
&utm_source=tt
&utm_medium=paid-social
&utm_campaign=tt_eigyo_osaka-city_cv_202606_001
&utm_content=ugc_c005_a
&utm_term=smart-audience_h2-growth_m
&exp_id=EXP-20260525-001
&lp_id=lp-b
```

媒体側マクロを使えば自動展開:
- Meta: `?role=corp-sales&utm_source=meta&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}&exp_id=EXP-20260525-001&lp_id=lp-a`
- TikTok: 同様

## 6. 配信前チェックリスト（LP側）

- [ ] `#corporate-sales` セクションが両LPに存在
- [ ] URL `?role=corp-sales` でFV切替動作確認
- [ ] スクロール時にスムーズに該当セクションへ
- [ ] LINE誘導CTA（`lin.ee/QlrbDga` / `Qmxrf8O`）が正しく分岐
- [ ] Meta Pixel `view_corp_sales_section` 発火確認
- [ ] TikTok Pixel 同上
- [ ] LINE Tag 同上
- [ ] スマホ実機（iOS/Android）で確認
- [ ] PageSpeed Insights LCP < 2.5秒 維持

## 7. 配信中・配信後のチェック

- LP→該当セクション到達率（GA4）
- CTAクリック率
- LINE誘導クリック率
- 流入元LP（A vs B）別の上記指標
- セクション到達後の離脱率

これにより「LP内コンテンツが法人セールス志望者の意思決定に効いているか」を判定可能。

## 8. Sprint 2 以降の発展

データ次第で:
- 専用LP（Option B）への昇格判断
- セクション内の動画埋込（社員インタビュー）
- 「平均年収例」「採用人数達成状況」のリアルタイム表示
- LP内チャットボット導入
