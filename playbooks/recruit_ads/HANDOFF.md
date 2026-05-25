# 採用広告プレイブック - 引継ぎドキュメント（HANDOFF）

> このドキュメントを読めば、新しいチームメンバー or 新しい Claude セッションがゼロから状況を把握できる。
> **新規リポジトリへの移行用マスタードキュメント**。
> 最終更新: 2026-05-25

---

## このドキュメントの目的

採用広告事業（SNS広告で求人応募を獲得し、エリア×業種で方程式化する）の全文脈・全成果物を、新規リポジトリへ完璧に引き継ぐためのマスター文書。

新規リポジトリで作業を始める人（または新しい Claude セッション）はこのドキュメントを最初に読むこと。

## 1. プロジェクトの全体像

### 事業目的
SNS広告（Meta / TikTok / LINE 等）で求人応募を獲得する手法を**エリア × 業種ごとに方程式化**し、誰でも再現できるノウハウとしてまとめる。

### 戦略階層
```
[実験(EXP)] が積み重なって
   ↓
[インスティンクト] が確立し
   ↓ confidence ≥ 0.7
[方程式(F-{area}-{industry})] が完成する
```

3-6ヶ月で 30本の方程式蓄積が目標。

### 最初の本番案件
**株式会社LET 自社採用 - 法人セールス職**（大阪市中央区・3名増員・年収400-800万）

これを Sprint 1（2026-06-03 配信開始想定）として実行し、汎用プレイブックを実戦で叩いて磨く。

## 2. リポジトリ構成（全ファイル一覧）

```
playbooks/recruit_ads/
├── README.md                          全体俯瞰
├── HANDOFF.md                         このファイル
│
├── 00_strategy/                       戦略・原則
│   ├── experiment_framework.md       実験設計の原則
│   ├── naming_conventions.md         命名規則 ★必読
│   └── kpi_definitions.md            KPI 辞書
│
├── 01_platforms/                      媒体別ガイド
│   ├── meta.md                       Facebook / Instagram
│   ├── tiktok.md                     TikTok For Business
│   └── line.md                       LINE Ads
│
├── 02_creative/                       クリエイティブ
│   ├── hook_patterns.md              業種×ペルソナ別フック集
│   └── lp_templates.md               求人LP雛形
│
├── 03_targeting/                      ターゲティング
│   ├── area_segments.md              エリアコード辞書
│   └── industry_personas.md          14ペルソナ（P-eigyo-02 含む）
│
├── 04_measurement/                    計測
│   ├── tracking_setup.md             Pixel/Tag/CAPI/GA4設定
│   ├── utm_conventions.md            UTM規約
│   └── data_pipeline.md              媒体API→Sheets→Looker Studio 設計
│
├── 05_experiments/                    実験管理
│   ├── experiment_register.csv       全実験マスタ
│   ├── experiment_template.md        テンプレ
│   └── experiments/
│       ├── EXP-20260525-001.md       LET法人セールス×TikTok×6訴求軸（v2）
│       ├── EXP-20260525-002.md       LET法人セールス×Meta×静止画3形式
│       └── EXP-20260525-003.md       LET法人セールス×LINE Ads
│
├── 06_formulas/                       方程式
│   ├── formula_template.md           方程式テンプレ
│   └── formulas/                     （配信後に蓄積）
│
├── 07_runbook/                        運用手順
│   ├── quickstart.md                 30分で1キャンペーン
│   ├── weekly_optimization.md        週次最適化
│   └── sprint_7day.md                7日スプリント運用
│
├── 08_intake/                         案件オンボーディング
│   ├── intake_template.md            起票テンプレ
│   └── data_sharing_guide.md         データ共有ガイド
│
└── clients/                           案件別フォルダ
    └── let/                          ★ 株式会社LET 本番案件
        ├── README.md                  案件概要
        ├── intake.md                  募集要項・既存資産・進捗ログ
        ├── data/
        │   └── lps/
        │       ├── lp-a.html         LP-A HTML スナップショット
        │       ├── lp-b.html         LP-B HTML スナップショット
        │       └── lp_analysis.md    LP内容分析・タグ未設置検出
        ├── assets/                    撮影済素材配置先
        └── output/
            ├── phase1_strategy.md     Phase 1 戦略案
            ├── sprint_calendar.md     Sprint 1-4 カレンダー
            ├── data_pipeline_let.md   GTM/Pixel/Notion/Looker Studio 手順
            ├── notion_db_schema.md    Notion DB スキーマ
            ├── sheets_formulas.md     Sheets QUERY 関数集
            ├── crtv_brief_sprint1.md         CRTV 12本ブリーフ
            ├── crtv_brief_sprint1_variants.md CRTV A/B/C コピー集
            └── lp_corp_sales_section.md      LP法人セールス専用セクション設計

learnings/instincts/
└── recruit_ads.json                   採用広告ドメインのインスティンクト
                                       （初期8件、配信後に蓄積）

design-md/feer/DESIGN.md               和文B2B のデフォルトデザイン基準
                                       （LET案件で参照）

design-md/motion-library/MOTION_30.md  モーションライブラリ
```

