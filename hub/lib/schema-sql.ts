// 自動生成: node scripts/hub-sync-schema.mjs（編集は db/*.sql に行い、このスクリプトで再生成する）
export const HUB_SCHEMA: { name: string; sql: string }[] = [
  {
    "name": "001_hub.sql",
    "sql": "-- 経営ハブのメンバー（経営陣以外のログイン用）。\n-- config/members.json の役員はそのまま有効。ここに登録したメンバーはメール＋パスワードでログインし、見られる項目を allow で制限できる。\nCREATE TABLE IF NOT EXISTS hub_member (\n  email text PRIMARY KEY,\n  name text NOT NULL,\n  role text NOT NULL CHECK (role IN ('exec','manager','staff')),\n  allow jsonb,                           -- NULL = 役割で見られる全項目。配列 = そのキーの項目だけ\n  password_hash text,\n  active boolean NOT NULL DEFAULT true,\n  must_change_password boolean NOT NULL DEFAULT true,\n  created_at timestamptz NOT NULL DEFAULT now(),\n  updated_at timestamptz NOT NULL DEFAULT now(),\n  updated_by text\n);\n"
  },
  {
    "name": "002_owner_name.sql",
    "sql": "-- 2026-10-26 オーナー依頼: 代表の氏名の表記を「吉川 英治」に統一する（「吉川 英二」は誤記）。\n-- メンバー管理（hub_member）に誤った表記で登録されていた行だけを直す。他の列・他のメンバーは変えない。\nUPDATE hub_member\nSET name = '吉川 英治', updated_at = now(), updated_by = 'migration:002_owner_name'\nWHERE regexp_replace(name, '\\s', '', 'g') = '吉川英二';\n"
  }
];
