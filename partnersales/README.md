# PartnerSales — 紹介報酬（3段階リファラル）管理

弊社の各サービスごとに報酬形態を設定し、**最大3段目** の紹介者まで報酬を分配する
MLM 型リファラル管理システム。パートナー個別ページと自社管理ダッシュボードを提供する。

> 仕様の詳細は [`docs/SPEC.md`](docs/SPEC.md) を参照。
> 現在は **事前準備フェーズ（v0）**: ドメインモデル・報酬エンジン・UI スキャフォールドまで。

## できること（v0）

- **報酬エンジン**（`lib/commission.ts`）— 成約から紹介ツリーを最大3段上って報酬を分配
- **リーダーボード / 重点サポート判定**（`lib/leaderboard.ts`）
- **自社管理ダッシュボード**（`/`）— 全体ツリー・ランキング・サポート候補・サマリ
- **パートナー個別ページ**（`/partners/[slug]`）— 自分のダウンラインツリーと発生報酬
- **サービス・報酬プラン一覧**（`/services`）

## セットアップ

```bash
cd partnersales
npm install --legacy-peer-deps
npm run dev      # http://localhost:4100
npm test         # 報酬エンジンのユニットテスト
npm run build    # out/ に静的サイトを書き出し
```

## 構成

```
partnersales/
├─ docs/SPEC.md          # 仕様書（報酬ルール・画面・ロードマップ）
├─ lib/
│  ├─ types.ts           # ドメインモデル
│  ├─ tree.ts            # 紹介ツリーの構築・アップライン探索
│  ├─ commission.ts      # 報酬計算エンジン（純粋関数）
│  ├─ commission.test.ts # ユニットテスト（vitest）
│  ├─ leaderboard.ts     # 成績集計・重点サポート判定
│  └─ metrics.ts         # シードから派生集計を組み立てるセレクタ
├─ data/seed.ts          # サンプルデータ（本番では Supabase に置換）
├─ components/TreeView.tsx
└─ app/                  # Next.js App Router（ダッシュボード / パートナー / サービス）
```

## 報酬ルール（要約）

| 段 | 受領者 | 例（SNS運用 30万成約） |
|----|--------|----------------------|
| tier1 | 成約したパートナー本人 | 15% = 45,000円 |
| tier2 | 1段上の紹介者 | 5% = 15,000円 |
| tier3 | 2段上の紹介者 | 2% = 6,000円 |

`percentage`（割合）/ `fixed`（固定額）をサービス × 段ごとに設定可。端数は円未満切り捨て。

## 次フェーズ（v1）

- Supabase スキーマ移行（パートナー登録・成約入力・認証）
- パートナーログインと個別ページの安全な発行（招待コード）
- Stripe / Webhook による成約の自動取り込み・報酬支払
