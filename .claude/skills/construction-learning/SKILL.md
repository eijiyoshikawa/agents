---
name: "construction-learning"
description: "建設事業部の週次ナレッジ収集。他社の積算ミス・施工不具合・法規改正・単価動向・AI積算事例を収集し、ダイジェストとインスティンクトに蓄積する。「建設ナレッジを収集して」「/construction-learning」で起動。週次の定期実行を想定。"
---

あなたは Construction Manager Agent として建設事業部9体の「週次レベルアップ」を実行する。
収集した知見はファイルに蓄積され、各エージェントが業務開始時に参照することで組織の積算精度・レビュー観点が毎週向上する。

## 原則
- **出典必須**: 全事例に出典URL・媒体名・確認日を付ける。出典のない伝聞は採用しない（積算4原則「推測禁止」の精神）
- **収集のみ**: 社内の図面・見積・顧客情報は検索クエリにも外部にも出さない（docs/OPERATIONS.md 外部送信ゲート準拠）
- **プロンプト直接改訂はしない**: 知見はインスティンクト（confidence 0.3 起票）として蓄積し、既存ルールどおり COO 月次レビューで confidence ≥ 0.9 のものだけがプロンプト昇格する

## 手順

### 1. 前回実行の確認
```bash
ls agents/construction_manager/knowledge/digests/ | tail -3   # 前回ダイジェスト
cat learnings/instincts/construction.json | head -50          # 既存インスティンクト
```

### 2. 収集（WebSearch・5カテゴリ）
各カテゴリ2〜5件、計10件以上を目安に収集する:

| カテゴリ | 収集対象・検索例 |
|---------|----------------|
| ①積算ミス・拾い漏れ事例 | 積算 拾い漏れ 事例 / 見積 数量 誤り 建設 / 積算基準 改定 |
| ②施工不具合・事故事例 | 施工不良 事例 / 建築 紛争 判例 / 国交省 ネガティブ情報 / 労災 建設 事例 |
| ③法規・基準の改正動向 | 建築基準法 改正 / 省エネ基準 / 告示 防火 改正 / 建築数量積算基準 |
| ④単価・物価動向 | 建設物価 動向 / 労務単価 改定 / 鋼材 生コン 価格 |
| ⑤AI積算・建設DX他社事例 | AI 積算 サービス / 図面 自動読取 / 建設DX 事例（競合の手法・精度・価格を記録） |

各件について記録する項目:
`title / source_url / source_name / checked_at / summary(3行以内) / 示唆(どのエージェントの何の観点に効くか) / 関連エージェント`

### 3. ダイジェスト作成
`agents/construction_manager/knowledge/digests/YYYY-MM-DD.md` に出力:

```markdown
# 建設事業部 週次ナレッジダイジェスト YYYY-MM-DD
## 今週のハイライト（3件・組織への影響が大きい順）
## カテゴリ別収集結果（①〜⑤、各件に出典・示唆・関連エージェント）
## インスティンクト起票・更新（今週の差分）
## 各エージェントへの申し送り（該当があるものだけ）
```

### 4. 事例ライブラリ・インスティンクト更新
1. `agents/construction_manager/knowledge/cases.json` に収集事例を追記（`case_id`: CASE-YYYYMMDD-nn）
2. `learnings/instincts/construction.json` を更新:
   - 新パターン → confidence 0.3 で起票（id: CON-xxx、trigger/action/evidence 形式は global.json 準拠）
   - 既存パターンの再確認 → evidence.count を +1、confidence を +0.1（上限 0.9）
   - 実務で反証された → confidence を下げ、理由を evidence に記録
3. 単価動向で price_master.json の乖離が疑われる場合は、ダイジェストに「Cost Estimator への単価改定提案」として記載（マスタの直接変更はしない）

### 5. 品質セルフチェック
- [ ] 全事例に source_url と checked_at がある
- [ ] cases.json / construction.json が valid JSON
- [ ] 示唆が「どのエージェントの何の観点に効くか」まで具体化されている
- [ ] 社内情報・顧客情報が含まれていない

### 6. コミット
変更ファイル（digests/・cases.json・construction.json）をコミットする。
コミットメッセージ: `chore(learnings): 建設週次ナレッジ YYYY-MM-DD`

## 蓄積先まとめ
| ファイル | 内容 | 参照者 |
|---------|------|--------|
| `knowledge/digests/YYYY-MM-DD.md` | 週次ダイジェスト | 建設9体（業務開始時に最新版を確認） |
| `knowledge/cases.json` | 他社事例ライブラリ（累積） | Consistency Checker / Constructability Reviewer が類似検索 |
| `learnings/instincts/construction.json` | 学習済みパターン | 建設9体 + COO 月次レビュー |
