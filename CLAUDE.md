# AI Agent Organization — 法人経営エージェント群

## プロジェクト概要
法人経営を0から100まで遂行可能なAIエージェント組織。
CEO Agentを頂点とした32体のエージェント（+ Web Builder サブエージェント8体）が、相互に連携・検証しながら経営全機能をカバーする。
企画・戦略立案から実際のプロダクト開発・サービス化まで一気通貫で実行可能。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## 組織図

```
                         ┌──────────────┐
                         │  CEO Agent   │ ← 統括・意思決定・品質管理
                         └──────┬───────┘
                                │
     ┌──────────┬───────────────┼───────────────┬──────────┐
     │          │               │               │          │
┌────▼────┐┌────▼─────┐ ┌──────▼──────┐ ┌──────▼────┐┌────▼────────┐
│ 営業部門 ││ 管理部門  │ │コンサル事業部│ │ 開発部門   ││ 横断チーム   │
└────┬────┘└────┬─────┘ └──────┬──────┘ └──────┬────┘└────┬────────┘
     │          │              │               │          │
  Sales      Finance     Retriever        Tech Lead    QA Reviewer
  Marketing  HR          Issue Str.       Frontend E.  KPI Dashboard
  CS         Legal       Market Res.      Backend E.   Project Manager
  SNS Op.                Analogy F.       Infrastructure Data Analyst
  Ad Ops.                Strategist       QA Engineer
  Content C.             Report B.        UI/UX Designer
  SEO/AIEO               Document B.      Data Engineer
  Marketing              Marketing An.    Designer
   Analyst                                Engineer
                                          Web Builder
                                            └─ 8 sub-agents
```

## エージェント構成（全33体 + サブ8体）
各エージェントのプロンプトは `/agents/<agent_name>/prompt.md` に定義。
出力は `/agents/<agent_name>/output.json` に保存される。

### 統括
1. **CEO Agent** (`ceo`) — 全体統括・意思決定・品質ゲート・組織最適化

### コンサルティング事業部（戦略提案パイプライン）
2. **Retriever** (`retriever`) — Notion議事録取得・構造化
3. **Issue Structurer** (`issue_structurer`) — ビジネス課題の言語化・構造化
4. **Market Researcher** (`market_researcher`) — 市場・競合・顧客分析（並列実行）
5. **Analogy Finder** (`analogy_finder`) — 異業種アナロジー事例収集（並列実行）
6. **Marketing Analyst** (`marketing_analyst`) — 競合マーケティング施策の深掘り分析（並列実行）
7. **Strategist** (`strategist`) — 戦略構築 + Devil's Advocate批判的検証
8. **Report Builder** (`report_builder`) — Google Slides提案資料の構成作成
9. **Document Builder** (`document_builder`) — 対話型提案資料作成（テンプレート活用）

### 営業・マーケティング部門
10. **Sales Agent** (`sales`) — リード管理・商談パイプライン・受注管理
11. **Marketing Agent** (`marketing`) — 自社マーケティング・ブランディング・リード獲得
12. **Customer Success Agent** (`customer_success`) — 顧客満足度・リテンション・アップセル
13. **SNS Operator** (`sns_operator`) — Instagram/TikTok/YouTube日常運用・エンゲージメント管理
14. **Ad Operations** (`ad_operations`) — Google/Meta/TikTok広告運用・ROAS最適化
15. **Content Creator** (`content_creator`) — SNS投稿・ブログ・動画脚本・広告コピー制作
16. **SEO/AIEO Agent** (`seo_aieo`) — SEO・AI検索最適化・ディスクリプション/タグ選定・ブログ自動はめ込み（WordPress/Next.js対応）

### 管理部門
17. **Finance Agent** (`finance`) — 経理・財務・見積・請求・PL管理・補助金
18. **HR Agent** (`hr`) — 組織設計・採用・評価・エージェント組織管理
19. **Legal Agent** (`legal`) — 契約書・コンプライアンス・知財・リスク法務

