-- パートナー登録用の RPC（SECURITY DEFINER）
-- anon は partners を直接 SELECT/INSERT できない（RLS）ため、
-- 招待コードによる親解決と一意性担保を伴う登録だけをこの関数経由で許可する。
--
-- クライアント（lib/db/register.ts）が slugify / コード生成（テスト済みの TS）を行い、
-- 候補値を渡す。本関数はサーバ側で一意性を保証し、衝突時はサフィックスを付与する。

create or replace function public.register_partner(
  p_name          text,
  p_person        text,
  p_email         text,
  p_referrer_code text,
  p_desired_slug  text,
  p_desired_code  text
)
returns table (id text, slug text, referral_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id text;
  v_slug      text;
  v_code      text;
  v_id        text := gen_random_uuid()::text;
  v_n         int := 2;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception '会社名は必須です';
  end if;

  -- 紹介元（親）を招待コードで解決。未指定なら null（ルート）
  if coalesce(trim(p_referrer_code), '') <> '' then
    select partners.id into v_parent_id
      from partners
     where partners.referral_code = trim(p_referrer_code)
     limit 1;
    if v_parent_id is null then
      raise exception '紹介コードが見つかりません: %', p_referrer_code;
    end if;
  end if;

  -- スラッグの一意化
  v_slug := coalesce(nullif(trim(p_desired_slug), ''), 'partner');
  while exists (select 1 from partners where partners.slug = v_slug) loop
    v_slug := coalesce(nullif(trim(p_desired_slug), ''), 'partner') || '-' || v_n;
    v_n := v_n + 1;
  end loop;

  -- 招待コードの一意化（衝突時はランダムサフィックス）
  v_code := coalesce(nullif(trim(p_desired_code), ''), 'PTNR-' || upper(substr(md5(random()::text), 1, 4)));
  while exists (select 1 from partners where partners.referral_code = v_code) loop
    v_code := v_code || upper(substr(md5(random()::text), 1, 2));
  end loop;

  insert into partners (id, name, slug, parent_id, referral_code, contact_person, contact_email, status)
  values (v_id, trim(p_name), v_slug, v_parent_id, v_code,
          nullif(trim(p_person), ''), nullif(trim(p_email), ''), 'active');

  return query select v_id, v_slug, v_code;
end;
$$;

-- anon / authenticated に実行権限を付与（INSERT 権限自体は不要 = 関数経由のみ）
grant execute on function public.register_partner(text, text, text, text, text, text) to anon, authenticated;
