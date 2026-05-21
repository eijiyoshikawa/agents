# AI Agent Organization — 法人経営エージェント群

法人経営を0から100まで遂行可能な**39体のAIエージェント**（+ Web Builderサブ8体＝計47体）。
企画・戦略立案からプロダクト開発・サービス化まで一気通貫で実行可能。
Claude Code の Maxプラン内で動作し、追加API費用なし。

## 組織図

```
                         ┌──────────────┐
                         │  CEO Agent   │ ← 統括・意思決定・品質管理
                         └──────┬───────┘
                                │
     ┌──────────┬───────────────┼───────────────┬──────────┐
     │          │               │               │          │
 営業部門    管理部門     コンサル事業部      開発部門     横断チーム
 (11体)      (4体)         (8体)           (10体)       (5体)
```

## エージェント一覧（全39体 + サブ8体）

### 統括
| # | 呼び出し名 | 役割 |
|---|-----------|------|
| 1 | `ceo` | 全体統括・意思決定・品質ゲート・組織最適化 |

### コンサルティング事業部（8体）
| # | 呼び出し名 | 役割 |
|---|-----------|------|
| 2 | `retriever` | Notion議事録取得・構造化 |
| 3 | `issue_structurer` | ビジネス課題の言語化・構造化 |
| 4 | `market_researcher` | 市場・競合・顧客分析（並列実行） |
| 5 | `analogy_finder` | 異業種アナロジー事例収集（並列実行） |
| 6 | `marketing_analyst` | 競合マーケティング施策の深掘り分析（並列実行） |
| 7 | `strategist` | 戦略構築 + Devil's Advocate批判的検証 |
| 8 | `report_builder` | Google Slides提案資料の構成作成 |
| 9 | `document_builder` | 対話型提案資料作成（テンプレート活用） |

### 営業・マーケティング部門（11体）
| # | 呼び出し名 | 役割 |
|---|-----------|------|
| 10 | `sales` | リード管理・商談パイプライン・受注管理 |
| 11 | `marketing` | 自社マーケティング・ブランディング・リード獲得 |
| 12 | `customer_success` | 顧客満足度・リテンション・アップセル |
| 13 | `sns_operator` | Instagram/TikTok/YouTube日常運用・エンゲージメント管理 |
| 14 | `ad_operations` | Google/Meta/TikTok広告運用・ROAS最適化 |
| 15 | `content_creator` | SNS投稿・ブログ・動画脚本・広告コピー制作 |
| 16 | `seo_aieo` | SEO・AI検索最適化・ディスクリプション/タグ選定・ブログ自動はめ込み |
| 17 | `copywriter` | LP・広告・セールスレターのCVR最大化コピー制作 |
| 18 | `pr` | 広報・プレスリリース・メディアリレーション・危機管理広報 |
| 19 | `crm` | 顧客データベース管理・セグメンテーション・LTV最大化 |
| 20 | `chatbot` | Webチャット・LINE・SNS自動応答・FAQ対応・エスカレーション |

### 管理部門（4体）
| # | 呼び出し名 | 役割 |
|---|-----------|------|
| 21 | `finance` | 経理・財務・見積・請求・PL管理・補助金 |
| 22 | `hr` | 組織設計・採用・評価・エージェント組織管理 |
| 23 | `legal` | 契約書・コンプライアンス・知財・リスク法務 |
| 24 | `compliance` | 景品表示法・薬機法・個人情報保護法等の法令適合チェック |

### 開発部門（10体）
| # | 呼び出し名 | 役割 |
|---|-----------|------|
| 25 | `tech_lead` | CTO的技術統括・アーキテクチャ設計・技術選定 |
| 26 | `frontend_engineer` | Next.js App Router UI実装・SEO最適化 |
| 27 | `backend_engineer` | API設計・DB・認証・Stripe決済連携 |
| 28 | `infrastructure` | デプロイ・CI/CD・監視・セキュリティ・コスト管理 |
| 29 | `qa_engineer` | テスト自動化・品質保証（Jest/Playwright） |
| 30 | `ui_ux_designer` | デザインシステム構築・Figma連携・ユーザビリティ改善 |
| 31 | `data_engineer` | クローラー・データパイプライン・データ品質管理 |
| 32 | `designer` | Web/LP/UIデザイン生成（AI Designer MCP活用） |
| 33 | `engineer` | LP/Web/AIシステム実装（Next.js/Python/WordPress） |
| 34 | `web_builder` | 参考サイト分析→Next.js再現パイプライン |

### Web Builder サブエージェント（8体）
| | 呼び出し名 | 役割 |
|---|-----------|------|
| - | `web_builder/site_scanner` | サイト偵察・技術検出 |
| - | `web_builder/structure_analyzer` | HTML構造・レイアウトパターン解析 |
| - | `web_builder/design_analyzer` | カラー・タイポグラフィ・スペーシング抽出 |
| - | `web_builder/motion_analyzer` | アニメーション・トランジション特定 |
| - | `web_builder/interaction_analyzer` | フォーム・モーダル・タブ等UI要素解析 |
| - | `web_builder/asset_collector` | 画像・フォント・アイコン収集（著作権配慮） |
| - | `web_builder/builder` | 全解析結果統合→Next.js + Tailwind CSS実装 |
| - | `web_builder/qa_reviewer` | Vercelデプロイ後の比較検証・修正指示 |

