# 採用広告プレイブック - LET 法人セールス案件

SNS広告（Meta / TikTok / LINE）で求人応募を獲得する手法を**エリア × 業種ごとに方程式化**する独立プレイブックリポジトリ。

第一弾案件として **株式会社LET 法人セールス3名増員**（大阪市中央区・年収400-800万）を題材に、7日スプリントで CRTV 検証を回転させながらノウハウを蓄積する。

## クイックスタート

新規参加者・新規 Claude セッションの方は以下の順に読むこと:

1. **`HANDOFF.md`** ← まずこれ（全文脈・現在地・残タスク）
2. **`clients/let/intake.md`** ← LET案件の詳細
3. **`docs/00_strategy/experiment_framework.md`** ← 実験設計の原則
4. **`docs/07_runbook/sprint_7day.md`** ← 7日スプリント運用

## 構造

```
.
├── HANDOFF.md                          引継ぎマスター文書 ★最初に読む
├── MIGRATION_GUIDE.md                  リポジトリ移行履歴・手順
├── README.md                           このファイル
├── CLAUDE.md                           Claude 用コンテキスト
│
├── docs/                               汎用ドキュメント
│   ├── 00_strategy/                   戦略・命名規則・KPI ★必読
│   ├── 01_platforms/                  Meta / TikTok / LINE 媒体別ガイド
│   ├── 02_creative/                   フック集・LP雛形
│   ├── 03_targeting/                  エリア・ペルソナ辞書
│   ├── 04_measurement/                Pixel/Tag/CAPI/データパイプ設計
│   ├── 07_runbook/                    運用手順 (quickstart / weekly / sprint_7day)
│   └── 08_intake/                     案件オンボーディング
│
├── experiments/                        実験管理
│   ├── register.csv                   全実験マスタ
│   ├── template.md                    起票テンプレ
│   └── logs/                          個別実験ログ
│
├── formulas/                           エリア×業種別方程式（配信後に蓄積）
│
├── clients/                            案件別フォルダ
│   └── let/                           株式会社LET 自社採用 ★本番案件
│       ├── README.md
│       ├── intake.md
│       ├── data/                      受領データ（LP/応募/競合）
│       ├── assets/                    素材
│       └── output/                    戦略・カレンダー・CRTV ブリーフ・スキーマ
│
├── learnings/
│   └── instincts/
│       └── recruit_ads.json           インスティンクト（学習済みパターン）
│
└── design-references/                  デザイン参照
    ├── feer/                          和文B2B デフォルト基準
    └── motion-library/                モーションライブラリ
```

## 担当役割

| 役割 | 主な仕事 |
|---|---|
| **Marketing** | 戦略・媒体配分・予算設計・仮説起票 |
| **Ad Operations** | 媒体運用・入札・予算消化管理 |
| **Content Creator** | CRTV制作（動画・静止画・コピー） |
| **Designer / Engineer** | LP・フォーム・タグ実装 |
| **Data Analyst** | 実験ログ統計検定・方程式抽出 |
| **Legal** | 募集要項・CRTV法令チェック |
| **PM** | スプリント進捗管理 |

## いま何をやっているか

**株式会社LET 法人セールス3名増員 - Sprint 1**

- 配信期間: 2026-06-03（水）〜 2026-06-09（火）
- 月予算: 50,000円（TikTok 60% / Meta 30% / LINE Ads 10%）
- CRTV 12本 + A/B/C バリアント（経験職種別追加弾含む）
- 訴求軸6種比較: H1給与 / H2成長 / H3裁量 / H5社会課題 / H6スピード / H7商材力
- LP-A / LP-B 既存活用、コーポレートセールス専用セクション追加予定
- 応募管理: Notion DB
- 集計: Google Sheets + Looker Studio（Phase 1）

詳細は `clients/let/output/phase1_strategy.md` と `clients/let/output/sprint_calendar.md` 参照。

## 7日スプリントの基本サイクル

```
火 Day0  : 前週レトロ + 新仮説起票 + CRTVブリーフ作成
水 Day1  : CRTV 6-12本制作 → 媒体投入
水夜     : 配信開始
木金土日 : 触らない（学習期）/ Day5土に明らかな負け弾だけ停止
月 Day6  : 中間レビュー、勝ち弾予算+20%
火朝 Day7: 配信終了 → 次サイクル
```

詳細: `docs/07_runbook/sprint_7day.md`

## 方程式化への道筋

```
1実験 (EXP-YYYYMMDD-XXX) で発見
   ↓ register.csv 起票
3実験で再現 → confidence ≥ 0.7
   ↓ learnings/instincts/recruit_ads.json
方程式 v1.0 (F-{area}-{industry}.md)
   ↓ formulas/ 起票
誰でも使える資産化
```

目標: 3-6ヶ月で 30本の方程式蓄積。

## 法令遵守

職業安定法・労基法・男女雇用機会均等法・個情法を必ず遵守。NG表現は `docs/02_creative/hook_patterns.md` セクション4を参照。

## ライセンス・機密

- 内部ノウハウ・案件データを含む **private リポジトリ**
- PII（応募者情報）は Notion DB側で管理、本リポジトリには非含
- 媒体認証情報は 1Password 等の Secret Manager

## 連絡先・関連

- 元リポジトリ: `eijiyoshikawa/agents`（採用広告プレイブックの初版作成元）
- 株式会社LET LP-A: https://recruit-se01.let-inc.net/
- 株式会社LET LP-B: https://recruit-se02.let-inc.net/

---

**現在の進捗・残タスクは必ず `HANDOFF.md` で確認すること**。
