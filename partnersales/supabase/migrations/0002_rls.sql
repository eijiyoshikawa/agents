-- Row Level Security ポリシー
-- 方針（v1 初期）:
--   - 管理用の読み書きは service_role（RLS をバイパス）で行う。
--     静的サイトのビルド時データ取得・管理操作はサーバ側で service_role を使う。
--   - サービスと報酬プランは公開情報として anon に SELECT を許可。
--   - パートナー登録フォームからの匿名 INSERT を限定的に許可（自己紹介データのみ）。
--   - パートナー / 成約の SELECT は anon に許可しない（PII・金額を含むため）。
-- 認証付きのパートナーログイン（自分のツリーのみ閲覧）は v1 後半で Supabase Auth により実装する。

alter table public.services        enable row level security;
alter table public.service_rewards enable row level security;
alter table public.partners        enable row level security;
alter table public.deals           enable row level security;

-- サービス・報酬プランは公開で読める
create policy "services are readable by anyone"
  on public.services for select
  using (true);

create policy "service_rewards are readable by anyone"
  on public.service_rewards for select
  using (true);

-- パートナー登録は register_partner() RPC（SECURITY DEFINER, 0003）経由のみ。
-- そのため partners への直接の anon ポリシーは作らない。
-- → anon からの partners / deals への直接アクセスは不可。
--   ビルド時データ取得・管理操作・登録 RPC は service_role / definer で行う。
