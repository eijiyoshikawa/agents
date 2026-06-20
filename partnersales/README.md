# PartnerSales — 紹介報酬（3段階リファラル）管理

弊社の各サービスごとに報酬形態を設定し、**最大3段目** の紹介者まで報酬を分配する
MLM 型リファラル管理システム。パートナー個別ページと自社管理ダッシュボードを提供する。

> 仕様の詳細は [`docs/SPEC.md`](docs/SPEC.md) を参照。
> 現在は **事前準備フェーズ（v0）**: ドメインモデル・報酬エンジン・UI スキャフォールドまで。

## できること

- **報酬エンジン**（`lib/commission.ts`）— 成約から紹介ツリーを最大3段上って報酬を分配
- **リーダーボード / 重点サポート判定**（`lib/leaderboard.ts`）
- **自社管理ダッシュボード**（`/`）— 全体ツリー・ランキング・サポート候補・サマリ
- **パートナー個別ページ**（`/partners/[slug]`）— 自分のダウンラインツリーと発生報酬
- **サービス・報酬プラン一覧**（`/services`）
- **パートナー登録フォーム**（`/register`）— 招待コード（`?ref=`）対応・個別ページ発行
- **Supabase 連携**（環境変数で自動切替）・**Notion 連携**（DB_協業先管理 へ同期）

## セットアップ

```bash
cd partnersales
npm install --legacy-peer-deps
npm run dev      # http://localhost:4100
npm test         # ユニットテスト（21件）
npm run build    # out/ に静的サイトを書き出し
```

環境変数を設定しなければ **seed データ** で動作する。
Supabase / Notion / デプロイの設定手順は **[`docs/RUNBOOK.md`](docs/RUNBOOK.md)** を参照。
DB スキーマは [`supabase/`](supabase/) を参照。

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
│  ├─ referral-code.ts     # 招待コード・スラッグ生成 + test
│  ├─ metrics.ts           # データソースから派生集計を組み立てる
│  ├─ db/                  # データ層（seed ↔ Supabase 自動切替）
│  │  ├─ index.ts          # getDataSource()
│  │  ├─ seed-source.ts / supabase-source.ts / supabase.ts
│  │  └─ register.ts       # 登録 RPC 呼び出し（ブラウザ）
│  └─ integrations/notion.ts # Notion DB_協業先管理 連携 + test
├─ data/
│  ├─ services.ts          # ★ サービス定義と報酬率（ここに追加・変更）
│  ├─ partners.ts          # パートナーと紹介ツリー
│  ├─ deals.ts             # クライアント契約（成約）
│  └─ seed.ts              # 上記の集約エクスポート
├─ components/TreeView.tsx
└─ app/                    # ダッシュボード / partners / services / register
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
