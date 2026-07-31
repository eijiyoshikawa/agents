# 建設積算パイプライン実行手順書

## 概要
図面一式の受領から、分野別読取 → 矛盾検出 → 数量拾い → 見積 → 施工性レビュー → 質疑書（RFI）発行 → 承認までを一気通貫で実行する建設事業部専用パイプライン。QA Reviewer / Devil's Advocate / Legal / Finance は他パイプラインと共有する。

## 設計思想（積算4原則）
1. **分野別読取**: 意匠・構造・建具・設備を別々の専門エージェントに読ませる
2. **根拠の完全開示**: 数量の根拠を全部出させる（算出式と図面番号まで）
3. **精度ランク**: 全数値に A=明記 / B=算出 / C=推定 を付けさせる
4. **推測禁止**: 分からない所は勝手に決めず、質疑（RFI）に出す

これを書かないと「それっぽい嘘」が混ざる。全ステップの完了条件はこの4原則の充足を含む。

## 前提条件
- 図面一式（PDF/PNG）が `/agents/construction_manager/projects/{project_id}/drawings/` に配置済み
- `/agents/cost_estimator/price_master.json` に自社単価が登録済み（未登録項目は「要見積」扱いになる）
- 客先図面は外部送信しない（docs/OPERATIONS.md の外部送信ゲート準拠）

## パイプライン全体像

```
[図面一式受領]
     │
     ▼
┌─────────────────────────┐
│ Step 0: Construction Mgr │ プロジェクト登録・図面インデックス・分野別割当
└──────────┬──────────────┘
     ▼
┌───────────────────────────────────┐
│ Step 1（並列・4体同時）:            │
│  ├─ drawing_reader_arch    意匠図  │
│  ├─ drawing_reader_struct  構造図  │
│  ├─ drawing_reader_fixture 建具    │
│  └─ drawing_reader_mep     設備図  │  [QA Check 1]
└──────────┬────────────────────────┘
     ▼
┌─────────────────────────┐
│ Step 2: Consistency Chkr │ 図面間矛盾検出・数量凍結指示   [QA Check 2]
└──────────┬──────────────┘
     ▼
┌─────────────────────────┐
│ Step 3: Quantity Surveyor│ 数量拾い（式・図面番号・ランク） [QA Check 3]
└──────────┬──────────────┘
     ▼
┌─────────────────────────┐
│ Step 4: Cost Estimator   │ 単価適用・見積・見積条件書     [QA Check 4]
└──────────┬──────────────┘
     ▼
┌─────────────────────────┐
│ Step 5: Constructability │ 施工性・納まり・法規懸念レビュー
│         Reviewer         │ （Legal 連携）
└──────────┬──────────────┘
     ▼
┌─────────────────────────┐
│ Step 6: Devil's Advocate │ 抜け漏れ・楽観バイアス検証
└──────────┬──────────────┘
     ▼
┌─────────────────────────┐
│ Step 7: Construction Mgr │ RFI集約・質疑書発行・成果物確定 [QA Check 5]
└──────────┬──────────────┘
     ▼
┌─────────────────────────┐
│ Step 8: Finance → CEO/COO│ 粗利検証 → 提出承認
└─────────────────────────┘
```

QA Reviewer は 5 箇所のチェックポイントで検証（CLAUDE.md の「要所5箇所」原則に準拠）。

---

## 実行手順

### Step 0: Construction Manager（プロジェクト登録）
**プロンプト:** `/agents/construction_manager/prompt.md`
**出力:** `projects/{project_id}/drawing_index.json`

1. 図面番号・分野・縮尺を一覧化し、欠落図面を検出
2. 4体の読取エージェントへの割当表を作成

**完了条件:** 全図面ファイルが drawing_index.json に登録され、assigned_to が設定されている

---

### Step 1: 分野別読取（4体並列）
**プロンプト:** `/agents/drawing_reader_{arch,struct,fixture,mep}/prompt.md`
**出力:** `projects/{project_id}/readings/{arch,struct,fixture,mep}.json`

4体を**必ず並列で同時起動**する。各エージェントは自分の分野のみ読み、越境しない。

**完了条件:** 4ファイルが揃い、全数値に rank と ref が付いている。判読不能箇所が unreadable_items に記録されている
**[QA Check 1]** rank/ref 記入率100%・図面網羅性（drawing_index の全図面が drawings_read に出現）

---

### Step 2: Drawing Consistency Checker（矛盾検出）
**出力:** `projects/{project_id}/consistency_report.json`

