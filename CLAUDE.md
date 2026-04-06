# AI Agent Organization — 法人経営エージェント群

## プロジェクト概要
法人経営を0から100まで遂行可能なAIエージェント組織。
CEO Agentを頂点とした24体のエージェントが、相互に連携・検証しながら経営全機能をカバーする。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## 組織図

```
                    ┌──────────────┐
                    │  CEO Agent   │ ← 統括・意思決定・品質管理
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┬──────────────────┐
        │                  │                  │                  │
   ┌────▼────┐      ┌─────▼─────┐     ┌──────▼──────┐    ┌─────▼─────┐
   │ 営業部門 │      │ 管理部門  │     │ コンサル事業部 │    │ 開発部門  │
   └────┬────┘      └─────┬─────┘     └──────┬──────┘    └─────┬─────┘
        │                  │                  │                  │
  ┌─────┼─────┐    ┌──────┼──────┐    ┌──────┼──────────────┐  │
  │     │     │    │      │      │    │      │              │  │
Sales Marketing CS Finance HR  Legal  戦略提案パイプライン  Doc  ├─ Tech Lead (CTO)
                                      (既存6体)          Builder├─ Frontend Engineer
                                                               ├─ Backend Engineer
        ┌──────────────────┐                                   ├─ Infrastructure
        │ 横断チーム        │                                   ├─ UI/UX Designer
        ├──────────────────┤                                   ├─ Data Engineer
        │ QA Reviewer      │ ← 全出力の品質管理                 └─ QA Engineer
        │ KPI Dashboard    │ ← 全社KPI集計
        │ Project Manager  │ ← プロジェクト管理
        └──────────────────┘
```

## エージェント構成（全24体）
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
8. **Document Builder** — Google Slidesテンプレートベースの対話型提案資料作成（3ステップ確認制）

### 営業・マーケティング部門
9. **Sales Agent** — リード管理・商談パイプライン・受注管理
10. **Marketing Agent** — 自社マーケティング・ブランディング・リード獲得
11. **Customer Success Agent** — 顧客満足度・リテンション・アップセル

### 管理部門
12. **Finance Agent** — 経理・財務・見積・請求・PL管理・補助金
13. **HR Agent** — 組織設計・採用・評価・エージェント組織管理
14. **Legal Agent** — 契約書・コンプライアンス・知財・リスク法務

### 開発部門
15. **Tech Lead Agent** — 技術統括・アーキテクチャ設計（CTO相当）
16. **Frontend Engineer Agent** — Next.js UI実装・SEO最適化
17. **Backend Engineer Agent** — API・DB・認証・決済（Supabase / Stripe）
18. **Infrastructure Agent** — デプロイ・CI/CD・監視（Vercel）
19. **UI/UX Designer Agent** — デザインシステム・ワイヤーフレーム（Figma）
20. **Data Engineer Agent** — Webクローラー・データパイプライン
21. **QA Engineer Agent** — テスト自動化・品質保証（Playwright / Jest）

### 横断チーム
22. **Project Manager Agent** — プロジェクト進捗・リソース配分・納期管理
23. **QA Reviewer Agent** — 全出力の品質検証・相互整合性チェック
24. **KPI Dashboard Agent** — 全社KPI集計・異常検知・レポーティング

## 相互干渉（チェック&バランス）

全エージェントはQA Reviewerによる品質チェックを受ける。
主要な相互連携:

| 連携 | 内容 |
|------|------|
| Sales → Retriever | 商談ヒアリング議事録の取得トリガー |
| Sales → Finance | 見積依頼・受注通知 |
| Sales → PM | 受注後プロジェクト立ち上げ |
| PM → Finance | 工数実績・請求トリガー |
| PM → CS | 納品後ハンドオフ |
| CS → Sales | アップセル機会・リファラル |
| Marketing → Sales | リード引き渡し |
| Finance → CEO | 週次PL・キャッシュフロー |
| KPI Dashboard → CEO | 日次KPI・異常アラート |
| QA Reviewer → 全体 | 品質差し戻し・改善指示 |
| Document Builder → Retriever | 商談議事録・顧客情報の取得 |
| Document Builder → Sales | クライアント情報・商談コンテキスト参照 |
| Document Builder → Finance | 見積・コスト情報のP5反映 |
| Tech Lead → 開発部門全体 | 技術方針・アーキテクチャ指示・コードレビュー |
| PM → Tech Lead | 要件定義・技術実現可能性の確認 |
| UI/UX Designer → Frontend | デザインハンドオフ・Code Connect |
| Frontend ↔ Backend | API仕様共有・型定義 |
| Infrastructure → Frontend/Backend | デプロイ・環境変数管理 |
| Data Engineer → KPI Dashboard | 集計用データの供給 |
| QA Engineer → Frontend/Backend | テスト結果・バグ報告 |
| CEO → 全体 | 優先度指示・リソース配分・最終承認 |

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
