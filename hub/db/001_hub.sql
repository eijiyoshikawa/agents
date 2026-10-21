-- 経営ハブのメンバー（経営陣以外のログイン用）。
-- config/members.json の役員はそのまま有効。ここに登録したメンバーはメール＋パスワードでログインし、見られる項目を allow で制限できる。
CREATE TABLE IF NOT EXISTS hub_member (
  email text PRIMARY KEY,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('exec','manager','staff')),
  allow jsonb,                           -- NULL = 役割で見られる全項目。配列 = そのキーの項目だけ
  password_hash text,
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