1. 標準チェックリスト（意匠×構造 / 意匠×建具 / 意匠×設備 / 構造×設備 / リスト整合）を全件実行
2. 矛盾箇所の数量凍結リストを Quantity Surveyor に通知

**完了条件:** checklist_executed に5カテゴリ全てが記録され、issues の各件に両側の図面番号が併記されている
**[QA Check 2]** 「矛盾なし」判定に根拠（no_issue_confirmed）があること

---

### Step 3: Quantity Surveyor（数量拾い）
**出力:** `projects/{project_id}/boq.json`

1. 工種順（仮設→土工・杭→躯体→防水→外装→内装→建具→設備→外構）に数量拾い
2. 凍結対象は pending_items に別掲
3. coverage_check で拾い漏れゼロを確認

**完了条件:** 全行に formula / refs / rank が付き、coverage_check.unmapped が空（または理由付きで excluded に記録）
**[QA Check 3]** 算出式の再計算抽出検査（無作為10行）・二重計上チェック

---

### Step 4: Cost Estimator（見積作成）
**出力:** `projects/{project_id}/estimate.json`・`estimate_conditions.md`

1. 単価適用（出典必須）→ 諸経費積み上げ → 提出価格・粗利設計
2. ランクC金額比率を算出し、10%超なら「概算見積」と明示
3. 単価不明項目は「要見積」として Construction Manager に協力会社見積を依頼

**完了条件:** 全行に unit_price_source が付き、rank_amount_summary と見積条件書が生成されている
**[QA Check 4]** 集計検算・諸経費率の根拠・見積条件書と excluded の整合

---

### Step 5: Constructability Reviewer(施工性レビュー)
**出力:** `projects/{project_id}/constructability_report.json`

1. 納まり・施工手順・仮設・法規懸念・安全の全観点をレビュー
2. 法規懸念は Legal Agent に確認依頼（断定しない）
3. 見積条件への追加事項を Cost Estimator に通知（必要なら Step 4 に戻す）

**完了条件:** 全観点の実施記録があり、指摘に代替案とコスト影響レンジが付いている

---

### Step 6: Devil's Advocate(批判的検証)
**入力:** boq.json・estimate.json・consistency_report.json・constructability_report.json

- 拾い漏れ・二重計上・単価の楽観バイアス・「問題なし」判定の見落としを検証
- 指摘があれば該当 Step に差し戻す

---

### Step 7: Construction Manager（RFI集約・成果物確定）
**出力:** `projects/{project_id}/rfi.json`・`rfi_sheet.md`・`summary.json`

1. 全エージェントの rfi_candidates を重複統合し、優先度付きの質疑書を発行
2. 精度ランク集計・未解消件数を summary.json に記録

**完了条件:** 全 rfi_candidates が rfi.json に取り込まれ、質疑書に当方仮定が明記されている
**[QA Check 5]** RFI の重複・欠落・仮定と見積条件書の整合

---

### Step 8: Finance 検証 → CEO/COO 承認
- Finance Agent: 粗利率・入金条件・キャッシュフローの検証
- CEO/COO: 提出価格の最終承認。承認後 Sales Agent が客先提出

---

## 質疑回答受領後の再実行（増分更新）
1. Construction Manager が rfi.json の該当項目に answer を記録し status を answered に更新
2. 影響する readings のみ該当読取エージェントが部分更新
3. Quantity Surveyor が凍結解除・数量更新（ランクC→A/Bへの昇格を記録）
4. Cost Estimator が見積改訂（改訂履歴を estimate.json に残す）

## エラー時の対応

| 問題 | 対応 |
|------|------|
| 図面の解像度不足・判読不能 | unreadable_items に記録し、原本再入手を Construction Manager 経由で依頼 |
| 図面リストと実ファイルの不一致 | 欠落図面として RFI 化。該当範囲の数量は保留 |
| ランクC金額比率が高すぎる（>25%） | 「積算不能」と判断し、質疑回答か追加図面の入手を先行させる |
| 単価マスタ未整備の工種 | 「要見積」として協力会社見積を取得。見積条件書に前提を明記 |
| 読取エージェント間の分野境界の抜け | Consistency Checker が検出し、Construction Manager が割当を修正して再実行 |

## 学習ループ
- 受注・失注と実行予算差異を `/learnings/sessions/{date}_construction_{project_id}.json` に記録
- 拾い漏れ・単価乖離のパターンは `/learnings/instincts/construction_*.json` に蓄積
- 月次で COO が精度ランク別の実績誤差を精査し、price_master.json と歩掛かりを更新
