// 自動生成: node scripts/hub-sync-schema.mjs（編集は db/*.sql に行い、このスクリプトで再生成する）
export const HUB_SCHEMA: { name: string; sql: string }[] = [
  {
    "name": "001_hub.sql",
    "sql": "-- 経営ハブのメンバー（経営陣以外のログイン用）。\n-- config/members.json の役員はそのまま有効。ここに登録したメンバーはメール＋パスワードでログインし、見られる項目を allow で制限できる。\nCREATE TABLE IF NOT EXISTS hub_member (\n  email text PRIMARY KEY,\n  name text NOT NULL,\n  role text NOT NULL CHECK (role IN ('exec','manager','staff')),\n  allow jsonb,                           -- NULL = 役割で見られる全項目。配列 = そのキーの項目だけ\n  password_hash text,\n  active boolean NOT NULL DEFAULT true,\n  must_change_password boolean NOT NULL DEFAULT true,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now(),\n  updated_by text\n);\n"
  }
];
