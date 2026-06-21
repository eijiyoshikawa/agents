-- 認証情報・支払い精算・スタッフ操作の RPC
-- パスワード／スタッフ合言葉のハッシュ化に pgcrypto を使う
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- partner_credentials: 事前発行するログイン認証情報
-- パスワードはハッシュで保持。未割り当て(unassigned)を発行しておき、
-- スタッフが登録時に partner へ割り当てる。
-- ─────────────────────────────────────────────
create table if not exists public.partner_credentials (
  login_id      text primary key,
  password_hash text not null,
  partner_id    text references public.partners(id) on delete set null,
  status        text not null default 'unassigned' check (status in ('unassigned', 'active', 'disabled')),
  issued_at     timestamptz not null default now(),
  assigned_at   timestamptz
);

-- ─────────────────────────────────────────────
-- payouts: 支払い精算レコード
-- 弊社からの銀行振込のみ。請求書受領(invoiced) → 振込完了(paid)。
-- ─────────────────────────────────────────────
create table if not exists public.payouts (
  id          text primary key default gen_random_uuid()::text,
  partner_id  text not null references public.partners(id),
  amount      bigint not null check (amount >= 0),
  status      text not null default 'invoiced' check (status in ('invoiced', 'paid')),
  invoice_no  text,
  invoiced_at date,
  paid_at     date,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists payouts_partner_idx on public.payouts(partner_id);

-- ─────────────────────────────────────────────
-- app_secrets: スタッフ操作用の合言葉（ハッシュ）を保持
-- ─────────────────────────────────────────────
create table if not exists public.app_secrets (
  key        text primary key,
  value_hash text not null
);

alter table public.partner_credentials enable row level security;
alter table public.payouts             enable row level security;
alter table public.app_secrets         enable row level security;
-- いずれも anon ポリシーを作らない → RPC / service_role 経由のみ

-- スタッフ合言葉を設定／更新する（service_role で実行）
create or replace function public.set_staff_secret(p_secret text)
returns void language sql security definer set search_path = public, extensions as $$
  insert into app_secrets (key, value_hash)
  values ('staff', crypt(p_secret, gen_salt('bf')))
  on conflict (key) do update set value_hash = excluded.value_hash;
$$;

-- 合言葉を検証。不一致なら例外
create or replace function public.assert_staff(p_secret text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text;
begin
  select value_hash into v_hash from app_secrets where key = 'staff';
  if v_hash is null or crypt(coalesce(p_secret, ''), v_hash) <> v_hash then
    raise exception '認証に失敗しました（スタッフ合言葉が不正です）';
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- staff_register_partner: スタッフがアポ後に登録し、事前発行の認証情報を割り当てる
-- ─────────────────────────────────────────────
create or replace function public.staff_register_partner(
  p_secret        text,
  p_name          text,
  p_person        text,
  p_email         text,
  p_referrer_code text,
  p_desired_slug  text,
  p_desired_code  text,
  p_login_id      text
)
returns table (id text, slug text, referral_code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_parent_id text;
  v_slug text;
  v_code text;
  v_id text := gen_random_uuid()::text;
  v_n int := 2;
  v_cred_status text;
begin
  perform assert_staff(p_secret);
  if coalesce(trim(p_name), '') = '' then raise exception '会社名は必須です'; end if;

  -- 認証情報の存在・未割り当て確認
  select status into v_cred_status from partner_credentials where login_id = p_login_id;
  if v_cred_status is null then raise exception 'ログインID が見つかりません: %', p_login_id; end if;
  if v_cred_status <> 'unassigned' then raise exception 'ログインID は既に割り当て済みです: %', p_login_id; end if;

  -- 紹介元（親）を招待コードで解決
  if coalesce(trim(p_referrer_code), '') <> '' then
    select partners.id into v_parent_id from partners where partners.referral_code = trim(p_referrer_code) limit 1;
    if v_parent_id is null then raise exception '紹介コードが見つかりません: %', p_referrer_code; end if;
  end if;

  -- スラッグ一意化
  v_slug := coalesce(nullif(trim(p_desired_slug), ''), 'partner');
  while exists (select 1 from partners where partners.slug = v_slug) loop
    v_slug := coalesce(nullif(trim(p_desired_slug), ''), 'partner') || '-' || v_n;
    v_n := v_n + 1;
  end loop;

  -- 招待コード一意化
  v_code := coalesce(nullif(trim(p_desired_code), ''), 'PTNR-' || upper(substr(md5(random()::text), 1, 4)));
  while exists (select 1 from partners where partners.referral_code = v_code) loop
    v_code := v_code || upper(substr(md5(random()::text), 1, 2));
  end loop;

  insert into partners (id, name, slug, parent_id, referral_code, contact_person, contact_email, status)
  values (v_id, trim(p_name), v_slug, v_parent_id, v_code, nullif(trim(p_person), ''), nullif(trim(p_email), ''), 'active');

  -- 認証情報を割り当て
  update partner_credentials
     set partner_id = v_id, status = 'active', assigned_at = now()
   where login_id = p_login_id;

  return query select v_id, v_slug, v_code;
end;
$$;

-- ─────────────────────────────────────────────
-- partner_login: ログイン ID / パスワードを検証し、本人のパートナー情報を返す
-- ─────────────────────────────────────────────
create or replace function public.partner_login(p_login_id text, p_password text)
returns table (partner_id text, slug text, name text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_status text; v_pid text;
begin
  select password_hash, status, partner_id into v_hash, v_status, v_pid
    from partner_credentials where login_id = p_login_id;
  if v_hash is null or crypt(coalesce(p_password, ''), v_hash) <> v_hash then
    raise exception 'ログインに失敗しました';
  end if;
  if v_status <> 'active' or v_pid is null then
    raise exception 'この認証情報は無効です';
  end if;
  return query select p.id, p.slug, p.name from partners p where p.id = v_pid;
end;
$$;

-- ─────────────────────────────────────────────
-- 成約管理（スタッフ）
-- ─────────────────────────────────────────────
create or replace function public.staff_create_deal(
  p_secret text, p_service_id text, p_client_name text,
  p_introducer_partner_id text, p_amount bigint, p_status text,
  p_closed_at date, p_is_self_deal boolean, p_note text
)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := gen_random_uuid()::text;
begin
  perform assert_staff(p_secret);
  insert into deals (id, service_id, client_name, introducer_partner_id, amount, status, closed_at, is_self_deal, note)
  values (v_id, p_service_id, p_client_name, p_introducer_partner_id, p_amount,
          coalesce(p_status, 'pending'), coalesce(p_closed_at, current_date),
          coalesce(p_is_self_deal, false), nullif(trim(p_note), ''));
  return v_id;
end;
$$;

create or replace function public.staff_set_deal_status(p_secret text, p_deal_id text, p_status text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_staff(p_secret);
  if p_status not in ('pending', 'confirmed', 'paid') then raise exception '不正なステータス: %', p_status; end if;
  update deals set status = p_status where id = p_deal_id;
end;
$$;

-- ─────────────────────────────────────────────
-- 支払い精算（スタッフ）
-- ─────────────────────────────────────────────
create or replace function public.staff_record_payout(
  p_secret text, p_partner_id text, p_amount bigint,
  p_status text, p_invoice_no text, p_note text
)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := gen_random_uuid()::text;
begin
  perform assert_staff(p_secret);
  insert into payouts (id, partner_id, amount, status, invoice_no, invoiced_at, paid_at, note)
  values (v_id, p_partner_id, p_amount, coalesce(p_status, 'invoiced'), nullif(trim(p_invoice_no), ''),
          current_date, case when p_status = 'paid' then current_date end, nullif(trim(p_note), ''));
  return v_id;
end;
$$;

create or replace function public.staff_mark_payout_paid(p_secret text, p_payout_id text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform assert_staff(p_secret);
  update payouts set status = 'paid', paid_at = current_date where id = p_payout_id;
end;
$$;

-- 実行権限（合言葉でガードするため anon に付与）
grant execute on function public.staff_register_partner(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.partner_login(text, text) to anon, authenticated;
grant execute on function public.staff_create_deal(text, text, text, text, bigint, text, date, boolean, text) to anon, authenticated;
grant execute on function public.staff_set_deal_status(text, text, text) to anon, authenticated;
grant execute on function public.staff_record_payout(text, text, bigint, text, text, text) to anon, authenticated;
grant execute on function public.staff_mark_payout_paid(text, text) to anon, authenticated;
-- set_staff_secret は service_role のみ（grant しない）
