# Franchise Order Management チーム編成

既存エージェント組織から選択した12名 + 業務特化の新規3名 = **15名体制**で実行。

## 編成一覧

| 受け持ち | エージェント | 本プロジェクトでの物件 |
|---|---|---|
| 統括 | `coo` | 週次進捗レビュー・BO部門との人間面調整 |
| オーナー | `ceo` | KPI承認・コスト承認 (有料サービス追加時の閾) |
| プロジェクト管理 | `project_manager` | WBS・スケジュール・適応チェンジマネジメント |
| 業務要件 (新規) | `franchise_business_analyst` | FC業務ヒアリング・業務フロー見える化 |
| ワークフロー設計 (新規) | `order_workflow_designer` | Orderステータスマシン・ケースコンポジッション |
| 自動化 (新規) | `bo_automation_specialist` | BO人件費削減独立計測・RPA/スクリプト |
| テックリード | `tech_lead` | Next.js + Supabase + Prisma 上でのADR・アーキテクチャ |
| バックエンド | `backend_engineer` | Order/PO/Invoice API、イベントハンドラ、RLS |
| フロントエンド | `frontend_engineer` | apps/core, apps/member, apps/staff |
| UI/UX | `ui_ux_designer` | 現行スクリーンを参考にした設計システム |
| デザイン | `designer` | 画面デザイン・帳票PDFテンプレート |
| データ | `data_engineer` | レガシー SQL Server → Postgres ETL |
| インフラ | `infrastructure` | Vercel/Supabase設計・CI/CD |
| 品質 | `qa_engineer` | E2E (Playwright)、二重入力防止テスト |
| 品質検証 | `qa_reviewer` | ロール間一貫性・要件足並み検証 |
| 独立検証 | `devils_advocate` | スコープ拡張・金額・FC同意リスクを見身 |

## 連携上のポイント

- `franchise_business_analyst` が生成する「業務フロー」ドキュメントを `order_workflow_designer` と `tech_lead` がそれぞれドメイン・技術設計に落とし込む。
- `bo_automation_specialist` は Phase 1 以降、週次で KPI を集計して `kpi_dashboard` に入力。効果ぜ　 90% 未達の項目は `coo` へエスカレーション。
- `devils_advocate` は Phase 切り替えゲートごとに必須レビュー。
