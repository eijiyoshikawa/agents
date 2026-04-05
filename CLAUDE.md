# AI Agent Organization — 法人経営エージェント群

## プロジェクト概要
法人経営を0から100まで遂行可能なAIエージェント組織。
CEO Agentを頂点とした16体のエージェントが、相互に連携・検証しながら経営全機能をカバーする。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## 組織図

```
                    ┌──────────────┐
                    │  CEO Agent   │ ← 統括・意思決定・品質管理
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼─────┐     ┌──────▼──────┐
   │ 営業部門 │      │ 管理部門  │     │ コンサル事業部 │
   └────┬────┘      └─────┬─────┘     └──────┬──────┘
        │                  │                  │
  ┌─────┼─────┐    ┌──────┼──────┐    ┌──────┼──────────┐
  │     │     │    │      │      │    │      │          │
Sales Marketing CS Finance HR  Legal  戦略提案パイプライン
                                      (既存6体)
        ┌──────────────────┐
        │ 横断チーム        │
        ├──────────────────┤
        │ QA Reviewer      │ ← 全出力の品質管理
        │ KPI Dashboard    │ ← 全社KPI集計
        │ Project Manager  │ ← プロジェクト管理
        └──────────────────┘
```

## エージェント構成（全16体）
各エージェントのプロンプトは `/agents/<agent_name>/prompt.md` に定義。
出力は `/agents/<agent_name>/output.json` に保存される。

### 統括
1. **CEO Agent** — 全体統括・意思決定・品質ゲート・組織最適化

### コンサルティング事業部（戦略提案パイプライン）
2. **Retriever** — Notion議事録取得・構造化
3. **Issue Structurer** — ビジネス課題の言語化・構造化
4. **Market Researcher** — 市場・競合・顧客分析（並列実行）
5. **Analogy Finder** — 異業種アナロジー事例収集（並列実行）
6. **Strategist** — 戦略構築 + Devil's Advocate批判的検証
7. **Report Builder** — Google Slides提案資料の構成作成

### 営業・マーケティング部門
8. **Sales Agent** — リード管理・商談パイプライン・受注管理
9. **Marketing Agent** — 自社マーケティング・ブランディング・リード獲得
10. **Customer Success Agent** — 顧客満足度・リテンション・アップセル

### 管理部門
11. **Finance Agent** — 経理・財務・見積・請求・PL管理・補助金
12. **HR Agent** — 組織設計・採用・評価・エージェント組織管理
13. **Legal Agent** — 契約書・コンプライアンス・知財・リスク法務

### 横断チーム
14. **Project Manager Agent** — プロジェクト進捗・リソース配分・納期管理
15. **QA Reviewer Agent** — 全出力の品質検証・相互整合性チェック
16. **KPI Dashboard Agent** — 全社KPI集計・異常検知・レポーティング

## 相互干渉（チェック&バランス）

全エージェントはQA Reviewerによる品質チェックを受ける。
全エージェントはKPI Dashboardによるパフォーマンス測定を受ける。
CEO Agentは HR Agent + QA Reviewer による月次監査を受ける。

### 主要な相互連携（双方向）

| 連携 | 内容 |
|------|------|
| **ビジネスフロー** | |
| Sales ↔ Retriever | 商談ヒアリング議事録の取得 ↔ 議事録精度フィードバック |
| Sales ↔ Finance | 見積依頼・受注通知 ↔ 見積完了・与信情報 |
| Sales ↔ PM | 受注後PJ立ち上げ ↔ 納品完了通知（追加提案機会） |
| Sales ↔ Marketing | リード品質フィードバック ↔ リード引き渡し |
| Sales ↔ CS | アップセル機会・リファラル ↔ 新規受注情報 |
| Sales ↔ Legal | 契約書レビュー依頼 ↔ レビュー結果 |
| PM ↔ Finance | 工数実績・請求トリガー ↔ 予算制約・原価情報 |
| PM ↔ CS | 納品後ハンドオフ ↔ サービス品質フィードバック |
| PM ↔ HR | リソース不足アラート ↔ 人員・スキル情報 |
| Marketing ↔ CS | キャンペーン情報 ↔ 顧客事例の活用許可 |
| Finance ↔ HR | 人件費予算 ↔ 採用コスト |
| Finance ↔ Legal | 補助金法務確認 ↔ 申請要件の法的確認 |
| HR ↔ Legal | 就業規則確認依頼 ↔ 労務法務アドバイス |
| **統括・監査フロー** | |
| CEO → 全体 | 優先度指示・リソース配分・最終承認 |
| Finance → CEO | 週次PL・キャッシュフロー |
| KPI Dashboard → CEO | 日次KPI・異常アラート |
| KPI Dashboard → 各Agent | 担当KPI実績フィードバック |
| QA Reviewer → 全体 | 品質差し戻し・改善指示 |
| HR + QA → CEO | **月次CEO監査**（意思決定根拠・公平性検証） |
| **パイプライン内フィードバック** | |
| Issue Structurer → Retriever | 議事録情報不足時の追加取得依頼 |
| Strategist → Market Researcher | データ不足領域の追加調査依頼 |
| Strategist → Analogy Finder | 転用インサイト具体化の依頼 |
| Report Builder → Strategist | 戦略説明の明確化依頼 |
| Finance → Strategist | コスト前提の妥当性検証 |
| PM → Strategist | 実行ロードマップの実現可能性検証 |

## 実行方法

### 戦略提案パイプライン
```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「会議名」からパイプラインを実行してください。
```

### ワンショット実行（コピペ用プロンプト）
`/agents/orchestrator/run.md` にコピペ用プロンプトを用意。
`{{会議名}}` を置き換えて Claude Code に貼り付けるだけで全ステップが実行される。

### 日次レポート
`/daily_reports/YYYY-MM-DD.md` に全エージェントの稼働状況・組織診断を記録。

### 他の人と共有する場合
1. このリポジトリを `git clone` する
2. Claude Code（Max プラン）を開く
3. MCP サーバーを設定する（Notion / Google Drive）
4. 上記いずれかの方法で実行

## 事業領域
- SNSマーケティング（Instagram, TikTok, YouTube 運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作

## ゴール
全ての業務に対してプロのエージェントが存在し、法人経営を0から100まで行える組織配置と、マネジメント力のある統括エージェント（CEO Agent）の育成。
