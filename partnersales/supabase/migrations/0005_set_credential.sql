-- 登録時にパスワードを生成 → DBでハッシュ化して保存する RPC。
-- サーバアクション（service_role）から呼ぶ。crypt/gen_salt のため search_path に extensions を含める。
create extension if not exists pgcrypto;

create or replace function public.set_credential(
  p_login_id   text,
  p_password   text,
  p_partner_id text
)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into partner_credentials (login_id, password_hash, partner_id, status, assigned_at)
  values (p_login_id, crypt(p_password, gen_salt('bf')), p_partner_id, 'active', now())
  on conflict (login_id) do update
    set password_hash = excluded.password_hash,
        partner_id    = excluded.partner_id,
        status        = 'active',
        assigned_at   = now();
end;
$$;

grant execute on function public.set_credential(text, text, text) to service_role;
