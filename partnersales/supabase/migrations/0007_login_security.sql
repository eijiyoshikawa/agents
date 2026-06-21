-- ログインのレート制限（総当たり対策）と、パスワード再発行時のロック解除
create extension if not exists pgcrypto;

alter table public.partner_credentials add column if not exists failed_attempts int not null default 0;
alter table public.partner_credentials add column if not exists locked_until timestamptz;

-- partner_login: 5回連続失敗で15分ロック。成功でリセット。
create or replace function public.partner_login(p_login_id text, p_password text)
returns table (partner_id text, slug text, name text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_status text; v_pid text; v_locked timestamptz; v_fails int;
begin
  select pc.password_hash, pc.status, pc.partner_id, pc.locked_until, pc.failed_attempts
    into v_hash, v_status, v_pid, v_locked, v_fails
    from partner_credentials pc where pc.login_id = p_login_id;

  if v_hash is null then
    raise exception 'ログインに失敗しました';
  end if;

  if v_locked is not null and v_locked > now() then
    raise exception 'アカウントが一時ロックされています。約 % 分後に再度お試しください',
      greatest(1, ceil(extract(epoch from (v_locked - now())) / 60));
  end if;

  if crypt(coalesce(p_password, ''), v_hash) <> v_hash then
    update partner_credentials
       set failed_attempts = failed_attempts + 1,
           locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
     where login_id = p_login_id;
    raise exception 'ログインに失敗しました';
  end if;

  if v_status <> 'active' or v_pid is null then
    raise exception 'この認証情報は無効です';
  end if;

  update partner_credentials set failed_attempts = 0, locked_until = null where login_id = p_login_id;
  return query select p.id, p.slug, p.name from partners p where p.id = v_pid;
end;
$$;

-- set_credential: パスワード設定/再発行時にロックと失敗回数もリセット
create or replace function public.set_credential(
  p_login_id text, p_password text, p_partner_id text
)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into partner_credentials (login_id, password_hash, partner_id, status, assigned_at, failed_attempts, locked_until)
  values (p_login_id, crypt(p_password, gen_salt('bf')), p_partner_id, 'active', now(), 0, null)
  on conflict (login_id) do update
    set password_hash   = excluded.password_hash,
        partner_id      = excluded.partner_id,
        status          = 'active',
        assigned_at     = now(),
        failed_attempts = 0,
        locked_until    = null;
end;
$$;

grant execute on function public.set_credential(text, text, text) to service_role;
