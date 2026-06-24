-- 代理店（agency）/ トスアップ（tossup）の区分をサービス料率と成約に追加

-- ① サービス料率に区分を追加し、一意制約を (service_id, plan_type, tier) に張り替え
alter table public.service_rewards
  add column if not exists plan_type text not null default 'agency'
  check (plan_type in ('agency', 'tossup'));

alter table public.service_rewards drop constraint if exists service_rewards_service_id_tier_key;
alter table public.service_rewards drop constraint if exists service_rewards_service_plantype_tier_key;
alter table public.service_rewards
  add constraint service_rewards_service_plantype_tier_key unique (service_id, plan_type, tier);

-- 既存（代理店）料率をトスアップにも複製（初期値。管理画面で調整可）
insert into public.service_rewards (service_id, plan_type, tier, type, rate, fixed_amount)
  select service_id, 'tossup', tier, type, rate, fixed_amount
    from public.service_rewards where plan_type = 'agency'
  on conflict (service_id, plan_type, tier) do nothing;

-- ② 成約に区分を追加（既定は代理店）
alter table public.deals
  add column if not exists reward_type text not null default 'agency'
  check (reward_type in ('agency', 'tossup'));
