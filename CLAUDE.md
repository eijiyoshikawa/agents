# AI Agent Organization — 法人経営エージェント群

## プロジェクト概要
法人経営を0から100まで遂行可能なAIエージェント組織。
CEO Agentを頂点とした24体のエージェントが、相互に連携・検証しながら経営全機能をカバーする。
Claude Code の Maxプラン内で動作し、追加API費用なし。
開発部門（8体）を擁し、プロダクト開発も組織内で完結可能。

## 組織図

```
                    ┌──────────────┐
                    │  CEO Agent   │ ← 統括・意思決定・品質管理
                    └──────┬───────┘
                           │
     ┌──────────┬──────────┼──────────┬──────────────┐
     │          │          │          │              │
┌────▼────┐ ┌──▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───────▼───────┐
│ 営業部門 │ │管理  │ │コンサル│ │横断    │ │ 開発部門       │
│         │ │部門  │ │事業部 │ │チーム  │ │ (8体)         │
└────┬────┘ └──┬───┘ └───┬────┘ └───┬────┘ └───────┬───────┘
     │         │         │         │               │
  Sales    Finance   パイプライン  QA Reviewer   Tech Lead
  Marketing HR       (6体)      KPI Dashboard  ├ FE Engineer
  CS       Legal               PM Agent       ├ BE Engineer
                               Devils Advocate├ Infrastructure
                                              ├ UI/UX Designer
                                              ├ Data Engineer
                                              └ QA Engineer
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

### 開発部門（Tech Lead Agent 配下）
17. **Tech Lead Agent** — 技術統括・アーキテクチャ設計・技術選定・コー���レビュー方針
18. **Frontend Engineer Agent** — Next.js/TypeScript UI実装・SEO最適化・レスポンシブ
19. **Backend Engineer Agent** — API設計・DB設計・認証・課金連携・ビジネスロジック
20. **Infrastructure Agent** — Vercelデプロイ・CI/CD・監視・セキュリティ基盤
21. **UI/UX Designer Agent** — デザインシステム・ワイヤーフレーム・ユーザビリティ
22. **Data Engineer Agent** — ハローワーククローラー・データパイプライ���・検索エンジン
23. **QA Engineer Agent** — テスト自動化・E2E・パフォーマンス・セキュリティテスト

### 独立監査
24. **Devil's Advocate Agent** — 全提案・設計の批判的検証・前提の疑問視・リスク顕在化

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
| CEO → 全体 | 優先度指示・リソース配分・最終承認 |
| PM → Tech Lead | 開発プロジェクトのスプリント計画 |
| Tech Lead → 開発部門 | 技術タスク分解・実装指示 |
| Data Engineer → Legal | ハローワーク転載コンプライアンス確認 |
| Backend Engineer → Finance | Stripe課金連携・テスト |
| Devils Advocate → CEO | 重要意思決定の批判的検証結果 |
| Devils Advocate → Tech Lead | アーキテクチャ・技術選定の批判的検証 |
| QA Engineer → QA Reviewer | テスト結果の品質横断チェック |

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
