# 採用広告プレイブック（Recruit Ads Playbook）

SNS広告（Meta / TikTok / LINE 等）で求人応募を獲得するための、実験設計から方程式化までの一気通貫ナレッジベース。

## このプレイブックの目的

1. **再現性ある実験基盤**: 命名規則・KPI定義・計測タグを揃えて、誰がやっても比較可能な実験を回す
2. **エリア × 業種の方程式化**: 100本以上の実験ログから、勝ちパターンを「方程式」として抽出
3. **誰でも実行可能なRunbook**: 経験ゼロでも `07_runbook/quickstart.md` から走り出せる

## 全体構造

```
playbooks/recruit_ads/
├── README.md                       # このファイル
├── 00_strategy/                    # 戦略・原則
│   ├── experiment_framework.md     # 実験設計の原則（仮説→KPI→検証）
│   ├── naming_conventions.md       # キャンペーン階層の命名規則 ★必読
│   └── kpi_definitions.md          # CPM/CPC/CTR/CVR/CPA/有効応募率/採用CPA
├── 01_platforms/                   # 媒体別ガイド
│   ├── meta.md                     # Facebook / Instagram
│   ├── tiktok.md                   # TikTok For Business
│   └── line.md                     # LINE広告
├── 02_creative/                    # クリエイティブ
│   ├── hook_patterns.md            # フック・訴求パターン集（業種別）
│   └── lp_templates.md             # 求人LP雛形（フォーム最適化）
├── 03_targeting/                   # ターゲティング
│   ├── area_segments.md            # エリア区切り（駅・通勤圏・都道府県）
│   └── industry_personas.md        # 業種別ペルソナ
├── 04_measurement/                 # 計測
│   ├── tracking_setup.md           # Pixel / Tag / CAPI / GA4 設定
│   └── utm_conventions.md          # UTM 命名規則 ★必読
├── 05_experiments/                 # 実験管理
│   ├── experiment_template.md      # 1実験あたりのテンプレート
│   ├── experiment_register.csv     # 全実験の一覧マスタ
│   └── experiments/                # 個別実験ログ（EXP-YYYYMMDD-XXX.md）
├── 06_formulas/                    # 方程式（エリア × 業種）
│   ├── formula_template.md         # 方程式テンプレート
│   └── formulas/                   # エリア×業種別の方程式（F-{area}-{industry}.md）
├── 07_runbook/                     # 運用手順
│   ├── quickstart.md               # 30分で1キャンペーン立ち上げ
│   └── weekly_optimization.md      # 週次最適化チェックリスト
├── 08_intake/                      # 案件オンボーディング
│   ├── intake_template.md          # 新規案件の起票テンプレ
│   └── data_sharing_guide.md       # データ共有の方法・形式 ★案件開始前必読
└── clients/                        # 案件別フォルダ
    └── {client_name}/
        ├── README.md
        ├── intake.md               # intake_template からコピー
        ├── data/                   # 受領データ（カテゴリ別サブフォルダ）
        ├── assets/                 # 素材（大容量はDrive）
        └── output/                 # 生成物（戦略案・実験ログ等）
```

### 現在進行中の案件
- `clients/let/` — 株式会社LET 自社採用広告（intake 中）

## 担当エージェント

| エージェント | 役割 |
|---|---|
| Marketing | 全体戦略・媒体配分・予算設計 |
| Ad Operations | 媒体運用・入札・予算消化管理 |
| Content Creator | クリエイティブ（動画・静止画・コピー）制作 |
| Designer / Engineer | 求人LP・フォーム実装 |
| Data Analyst | 実験ログの統計検定・方程式抽出 |
| KPI Dashboard | 横断KPI集計・異常検知 |
| Legal | 募集要項の法令チェック（職業安定法・労基法・男女雇用機会均等法等） |
| Devil's Advocate | 大型予算投下前の批判的レビュー |

## ノウハウ蓄積の流れ

```
[実験計画] experiment_template.md でEXP-IDを発行
   ↓
[実験実行] register.csv に1行追加 + experiments/EXP-XXX.md に詳細記録
   ↓
[結果記録] CPA/CVR/応募数/採用率を experiments/EXP-XXX.md に追記
   ↓
[パターン抽出] 3回以上同方向で再現 → learnings/instincts/recruit_ads.json に登録
   ↓
[方程式化] confidence ≥ 0.7 → formulas/F-{area}-{industry}.md に昇格
   ↓
[誰でも使える] quickstart.md から方程式を参照して再現
```

## 最初に読む3ファイル

1. `00_strategy/experiment_framework.md` — どう実験を設計するか
2. `00_strategy/naming_conventions.md` — 命名を揃えないと方程式化できない
3. `07_runbook/quickstart.md` — 手を動かす手順

## ステータス

- 初期構築: 2026-05-25
- 対象媒体: Meta / TikTok / LINE（順次拡張: YouTube Shorts / X / Indeed等）
- 蓄積中の方程式: 0本（目標: 6ヶ月で30本）
