# 採用SNS テレアポ アウト返しスクリプト集

> 建設業向け SNS 採用支援サービスのテレアポにおいて、商談フェーズで頻出する「他媒体／人材紹介／リファラル採用」との比較アウトに対する切り返しトーク全 50 項目。
> agents 側の sales エージェント参照用 + rollplay 側の評価エンジン参照用の両方を兼ねるマスタデータ。

---

## 1. 目的

- **agents エージェント**: sales 担当エージェントが商談中の一次反論時にそのまま読める形のスクリプト集として参照
- **rollplay 評価エンジン**: ロープレ評価時に Claude Opus 4.7 が「objection」スコアの根拠提示・improvements 引用元として参照
- **トレーナー / 営業マン**: フィードバック教材としての継続学習資料

---

## 2. 成果物（本リポジトリ内）

| パス | 内容 |
|---|---|
| `agents/sales/recruitment_sns_objection_scripts.md` | スクリプト本体 50 項目（マスタデータ） |
| `agents/sales/README.md` | 本サマリ（このファイル） |
| `daily_reports/2026-05-08-recruitment-objection-scripts.md` | 作業ログ |

---

## 3. スクリプト構成

### 共通スタンス（全アウト共通の構え）

1. **否定しない**: 「おっしゃる通りで」「確かに○○ですよね」で一旦受ける
2. **比較ではなく補完**: 「代わりに」ではなく「掛け合わせると」で語る
3. **数字で返す**: 月次応募数・採用単価・歩留まり・定着率の3つを必ず1つは差し込む
4. **建設業の文脈**: 施工管理／職人／若手定着／2024年問題／3K払拭、を一語以上織り込む
5. **即決させない**: 切り返し後は必ず質問で終わらせ、ヒアリングに戻す

### カテゴリ内訳

| カテゴリ | テーマ | 項目数 |
|---|---|---:|
| A | 他媒体（求人広告媒体）との比較 | 20 |
| B | 人材紹介会社との比較 | 15 |
| C | リファラル採用との比較 | 15 |
| **合計** | | **50** |

各項目の構造: **アウト（顧客発言） / 顧客心理 / 切り返しトーク / フォロー質問** の4ブロック。

---

## 4. rollplay 連携

| 連携項目 | 内容 |
|---|---|
| 公開ページ | https://rollplay-tau.vercel.app/manual |
| マニュアル本体（rollplay 内） | [`docs/recruitment-objection-manual.md`](https://github.com/eijiyoshikawa/rollplay/blob/main/docs/recruitment-objection-manual.md) |
| 評価プロンプト | [`prompts/evaluation-prompt.ts`](https://github.com/eijiyoshikawa/rollplay/blob/main/prompts/evaluation-prompt.ts)（マニュアル全文を `EVALUATION_SYSTEM` に埋め込み） |
| 評価活用ガイド | objection 採点時にマニュアル番号で根拠提示、improvements / bestQuotes へのマニュアル準拠引用 |

`/manual` ページには 50 項目のスクリプトに加え、以下の比較表も実装済み:
- 採用手法 総合比較（10軸 × 求人媒体／人材紹介／リファラル／SNS採用支援）
- 主要求人媒体 比較（Indeed / Engage / ハローワーク / タウンワーク / doda / 工事の現場ワーク / 自社）
- 費用シミュレーション（年5名採用想定 × 5パターン）

---

## 5. ブランチ・PR 履歴

| ブランチ | PR | 内容 |
|---|---|---|
| `claude/recruitment-objection-scripts-RnIfQ` | [#5](https://github.com/eijiyoshikawa/agents/pull/5) | 採用SNSテレアポのアウト返しスクリプト50項目を追加 |
| `docs/objection-manual-summary` | 本PR | サマリ README を追加 |

---

## 6. 更新フロー

スクリプトを修正・追加する場合:

1. 本リポジトリの `agents/sales/recruitment_sns_objection_scripts.md` を更新
2. 同内容を rollplay リポジトリの `docs/recruitment-objection-manual.md` に反映
3. rollplay 側のデプロイで `/manual` ページと評価プロンプトに自動反映される

> **Note**: rollplay 側のマニュアルが評価エンジンの実体になるため、マスタは agents 側に置きつつも、rollplay 側のファイルが運用上のソース・オブ・トゥルース。両者を必ず同期すること。

---

**最終更新**: 2026-05-08
**対象商材**: 建設業向け SNS 採用支援サービス（Instagram / TikTok / 採用 LP / 応募者初期対応）