## 3. プロジェクト経緯（重要な決定一覧）

時系列の主要決定:

### 2026-05-25 セッション
1. **採用広告プレイブック新設**: `/playbooks/recruit_ads/` 全骨組み構築（戦略・命名規則・KPI・媒体別・LP・計測・実験管理・方程式・運用）
2. **株式会社LET 自社採用案件着手**: 法人セールス職を題材に
3. **LP 2本受領・分析**:
   - LP-A (recruit-se01.let-inc.net) / LP-B (recruit-se02.let-inc.net)
   - 両LPとも3職種混在の汎用採用ページ
   - メインキャッチ: 「時代に乗るな。時代を作れ。」/「建設業の未来を、共に変える仲間へ。」
   - ポジショニング: HR × AI × MARKETING で建設業の人手不足を根本解決
   - **重大発見**: Meta/TikTok/LINE Pixel 未設置（GA4のみ別ID2系統）→ 配信前に GTM 経由で設置必須
4. **JD 確定**:
   - 採用人数 3名（増員）
   - 必須要件: 法人営業経験2年以上
   - 歓迎要件: マーケ出身者・テレアポ経験者・法人営業全般
   - 年収 400-800万 / 月給 30万〜 + 賞与
   - 大阪市中央区南久宝寺町 IB CENTERビル8F
   - リモート不可・出張あり
5. **ペルソナ転換**: P-eigyo-01（異業種転職）→ **P-eigyo-02（法人営業経験者中堅転職25-40）**
6. **訴求軸再構成**: 当初4軸 → 6軸（H1/H2/H3/H5/H6/H7）に拡張。H4働き方は経験者層に弱いため Sprint 1 除外
7. **7日スプリント運用設計**: CRTV検証回転重視（月予算5万円・統計的方程式化は到達しない前提）
8. **データ連携設計**: Phase 1（Sheets+Looker Studio無料） / Phase 2（API半自動）/ Phase 3（BQ自動）
9. **既存資産確定**: 媒体アカウント3つ全あり / 撮影素材済 / 公式LINE 1個（友だち追加URL 2本で流入元LP判別可能）
10. **応募管理**: Notion DB 推奨（スキーマ確定）

## 4. 現在の状態

### Done
- [x] プレイブック全骨組み（汎用部分）
- [x] LET 案件 intake 完了
- [x] LP分析・タグ未設置検出
- [x] Phase 1 戦略案
- [x] CRTV ブリーフ 12本 + A/B/C バリアント + 経験職種別追加弾（c013-c015）
- [x] EXP-001/002/003 起票
- [x] Sprint 1-4 カレンダー
- [x] Notion DB スキーマ
- [x] Sheets QUERY 関数集
- [x] LP法人セールス専用セクション設計
- [x] Data Pipeline 設計（汎用 + LET向け）

### TODO（手作業のみ残）

