# PartnerSales — 紹介報酬（3段階リファラル）管理

弊社の各サービスごとに報酬形態を設定し、**最大3段目** の紹介者まで報酬を分配する
MLM 型リファラル管理システム。認証付きのパートナー専用ページと自社管理画面を提供する。

> 仕様の詳細は [`docs/SPEC.md`](docs/SPEC.md)、立ち上げ手順は [`docs/RUNBOOK.md`](docs/RUNBOOK.md) を参照。

## できること

- **報酬エンジン**（`lib/commission.ts`）— 成約から紹介ツリーを最大3段上って報酬を分配
- **リーダーボード / 重点サポート判定**（`lib/leaderboard.ts`）
- **支払い精算**（`lib/payout.ts`）— 累計 ¥50,000 下限・銀行振込・請求書フロー
- **報酬明細・月次締め**（`lib/statement.ts`）
- **認証ゲート**（middleware + HMAC セッション）でロール分離
  - パートナー: `/login` → `/me`（自分のツリー・報酬・明細のみ閲覧）
  - スタッフ: `/staff/login` → `/`（ダッシュボード）/ `/services` / `/partners/[slug]` / `/admin`
- **スタッフ管理画面**（`/admin`）— 成約入力・ステータス変更 / 支払い精算 / パートナー登録
  （書き込みはサーバアクション + service_role）
- **認証情報の一括発行**（`scripts/generate-credentials.mjs`）— Notion 保管用 CSV + 登録 SQL
- **Supabase 連携**（環境変数で自動切替）・**Notion 自動同期**（登録時に DB_協業先管理 へ）

## セットアップ

```bash
cd partnersales
npm install --legacy-peer-deps
npm run dev      # http://localhost:4100（スタッフは /staff/login、既定の合言葉 staff-demo）
npm test         # ユニットテスト
npm run build && npm run start   # 本番相当（動的レンダリング）
```

環境変数未設定でも **seed データ** で動作（スタッフログインのみ可能）。
パートナーログインや永続化には Supabase 設定が必要 → **[`docs/RUNBOOK.md`](docs/RUNBOOK.md)**。
認証ゲートのため **静的エクスポートではなく動的レンダリング**（Vercel / Node）で配信する。

## 構成

```
partnersales/
├─ docs/
│  ├─ SPEC.md              # 仕様書（報酬ルール・画面・ロードマップ）
│  └─ RUNBOOK.md           # 立ち上げ手順（手作業の項目）
├─ supabase/               # DB スキーマ・RLS・登録 RPC・seed
│  ├─ migrations/*.sql
│  ├─ seed.sql
│  └─ README.md
├─ lib/
│  ├─ types.ts             # ドメインモデル
│  ├─ tree.ts              # 紹介ツリーの構築・アップライン探索
│  ├─ commission.ts        # 報酬計算エンジン（純粋関数）+ test
│  ├─ leaderboard.ts       # 成績集計・重点サポート判定
│  ├─ payout.ts            # 支払い精算（¥50,000 下限・請求書フロー）+ test
│  ├─ statement.ts         # 報酬明細・月次締め + test
│  ├─ referral-code.ts     # 招待コード・スラッグ生成 + test
│  ├─ credentials.ts       # ログイン認証情報の生成 + test
│  ├─ metrics.ts           # データソースから派生集計を組み立てる
│  ├─ auth/                # セッション（HMAC）・ロール要求ヘルパー
│  ├─ db/                  # データ層（seed ↔ Supabase 自動切替）
│  └─ integrations/notion.ts # Notion DB_協業先管理 連携 + test
├─ data/                   # services（★報酬率）/ partners / deals / payouts / seed
├─ components/             # TreeView / PartnerView
├─ middleware.ts           # ルートごとのロール別アクセス制御
└─ app/
   ├─ (staff) /, /services, /admin, /partners/[slug], /staff/login
   ├─ (partner) /me, /login
   └─ api/auth/*           # partner-login / staff-login / logout
```

## 報酬ルール（要約）

報酬は **クライアント契約額** を起点に計算。クライアントを紹介したパートナーから
上方向へ最大3段に分配する（4段目以降は分配なし）。

| 段 | 受領者 | 例（SNS運用 100万契約） |
|----|--------|------------------------|
| tier1 | クライアントを直接紹介したパートナー | 10% = 100,000円 |
| tier2 | その1段上の紹介者 | 3% = 30,000円 |
| tier3 | さらに1段上の紹介者 | 2% = 20,000円 |

- `percentage`（割合）/ `fixed`（固定額）をサービス × 段ごとに設定可。端数は円未満切り捨て。
- **弊社の直接パートナー（ルート）が紹介した場合は tier1 のみ**。
- **自己成約**（パートナー自身が顧客）は tier1 を出さず、上位 tier2/tier3 には支払う。
- 報酬確定（`pending → confirmed → paid`）は **手動設定**。

### 報酬率を追加・変更する

`data/services.ts` の `services` 配列にサービスを足す／`rewards` を書き換えるだけ。
ロジック（`lib/commission.ts`）は変更不要。v1 で Supabase + 管理画面に置き換える。

## 次フェーズ（v1）

- Supabase スキーマ移行（パートナー登録・成約入力・認証）
- パートナーログインと個別ページの安全な発行（招待コード）
- 紹介者登録時の **Notion DB 自動連携**（`lib/integrations/notion.ts`）
- Stripe / Webhook による成約の自動取り込み・報酬支払
