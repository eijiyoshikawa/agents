-- 料率パターン（紹介者別の特別料率）にも代理店/トスアップ区分を追加
alter table public.rate_plan_rewards
  add column if not exists plan_type text not null default 'agency'
  check (plan_type in ('agency', 'tossup'));

alter table public.rate_plan_rewards drop constraint if exists rate_plan_rewards_plan_id_service_id_tier_key;
alter table public.rate_plan_rewards drop constraint if exists rate_plan_rewards_plan_service_plantype_tier_key;
alter table public.rate_plan_rewards
  add constraint rate_plan_rewards_plan_service_plantype_tier_key unique (plan_id, service_id, plan_type, tier);

-- 既存（代理店）の上書き料率をトスアップにも複製（初期値）
insert into public.rate_plan_rewards (plan_id, service_id, plan_type, tier, type, rate, fixed_amount)
  select plan_id, service_id, 'tossup', tier, type, rate, fixed_amount
    from public.rate_plan_rewards where plan_type = 'agency'
  on conflict (plan_id, service_id, plan_type, tier) do nothing;