#### 配信開始までに必須（D-7 〜 D-1 = 5/26 〜 6/02）
- [ ] **GTM コンテナ作成・両LPに設置**（Engineer / 工数 2h）
- [ ] **Meta Pixel ID / TikTok Pixel ID / LINE Tag ID 取得**（Ad Ops / 30min ずつ）
- [ ] **GTM 経由で Pixel タグ配置**（Engineer / 2-4h）
- [ ] **LP-A/B に コーポレートセールス専用セクション + 動的FV 実装**（Engineer / 8-12h）
- [ ] **撮影済素材を `clients/let/assets/` に配置**（ユーザー / 30min）
- [ ] **CRTV 12本制作**（Content Creator / Day 1 集中 8-12h）
- [ ] **Notion DB 構築**（ユーザー / 2h）
- [ ] **Google Sheets 集計シート作成**（Data Analyst / 1h）
- [ ] **Looker Studio ダッシュボード雛形**（Data Analyst / 2h）
- [ ] **Legal 募集要項・CRTV NG表現チェック**（Legal / 2h）
- [ ] **媒体アカウント権限付与**（ユーザー → 運用担当 / 30min）

#### 配信中・配信後（Sprint 1 = 6/03 〜 6/09）
- [ ] 配信モニタ・低パフォーマンス停止判断
- [ ] Day 5 中間スクリーニング
- [ ] Day 6 勝ち弾予算+20%
- [ ] Day 7 終了・データ集計
- [ ] レトロ実施
- [ ] instincts.json 更新

## 5. 未確定・要確認事項

- ユーザー側で確認が必要な細目（あれば intake.md に追記）:
  - 採用人数達成期日（具体的な月）
  - 撮影済素材の数量・形式・尺
  - GA4 既存2プロパティ（G-FMWMLCKLRZ / G-K2WV422BN8）の統合方針
  - 公式LINE 自動応答 / リッチメニューの現状設定
  - 採用済社員1-2名へのヒアリング可否（CRTV ストーリー強化）

## 6. KPI と目標

### Sprint 1 目標
- 投入CRTV 12本
- TikTok Hook率 12%+
- Meta CTR 1.2%+
- LINE友だち追加 8-15件
- 有効応募 3-7件
- 応募CPA 3,500-6,000円

### 月次目標
- 投入CRTV総数 30-40本
- 採用 0.3-1名（月予算5万円縛り）
- 月次インスティンクト追加 3-5件

### 卒業条件（方程式化に向けて）
- 訴求軸ごと confidence 0.7+ が3軸以上
- 月予算10万円超に拡張
- CPH レンジ収束（変動係数 < 30%）
→ `06_formulas/formulas/F-osaka-city-eigyo.md` 起票

## 7. 重要な原則（CLAUDE.md からの抜粋）

### 命名規則（絶対遵守）
```
Campaign: {MEDIA}_{INDUSTRY}_{AREA}_{OBJECTIVE}_{YYYYMM}_{SEQ}
Ad Set:   {TARGETING}_{HOOK}_{AUDIENCE-SIZE}
Ad:       {CRTV-FORMAT}_{CRTV-ID}_{COPY-VARIANT}
UTM:      utm_source / medium / campaign / content / term + exp_id / lp_id 必須
```

### 法令遵守（職業安定法・労基法・男女雇用機会均等法）
NG: 「絶対」「100%」「No.1」「明るい人」「年齢限定」「性別限定」（例外要件除く）
必須: 給与は内訳明示、「年収例」表記、固定残業代の明示

### TDDワークフロー（実装系）
- RED → GREEN → REFACTOR
- カバレッジ 80%+

### 計測の絶対要件
- Pixel + CAPI セット運用（iOS規制対応）
- Offline Conversion Upload で採用最適化
- UTM 全パラメータ必須

## 8. 関連エージェント（CLAUDE.md 組織図より）

