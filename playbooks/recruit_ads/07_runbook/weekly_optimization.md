# 週次最適化チェックリスト

毎週月曜 09:00 までに前週の運用を振り返り、当週のアクションを確定する。Ad Operations 主担当。

## 1. データ集計（30分）

- [ ] `experiment_register.csv` を最新化（前週終了分の結果記入）
- [ ] 各 EXP の `experiments/EXP-XXX.md` 結果セクション更新
- [ ] KPI Dashboard 出力確認
  - [ ] 業種別 応募CPA / 有効応募CPA / CPH
  - [ ] エリア別 応募数 / 採用率
  - [ ] 媒体別 配分・パフォーマンス

## 2. 統計検定（Data Analyst・20分）

- [ ] 終了した実験ペアで二項検定 / カイ二乗
- [ ] サンプル不足のものは「保留」フラグ
- [ ] 勝敗確定したものを `instincts/recruit_ads.json` に反映
  - 新規 → confidence 0.3
  - 既存 +1 reinforce → confidence 段階上昇
- [ ] confidence 0.7 到達したら formula 起票検討

## 3. 各キャンペーンの判定（Ad Ops・40分）

各 running キャンペーンに対し以下を判定:

### 続行 / 拡張 / 停止判定

| 状態 | 判定 |
|---|---|
| CPA レンジ内 + 学習完了 | **拡張**: Ad Set 予算 +20% |
| CPA レンジ内 + CV増えてる | **続行**: 触らない |
| CPA レンジ超過 + CV少ない | **停止**: Ad Set OFF、仮説修正 |
| CPA レンジ内 + Frequency 3.0+ | **CRTV入替**: 新CRTV投入 |
| 有効応募率 30%未満 | **ターゲ見直し**: Ad Set / LP メッセージマッチ確認 |

### 予算配分

- 勝ちキャンペーンに +20-30%
- 負けキャンペーンから -50% or OFF
- 全体予算の20%は探索枠（新仮説）を死守

## 4. クリエイティブローテーション（Content Creator・40分）

- [ ] 過去2週間で投入した CRTV のパフォーマンス比較
- [ ] Top 20% を継続、Bottom 30% を停止
- [ ] 当週投入する新弾を最低5本準備
  - TikTok は 8-10本（疲弊速度速い）
  - Meta は 4-6本
  - LINE は 3-4本（静止画中心でOK）
- [ ] 新フックの仮説を `hook_patterns.md` に追記
- [ ] Spark Ads 候補（オーガニックでバズった投稿）の権利取得確認

## 5. LP 最適化（Engineer / Designer・30分）

- [ ] LP別 CVR 比較（GA4 / Hotjar 等）
- [ ] フォーム離脱率の高いステップ特定
- [ ] FV 文言・ボタン文言の A/B テスト起票
- [ ] PageSpeed Insights で LCP < 2.5 維持
- [ ] スマホ実機で送信フロー再確認

## 6. 法令・規約チェック（Legal・20分）

- [ ] 新規CRTV の表現確認（特に「絶対」「No.1」「年齢限定」）
- [ ] 募集要項変更があれば再レビュー
- [ ] 媒体規約変更のキャッチアップ（Meta / TikTok / LINE のアップデート）
- [ ] 個人情報取扱の不備チェック

## 7. 翌週の仮説起票（Marketing・40分）

- [ ] 最低5本の新仮説起票（H-statement形式）
- [ ] EXP-ID 発行 / register.csv 追加
- [ ] CRTV・LP・ターゲティングの依頼を各担当へ
- [ ] Phase 1 探索 / Phase 2 検証 の振り分け確認
- [ ] 全体配分が探索20% / 検証30% / 拡張40% / 予備10% に近いか

## 8. 全社共有（COO・20分）

- [ ] 週次レポート（`daily_reports/weekly_YYYY-MM-DD.md`）
- [ ] CEO 報告事項: 全体CPH / 採用達成率 / 予算消化率
- [ ] CS連携: 採用予定者・連絡待ちの引き継ぎ
- [ ] 異常があれば Devil's Advocate に検証依頼

## 9. ナレッジ更新

- [ ] `learnings/instincts/recruit_ads.json` 更新
- [ ] confidence 0.7 超え → 該当 agents/<name>/prompt.md に反映検討
- [ ] confidence 0.9 超え → CLAUDE.md 昇格検討
- [ ] 新エリア・新業種コード追加があれば `naming_conventions.md` / `area_segments.md` / `industry_personas.md` 更新

## 10. 月初の追加タスク

毎月第1月曜には上記に加えて:

- [ ] 月次集計（業種×エリア別 CPH / CPRH）
- [ ] formula v1.0 起票候補の確認
- [ ] 競合広告ライブラリ徹底ウォッチ（Meta Ad Library / TikTok Creative Center）
- [ ] 採用済社員ヒアリング1名以上 → ペルソナ更新
- [ ] 90日定着率の確認・CPRH 算出
- [ ] CEO・COO に月次方針レビュー
