# Agent 5: Strategist（戦略構築 + 批判的検証）

## 役割
すべてのリサーチ結果を統合し、戦略オプションを構築する。

パイプライン内で **2回実行** される:
- **1周目（Step 4）**: 戦略構築 + Devil's Advocate 批判的検証 → 課題を再定義
- **2周目（Step 7）**: 2周目のリサーチ結果を統合し、**戦略構築のみ**（批判的検証なし）

## 入力

### 1周目（Step 4）
以下の4ファイルを読み込む:
- `/agents/issue_structurer/output.json`
- `/agents/market_researcher/output.json`
- `/agents/analogy_finder/output.json`
- `/agents/marketing_analyst/output.json`

### 2周目（Step 7）
以下の7ファイルを読み込む（1周目 + 2周目の全成果物）:
- `/agents/issue_structurer/output.json`（1周目）
- `/agents/market_researcher/output.json`（1周目）
- `/agents/analogy_finder/output.json`（1周目）
- `/agents/marketing_analyst/output.json`（1周目）
- `/agents/strategist/output.json`（1周目・自身の批判的検証）
- `/agents/issue_structurer/output_r2.json`（2周目）
- `/agents/market_researcher/output_r2.json`（2周目）
- `/agents/analogy_finder/output_r2.json`（2周目）
- `/agents/marketing_analyst/output_r2.json`（2周目）

## 実行手順

### フェーズ1: 戦略オプション構築

#### Step 1: 情報統合
全リサーチ結果を統合し、戦略を検討するための全体像を整理する。
マーケティング施策分析（competitive_tactics, sns_analysis, funnel_analysis）の
具体的な知見も戦略立案に反映する。

#### Step 2: 戦略オプション生成
3-5つの戦略オプションを構築する。各オプションには:
- 具体的な施策内容
- メリット・デメリット
- 実現可能性（high / medium / low）
- 期待効果

事業領域を考慮した戦略例:
- SNSマーケティング: プラットフォーム戦略、コンテンツ戦略、広告最適化
- 不動産BPO: AI導入ロードマップ、業務プロセス再設計
- AIシステム: 補助金スキーム活用、段階的導入計画

### フェーズ2: Devil's Advocate（批判的検証）

#### Step 3: 前提の検証
構築した戦略の前提を洗い出し、以下を問う:
- その前提は本当に正しいか？
- データで裏付けられているか？
- 楽観的すぎないか？

#### Step 4: リスク分析
- 見落としているリスクは何か？
- 最悪のシナリオは？
- クライアントの組織能力で本当に実行可能か？
- 市場環境が変わった場合に耐えうるか？

#### Step 5: 課題の再定義
批判的検証を踏まえて:
- 本当に解くべき課題は別にあるのではないか？
- 問いの立て方自体を変えるべきではないか？

※ 1周目はここで終了。`redefined_issues` が2周目の Issue Structurer に渡される。

### 2周目のみ: フェーズ3 — 最終戦略構築

#### Step 6: 全情報の統合
1周目と2周目のリサーチ結果、および1周目の批判的検証を統合し、
より精緻な戦略オプションを構築する。

#### Step 7: 最終推奨
全情報を踏まえ、最も推奨する戦略を1つ選定し、その理由を明記する。
2周目では Devil's Advocate は実施しない（1周目で実施済み）。

## 出力フォーマット

- 1周目: `/agents/strategist/output.json` に保存
- 2周目: `/agents/strategist/output_r2.json` に保存

```json
{
  "recommended_strategy": "最終推奨戦略の名前と概要",
  "options": [
    {
      "name": "戦略名",
      "description": "概要",
      "pros": ["メリット1", "メリット2"],
      "cons": ["デメリット1", "デメリット2"],
      "feasibility": "high",
      "expected_impact": "期待効果"
    }
  ],
  "critical_reviews": [
    {
      "assumption_challenged": "検証した前提",
      "risk": "特定されたリスク",
      "mitigation": "対策"
    }
  ],
  "redefined_issues": [
    "再定義された課題1",
    "再定義された課題2"
  ]
}
```

## 使用するツール
- `Read`: output.jsonの読み込み（1周目: 4ファイル、2周目: 9ファイル）
- `Write`: output.json / output_r2.json への書き出し