### 開発部門
20. **Tech Lead** (`tech_lead`) — CTO的技術統括・アーキテクチャ設計・技術選定
21. **Frontend Engineer** (`frontend_engineer`) — Next.js App Router UI実装・SEO最適化
22. **Backend Engineer** (`backend_engineer`) — API設計・DB・認証・Stripe決済連携
23. **Infrastructure** (`infrastructure`) — デプロイ・CI/CD・監視・セキュリティ・コスト管理
24. **QA Engineer** (`qa_engineer`) — テスト自動化・品質保証（Jest/Playwright）
25. **UI/UX Designer** (`ui_ux_designer`) — デザインシステム構築・Figma連携・ユーザビリティ改善
26. **Data Engineer** (`data_engineer`) — クローラー・データパイプライン・データ品質管理
27. **Designer** (`designer`) — Web/LP/UIデザイン生成（AI Designer MCP活用）
28. **Engineer** (`engineer`) — LP/Web/AIシステム実装（Next.js/Python/WordPress）

### Web Builder パイプライン（サブエージェント8体）
29. **Web Builder** (`web_builder`) — 参考サイト分析→Next.js再現パイプライン
    - `site_scanner` — サイト偵察・技術検出
    - `structure_analyzer` — HTML構造・レイアウトパターン解析
    - `design_analyzer` — カラー・タイポグラフィ・スペーシング抽出
    - `motion_analyzer` — アニメーション・トランジション特定
    - `interaction_analyzer` — フォーム・モーダル・タブ等UI要素解析
    - `asset_collector` — 画像・フォント・アイコン収集（著作権配慮）
    - `builder` — 全解析結果統合→Next.js + Tailwind CSS実装
    - `qa_reviewer` — Vercelデプロイ後の比較検証・修正指示

### 横断チーム
30. **Project Manager Agent** (`project_manager`) — プロジェクト進捗・リソース配分・納期管理
31. **QA Reviewer Agent** (`qa_reviewer`) — 全出力の品質検証・相互整合性チェック
32. **KPI Dashboard Agent** (`kpi_dashboard`) — 全社KPI集計・異常検知・レポーティング
33. **Data Analyst** (`data_analyst`) — 横断データ分析・インサイト抽出・意思決定支援

## 相互干渉（チェック&バランス）

全エージェントはQA Reviewerによる品質チェックを受ける。
主要な相互連携:

| 連携 | 内容 |
|------|------|
| Sales → Retriever | 商談ヒアリング議事録の取得トリガー |
| Sales → Finance | 見積依頼・受注通知 |
| Sales → PM | 受注後プロジェクト立ち上げ |
| PM → Tech Lead | 開発プロジェクトの技術方針決定 |
| Tech Lead → Frontend/Backend/Infra | 開発タスクの振り分け・技術レビュー |
| Designer → Frontend Engineer | デザイン→実装ハンドオフ |
| UI/UX Designer → Designer | デザインシステム・トークン提供 |
| Backend Engineer → Infrastructure | デプロイ依頼・インフラ構成 |
| QA Engineer → Frontend/Backend | テスト結果・バグ報告 |
| Data Engineer → KPI Dashboard | データパイプライン→集計基盤 |
| PM → Finance | 工数実績・請求トリガー |
| PM → CS | 納品後ハンドオフ |
| CS → Sales | アップセル機会・リファラル |
| Content Creator → SEO/AIEO | 記事本文 → SEO/AIEO最適化・タグ/ディスクリプション挿入 |
| SEO/AIEO → Frontend Engineer | Next.js メタデータ・構造化データ実装連携 |
| SEO/AIEO → Engineer | WordPress メタデータ・プラグイン連携 |
| Marketing → SEO/AIEO | キーワード戦略・コンテンツカレンダー連携 |
| Marketing → Content Creator → SNS Op. | コンテンツ企画→制作→配信 |
| Marketing → Ad Operations | 広告戦略→運用実行 |
| Marketing → Sales | リード引き渡し |
| Data Analyst → CEO | 分析レポート・意思決定支援 |
| Finance → CEO | 週次PL・キャッシュフロー |
| KPI Dashboard → CEO | 日次KPI・異常アラート |
| QA Reviewer → 全体 | 品質差し戻し・改善指示 |
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

## 共有リソース

### デザインシステム（awesome-design-md）
`/design-md/` に54社以上の企業デザインシステム（DESIGN.md）を格納。
LP制作・Web制作・提案資料作成時のデザインリファレンスとして、Marketing Agent と Report Builder Agent が参照する。

- 一覧: `/design-md/README.md`
- 個別: `/design-md/{company-name}/DESIGN.md`
- 出典: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)

## 事業領域
- SNSマーケティング（Instagram, TikTok, YouTube 運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作

## ゴール
全ての業務に対してプロのエージェントが存在し、法人経営を0から100まで行える組織配置と、マネジメント力のある統括エージェント（CEO Agent）の育成。
