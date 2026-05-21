# Kickoff 手順 (Phase 0 → Phase 1 への踏み込み)

## Day 0
1. `coo` が本ドキュメントを読み込み、`TEAM.md` の15名を「アーチトラクチャレビュー会」に招集。
2. `franchise_business_analyst` が FC加盟店スタッフと本部 BO タスク担当者へのヒアリングシートを作成し、`coo` に提出。【手動タッチポイント】
3. `tech_lead` が「推奨スタック」を atomdenki/docs/03_target_architecture.md との訹齋を確認。違りがあれば PR で修正提案。

## Week 1
- `data_engineer`: 旧DB のスキーマダンプを要請 (ダンプ取得は入手しだいため人間担当と連携)
- `backend_engineer`: Phase 1 設計 (事前に Prisma スキーマを atomdenki repo でレビュー)
- `ui_ux_designer`: 現行スクリーンショット (添付資料同等) をもとに受注ボード画面モックを Figma で作成
- `bo_automation_specialist`: KPI初期値の計測計画を作成
- `qa_engineer`: 二重入力を防ぐ検査ケースをリストアップ

## Week 2、3
- Phase 1 実装を atomdenki の同名ブランチで進める。PR ごとに `qa_reviewer` ・`devils_advocate` の2名レビューを必須。

## Week 4
- Phase 1 反省会、 KPI K3 (BO手動工数) の初期スナップショットを取得。

## オーナーへのエスカレーションポイント
- 有料サービス (Resend / eFax / Sentry / Vercel Pro / Supabase Pro) の追加時
- FC加盟店との契約・同意書更新が必要な場合
- 40名超のBO人員の会記計画に関する HR議論 (リスキリング/配置転換)
