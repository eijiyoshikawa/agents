# 新リポジトリ ディレクトリ構成（提案）

Next.js（App Router）+ Prisma を前提とした初期構成案。`docs/13`・`docs/14` の画面/APIに対応。

```
keibi-pro/
├─ README.md
├─ .env.example
├─ package.json
├─ docs/                      # ← 旧 keibi-pro/ の設計ドキュメント一式を移植
│  ├─ README.md ... 15_jbca-catalog-findings.md
│  └─ source/                 # 一次ソース（カタログ）
├─ prisma/
│  ├─ schema.prisma           # ← docs/12 を実装化
│  ├─ migrations/
│  └─ seed.ts                 # サンプルデータ
├─ mockups/                   # 高忠実度HTMLモック（配置ボード/モバイル日報）
├─ src/
│  ├─ app/                    # App Router
│  │  ├─ (auth)/login/
│  │  ├─ (admin)/             # 内勤（PC）
│  │  │  ├─ dashboard/        # ホーム（残作業カウンタ）
│  │  │  ├─ dispatch/         # 配置ボード（受注+配置統合）★
│  │  │  ├─ timesheets/       # 勤務実績グリッド（視点切替）
│  │  │  ├─ billing/          # 請求ウィザード
│  │  │  ├─ payments/         # 入金・売掛
│  │  │  ├─ payroll/          # 給与ウィザード
│  │  │  ├─ reports/          # 帳票センター
│  │  │  └─ masters/          # 得意先/配置先/隊員/勤務/単価 …
│  │  ├─ (mobile)/m/          # 現場・隊員（スマホ/PWA）
│  │  │  ├─ home/             # 今日の予定
│  │  │  ├─ report/           # 日報提出（電子サイン/紙写真・文字サイズ切替）
│  │  │  ├─ punch/            # 上下番打刻
│  │  │  ├─ shift/            # シフト希望
│  │  │  └─ payslip/          # 給与明細閲覧
│  │  └─ api/                 # Route Handlers（docs/14 のAPI）
│  │     ├─ dispatch/ assignments/ attendances/ daily-reports/
│  │     ├─ billing/ payments/ payroll/ reports/
│  │     └─ masters/ ...
│  ├─ components/             # UI（feerトークン・アクセシブル）
│  │  ├─ ui/                  # Button/Grid/StatusPill/FontSizeToggle …
│  │  ├─ dispatch/            # DispatchBoard/GuardPicker/NgDialog/RouteSearch
│  │  └─ mobile/              # SignaturePad/PhotoCapture/StepFlow …
│  ├─ lib/                    # 計算ロジック（請求/給与/締め/単価/距離）
│  │  ├─ billing.ts payroll.ts rounding.ts overtime.ts
│  │  └─ constraints.ts       # 同配置NG/資格/休日/ダブルブッキング
│  ├─ server/                 # サービス層・Prismaクライアント・RLS
│  ├─ integrations/google-drive/   # 日報写真の保存・控え送信
│  └─ types/                  # Enum/DTO（docs/12 §Enum）
├─ tests/
│  ├─ unit/ integration/ e2e/        # 70/20/10（docs 開発標準）
│  └─ a11y/                          # アクセシビリティ（docs/10 §6）
└─ .github/workflows/ci.yml          # lint/test/build
```

## 実装の優先順（Phase 1）

1. `prisma/schema.prisma` 確定 → migrate → seed（モチベーションアップ㈱/1交差点 …）
2. マスタ CRUD（得意先/配置先[締め・単価]/隊員/勤務種別）
3. `dispatch`（受注+配置ボード、制約チェック、隊員ピッカー、路線/資格）
4. `timesheets`（実績グリッド、単価オーバーライド）
5. `billing`（締め集計→請求書PDF・インボイス）
6. `payments`（消込・売掛）
7. `m/report`（モバイル日報・Drive保存・控え送信）

## 計算ロジックはテストファースト

`docs/05 §8` のテスト観点を `tests/unit/` に先に書く（単価0=マスタ参照、同配置NG、締め後再集計、介護保険40歳、端数/外税内税、夜勤跨日、インボイス）。