### 主要担当
- **Marketing**: 戦略・媒体配分・予算設計
- **Ad Operations**: 媒体運用・入札・予算消化管理
- **Content Creator**: CRTV制作（動画・静止画・コピー）
- **Designer / Engineer**: LP・フォーム実装
- **Data Analyst**: 実験ログ統計検定・方程式抽出
- **KPI Dashboard**: 横断KPI集計・異常検知
- **Legal**: 募集要項・CRTV法令チェック
- **Devil's Advocate**: 大型予算投下前の批判的レビュー
- **QA Reviewer**: 全出力品質検証
- **Project Manager**: スプリント進捗管理
- **Retriever**: Notion DB → 構造化（応募データ取り込み）

新規リポジトリでもこれらの役割は人 or AI で分担すること。

## 9. 新規リポジトリへの移行手順

### Option A: agents リポジトリの該当箇所をコピー（推奨）

このリポジトリ（`eijiyoshikawa/agents`）の以下をクローン or コピー:

```
playbooks/recruit_ads/    （全体）
learnings/instincts/recruit_ads.json
design-md/feer/DESIGN.md  （参考としてコピー or リンク）
design-md/motion-library/MOTION_30.md
```

移行スクリプト: 本リポジトリの `playbooks/recruit_ads/migrate_to_standalone.sh` を実行。

### Option B: ゼロから新規リポジトリ作成

```bash
# 1. 新規リポジトリ作成
mkdir let-recruit-ads
cd let-recruit-ads
git init

# 2. 旧リポジトリから関連ファイルをコピー
cp -r /path/to/agents/playbooks/recruit_ads ./
cp /path/to/agents/learnings/instincts/recruit_ads.json ./learnings/instincts/
cp -r /path/to/agents/design-md/feer ./design-md/feer
cp -r /path/to/agents/design-md/motion-library ./design-md/motion-library

# 3. CLAUDE.md（本リポジトリ用）作成
# → migrate_to_standalone.sh が STANDALONE_CLAUDE.md として生成

# 4. README.md 作成
# → migrate_to_standalone.sh が STANDALONE_README.md として生成

# 5. 初期コミット
git add .
git commit -m "init: import recruit_ads playbook from agents repo"

# 6. リモート設定
gh repo create eijiyoshikawa/let-recruit-ads --private
git push -u origin main
```

詳細は `MIGRATION_GUIDE.md` 参照。

## 10. 新規リポジトリで Claude を再開する手順

新規リポジトリで Claude セッションを始めた時の最初の発話:

```
このリポジトリは playbooks/recruit_ads/HANDOFF.md を読んでください。
これまでの経緯と現在の状態が全部書いてあります。
本日の作業は ____ から始めたいです。
```

Claude は HANDOFF.md → intake.md → 関連戦略文書を順に読んで状況把握 → 作業継続。

## 11. 緊急時の連絡先・参考リンク

- ユーザー: eiyoshi99@gmail.com（株式会社LET 関係者）
- 元リポジトリ: `eijiyoshikawa/agents`
- 作業ブランチ: `claude/optimistic-faraday-RKPlx`
- LP-A: https://recruit-se01.let-inc.net/
- LP-B: https://recruit-se02.let-inc.net/
- LINE 公式アカウント: 1個（friend-add URLs: lin.ee/QlrbDga / lin.ee/Qmxrf8O）

---

## 12. 1分サマリ（最重要）

**何をやってる**: 株式会社LET 自社採用の法人セールス3名増員を、SNS広告（TikTok主軸+Meta補助+LINE Ads）で月5万円・7日スプリントで攻める。CRTV検証回転重視。

**現在地**: 配信開始 2026-06-03 予定。準備物は紙ベースで全て揃った。残るは Engineer の LP タグ追加・専用セクション実装、Content Creator の CRTV 12本制作、ユーザー側 Notion DB 構築・媒体アカウント権限付与。

**核となる訴求**: H7（HR×AI×MARKETING商材力）+ H5（建設業×AI社会課題）が経験者層に最強と仮説。給与単独訴求は副次的。

**KPI**: 7日で 12 CRTV を回し、訴求軸の勝ち負け2軸ずつ確定。Sprint 2 で勝ち軸深掘り。

**最終ゴール**: confidence 0.7+ インスティンクトを積み上げて、`F-osaka-city-eigyo.md` 方程式v1.0 を3-6ヶ月で完成させる。
