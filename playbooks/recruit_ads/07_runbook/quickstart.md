# Quickstart — 30分で1キャンペーン立ち上げ

経験ゼロでも手順通り進めれば配信開始まで到達する手順書。

## 前提

- 媒体アカウント（Meta / TikTok / LINE のいずれか）開設済
- 求人LPが存在する（無ければ `02_creative/lp_templates.md` から雛形作成）
- 計測タグ設置済（`04_measurement/tracking_setup.md`）
- 募集要項の Legal チェック済

## STEP 1: 方程式の確認（5分）

担当する案件の **業種・エリア** を確認 → `06_formulas/formulas/` で該当方程式を探す。

- 方程式が **ある** → そのままコピーして使う（最高速）
- 方程式が **ない** → 隣接エリア・同業種の方程式を参照 + Phase 1 探索として起票

```
例: 介護 × 千葉北 担当
  → F-chiba-north-kaigo.md があれば使用
  → なければ F-saitama-south-kaigo.md を参考（隣接県・同業種）
  → どちらもなければ kpi_definitions.md の業種別 CPA 目安から仮設定
```

## STEP 2: EXP-ID 発行（3分）

`05_experiments/experiment_register.csv` を開き、新しい行を追加。

```
EXP-{YYYYMMDD}-{連番3桁}
例: EXP-20260601-005
```

最低限以下を記入:
- `phase` (1/2/3)
- `industry` (kaigo等)
- `area_code` (saitama-south等)
- `media` (meta/tt/line)
- `hypothesis_short` (短文の仮説)
- `start_date` / `end_date`
- `status: planned`
- `budget_jpy`

詳細仮説書は `experiments/EXP-XXX.md` を `experiment_template.md` のフォーマットで作成。

## STEP 3: 命名規則に従ってキャンペーン名を決める（5分）

`00_strategy/naming_conventions.md` 参照。

```
Campaign: {MEDIA}_{INDUSTRY}_{AREA}_{OBJECTIVE}_{YYYYMM}_{SEQ}
   例: meta_kaigo_saitama-south_cv_202606_005

Ad Set:   {TARGETING}_{HOOK}_{AUDIENCE-SIZE}
   例: radius-15km-omiya_nokin-nashi_m

Ad:       {CRTV-FORMAT}_{CRTV-ID}_{COPY-VARIANT}
   例: ugc_c014_b
```

## STEP 4: 媒体側で構築（10分）

### Meta の場合
1. Ads Manager → 新規キャンペーン
2. 目的: Sales（コンバージョン目的） / 通常Web応募
3. キャンペーン名: STEP3 の通り
4. Ad Set:
   - 予算: 日予算 3,000-8,000円
   - エリア: 半径15km指定
   - 年齢: 業種ペルソナに合わせて
   - 配置: Advantage+ 配置（自動）
   - 最適化: Lead
5. Ad:
   - 縦動画 9:16 を最低3本
   - 字幕焼き込み
   - URLパラメータ: utm規約に従う

### TikTok / LINE の場合
それぞれ `01_platforms/tiktok.md` / `01_platforms/line.md` 参照。

## STEP 5: LP の動作確認（3分）

- メッセージマッチ確認（広告FV = LP FV）
- フォーム送信テスト（実機・スマホ）
- Meta Pixel Helper / GA4 DebugView で Lead 発火確認
- CRM に utm_*, exp_id, lp_id が入っているか確認

## STEP 6: 配信開始（2分）

1. 媒体側で「公開」
2. `experiment_register.csv` の `status` を `running` に
3. `experiments/EXP-XXX.md` の配信ログに「{date}: 配信開始」と記載

## STEP 7: 日次モニタ

毎営業日 09:00 に以下を確認:

- [ ] CPA が `kpi_definitions.md` のレンジ内か
- [ ] CTR が異常低下していないか
- [ ] Frequency が3.0超えていないか（Meta）
- [ ] アラート閾値（直近7日平均の1.5倍超CPA）に該当しないか
- [ ] LPが正常稼働しているか（site uptime）

**Day 0-3 は触らない**（学習期）。Day 4以降に最適化開始。

## STEP 8: 結果記録と次アクション（配信終了時）

1. `experiments/EXP-XXX.md` の「結果」「学び」「次アクション」を記入
2. `experiment_register.csv` の `status` を `done` に、結果列を埋める
3. 勝ち仮説を `learnings/instincts/recruit_ads.json` に追加
   - 初回: confidence 0.3
   - 既存インスティンクトを再強化なら count++ で confidence 上昇
4. 3実験以上で再現したら → `06_formulas/formulas/F-{area}-{industry}.md` 起票検討

## トラブル時の参照先

| 症状 | 参照ファイル |
|---|---|
| CV 計測されない | `04_measurement/tracking_setup.md` |
| CPA が想定の2倍以上 | `kpi_definitions.md` のアラート閾値、`07_runbook/weekly_optimization.md` |
| 応募ジャンク多い | `02_creative/lp_templates.md` (フォーム強化) |
| Legal NG が出た | Legal Agent に相談、`02_creative/hook_patterns.md` のNGフック確認 |
| 配信制限くらった | 媒体規約・表現の見直し（特にLINE） |

## 1日のフローまとめ

```
朝（〜10:00）
  └ KPI Dashboard / 媒体ダッシュボード確認
  └ アラート出てたら対応
昼（〜14:00）
  └ クリエイティブ追加・差し替え判断
  └ Ad Ops が予算配分調整
夕（〜18:00）
  └ 翌日配信予定のCRTV・LP最終確認
  └ EXP-ID 起票
週次（金）
  └ Data Analyst が統計検定 → 勝ち負け確定
  └ instincts.json 更新 / formulas/ 起票判断
```
