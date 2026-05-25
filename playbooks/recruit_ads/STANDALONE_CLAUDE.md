# CLAUDE.md - 採用広告プレイブック（独立リポジトリ版）

このリポジトリでの Claude セッションの初期コンテキスト。

## プロジェクト

SNS広告（Meta / TikTok / LINE）で求人応募を獲得する手法を**エリア × 業種ごとに方程式化**する独立プレイブック。

第一弾本番案件: **株式会社LET 法人セールス3名増員**（大阪市中央区・年収400-800万・経験2年〜）

## まずやること

新規セッションでは以下を必ず最初に読むこと:

1. **`HANDOFF.md`** ← 全文脈・現在地・残タスク。**最優先**
2. **`clients/let/intake.md`** ← LET案件の最新状態
3. **`experiments/register.csv`** ← 全実験の状態

これだけで状況把握完了。HANDOFF.md は毎スプリント末に更新される。

## ディレクトリ

```
docs/                       汎用ドキュメント（戦略・命名規則・KPI・媒体別・LP・計測・運用）
experiments/                実験管理（register.csv + logs/EXP-XXX.md）
formulas/                   方程式（蓄積後）
clients/let/                LET 本番案件
learnings/instincts/        インスティンクト（学習済みパターン）
design-references/          デザイン参照（feer / motion-library）
```

## 開発標準

### 命名規則（絶対遵守）
```
Campaign: {MEDIA}_{INDUSTRY}_{AREA}_{OBJECTIVE}_{YYYYMM}_{SEQ}
Ad Set:   {TARGETING}_{HOOK}_{AUDIENCE-SIZE}
Ad:       {CRTV-FORMAT}_{CRTV-ID}_{COPY-VARIANT}
UTM:      utm_source / medium / campaign / content / term + exp_id / lp_id 必須
```

### 法令遵守（職業安定法・労基法・男女雇用機会均等法）
**NG表現**: 「絶対」「100%」「No.1」「明るい人」「年齢限定」「性別限定」（例外要件除く）
**必須**: 給与は内訳明示、「年収例」表記、固定残業代の明示

### 配信前の絶対チェック
- [ ] 命名規則準拠
- [ ] UTM 全パラメータ + exp_id + lp_id
- [ ] Pixel + CAPI 両方設置
- [ ] Legal 募集要項・CRTV NG表現チェック完了
- [ ] LP メッセージマッチ
- [ ] Offline Conversion Upload 設定

## 7日スプリント運用

```
火 Day0  : レトロ + 仮説起票 + CRTV ブリーフ
水 Day1  : CRTV 6-12本制作 + 媒体投入
水夜     : 配信開始
木金土日 : 触らない（学習期）/ Day5 中間スクリーニング
月 Day6  : 中間レビュー、勝ち弾予算+20%
火朝 Day7: 配信終了 → 次サイクル
```

詳細: `docs/07_runbook/sprint_7day.md`

## デザインベースライン

和文B2B案件は `design-references/feer/DESIGN.md` をデフォルト基準。
モーションは `design-references/motion-library/MOTION_30.md` の `motion_key` を引用。

## トーン・スタイル

- 文書は構造化・テーブル多用・行数は最低限
- コメントは「なぜ」のみ、自明な「何」は書かない
- 日付は YYYY-MM-DD 形式
- 数値・予算は明示
- 法令配慮は常に最優先

## 進捗の更新ルール

- スプリント末に **HANDOFF.md セクション3「プロジェクト経緯」と セクション4「現在の状態」を更新**
- `clients/let/intake.md` の進捗ログを毎回追記
- `experiments/register.csv` に新EXP起票・結果記入
- 確立されたパターンは `learnings/instincts/recruit_ads.json` に追加

## ガバナンス

- PII（応募者情報）は Notion DB管理、リポジトリには非含
- 認証情報・APIキーは 1Password、リポジトリにコミットしない
- 媒体アカウント・LP更新権限は最小権限原則
- 本リポジトリは **private**

## ゴール

3-6ヶ月で **30本の方程式（F-{area}-{industry}.md）** を蓄積。
誰でも `clients/{新案件}/intake.md` を起票し、該当方程式をコピーすれば配信に入れる状態が完成形。

---

**最新の作業文脈は必ず `HANDOFF.md` を確認すること**。
