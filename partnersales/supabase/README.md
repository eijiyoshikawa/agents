# Supabase スキーマ

PartnerSales v1 のデータベース定義。報酬計算は TS エンジン（`lib/commission.ts`）を
単一の真実とし、DB は生データ（サービス / パートナー / 成約）のみ保持する。

## テーブル

| テーブル | 役割 |
|---------|------|
| `services` | 弊社の商材 |
| `service_rewards` | サービス × 段（1〜3）の報酬定義（percentage / fixed） |
| `partners` | 紹介会社。`parent_id` で紹介ツリーを構成 |
| `deals` | クライアント契約（成約）。`introducer_partner_id` が tier1 受領者 |

## マイグレーション

| ファイル | 内容 |
|---------|------|
| `migrations/0001_init.sql` | テーブル・インデックス |
| `migrations/0002_rls.sql` | Row Level Security ポリシー |
| `migrations/0003_register_rpc.sql` | 登録用 RPC `register_partner`（SECURITY DEFINER） |
| `seed.sql` | サンプルデータ投入 |

## 適用方法

### Supabase ダッシュボード（最も簡単）
SQL Editor で `0001` → `0002` → `0003` → `seed.sql` の順に貼り付けて実行。

### Supabase CLI
```bash
supabase db push          # migrations/ を適用
psql "$DATABASE_URL" -f supabase/seed.sql   # サンプル投入（任意）
```

## RLS の方針（v1 初期）

- `services` / `service_rewards`: 公開（anon が SELECT 可）
- `partners` / `deals`: anon からの直接アクセス不可。
  - ビルド時の読み取り・管理操作は **service_role**（RLS バイパス）で行う
  - パートナー登録は **`register_partner` RPC**（SECURITY DEFINER）経由のみ
- パートナーログイン（自分のツリーのみ閲覧）は Supabase Auth で v1 後半に追加予定