### 横断チーム（5体）
| # | 呼び出し名 | 役割 |
|---|-----------|------|
| 35 | `project_manager` | プロジェクト進捗・リソース配分・納期管理 |
| 36 | `qa_reviewer` | 全出力の品質検証・相互整合性チェック |
| 37 | `kpi_dashboard` | 全社KPI集計・異常検知・レポーティング |
| 38 | `data_analyst` | 横断データ分析・インサイト抽出・意思決定支援 |
| 39 | `analytics` | GA4/GSC/広告データ統合分析・マーケティングROI最適化 |

## 相互干渉（チェック&バランス）

全エージェントはQA Reviewerによる品質チェックを受ける。主要な相互連携:

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
| Marketing → Content Creator → SNS Op. | コンテンツ企画→制作→配信 |
| Marketing → Ad Operations | 広告戦略→運用実行 |
| Marketing → Sales | リード引き渡し |
| Data Analyst → CEO | 分析レポート・意思決定支援 |
| Finance → CEO | 週次PL・キャッシュフロー |
| KPI Dashboard → CEO | 日次KPI・異常アラート |
| QA Reviewer → 全体 | 品質差し戻し・改善指示 |
| CEO → 全体 | 優先度指示・リソース配分・最終承認 |

## 戦略提案パイプライン

```
Step 1: Retriever            → 議事録取得・分解 (Notion)
Step 2: Issue Structurer     → イシュー言語化・構造化
Step 3: Market Researcher  ┐
        Analogy Finder     ├ 並列実行
        Marketing Analyst  ┘
Step 4: Strategist           → 戦略構築 + Devil's Advocate批判的検証
Step 5: Report Builder       → Google Slides提案資料の構成作成
```

## 共有リソース

### デザインシステム（awesome-design-md）
`/design-md/` に54社以上の企業デザインシステム（DESIGN.md）を格納。
LP制作・Web制作・提案資料作成時のデザインリファレンスとして活用。

- 一覧: `/design-md/README.md`
- 個別: `/design-md/{company-name}/DESIGN.md`
- 出典: [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)

## ディレクトリ構成

```
agents/
├── CLAUDE.md                              # プロジェクト設定
├── README.md                              # このファイル
├── orchestrator/                          # パイプライン実行ガイド
├── design-md/                             # 54社デザインシステム
│   ├── README.md
│   └── {company-name}/DESIGN.md
├── daily_reports/                         # 日次レポート
└── agents/
    ├── orchestrator/                      # エージェント間オーケストレーション
    ├── outputs/                           # エージェント出力保存先
    ├── ceo/prompt.md                      # 統括
    ├── retriever/prompt.md                # コンサル事業部
    ├── issue_structurer/prompt.md
    ├── market_researcher/prompt.md
    ├── analogy_finder/prompt.md
    ├── marketing_analyst/prompt.md
    ├── strategist/prompt.md
    ├── report_builder/prompt.md
    ├── document_builder/prompt.md
    ├── sales/prompt.md                    # 営業・マーケティング部門
    ├── marketing/prompt.md
    ├── customer_success/prompt.md
    ├── sns_operator/prompt.md
    ├── ad_operations/prompt.md
    ├── content_creator/prompt.md
    ├── seo_aieo/prompt.md
    ├── copywriter/prompt.md
    ├── pr/prompt.md
    ├── crm/prompt.md
    ├── chatbot/prompt.md
    ├── finance/prompt.md                  # 管理部門
    ├── hr/prompt.md
    ├── legal/prompt.md
    ├── compliance/prompt.md
    ├── tech_lead/prompt.md                # 開発部門
    ├── frontend_engineer/prompt.md
    ├── backend_engineer/prompt.md
    ├── infrastructure/prompt.md
    ├── qa_engineer/prompt.md
    ├── ui_ux_designer/prompt.md
    ├── data_engineer/prompt.md
    ├── designer/prompt.md
    ├── engineer/prompt.md
    ├── web_builder/                       # Web Builder パイプライン
    │   ├── orchestrator/
    │   ├── site_scanner/prompt.md
    │   ├── structure_analyzer/prompt.md
    │   ├── design_analyzer/prompt.md
    │   ├── motion_analyzer/prompt.md
    │   ├── interaction_analyzer/prompt.md
    │   ├── asset_collector/prompt.md
    │   ├── builder/prompt.md
    │   └── qa_reviewer/prompt.md
    ├── project_manager/prompt.md          # 横断チーム
    ├── qa_reviewer/prompt.md
    ├── kpi_dashboard/prompt.md
    ├── data_analyst/prompt.md
    └── analytics/prompt.md
```

## 事業領域
- SNSマーケティング（Instagram, TikTok, YouTube 運用/広告/クリエイティブ）
- 不動産業界特化型BPO（AIエージェント活用）
- AIシステム制作（補助金活用）
- LP等のWeb制作

## 前提条件

1. **Claude Code** の Maxプランに加入していること
2. **Notion MCP** が Claude Code に接続されていること
3. **Web検索** が Claude Code で使用可能であること

## セットアップ

1. このリポジトリを `git clone` する
2. Claude Code（Max プラン）を開く
3. MCP サーバーを設定する（Notion / Google Drive / Figma 等）
4. パイプラインまたは個別エージェントを実行

## 使い方

### 戦略提案パイプライン
```
/agents/orchestrator/PIPELINE.md の手順に従って、
Notion の議事録ページ「〇〇会議」からパイプラインを実行してください。
```

### Web Builder パイプライン
```
/agents/web_builder/orchestrator/run.md の手順に従って、
参考サイトのURLからWeb制作パイプラインを実行してください。
```

### 個別エージェント
```
/agents/{agent_name}/prompt.md を読み込んで実行してください。
```
