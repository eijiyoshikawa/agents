-- 成約時の料率スナップショット & 紹介者別の料率パターン

-- ① 成約に、その時点の3段料率スナップショットを保持（jsonb）
--    例: [{"tier":1,"type":"percentage","rate":0.10},{"tier":2,...}]
--    既存成約（null）はサービス既定にフォールバックして計算される。
alter table public.deals add column if not exists reward_snapshot jsonb;

-- ② 料率パターン（名前付き）
create table if not exists public.rate_plans (
  id         text primary key default ('rp-' || substr(md5(random()::text), 1, 8)),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ③ 料率パターン × サービス × 段 の報酬定義
create table if not exists public.rate_plan_rewards (
  id           uuid primary key default gen_random_uuid(),
  plan_id      text not null references public.rate_plans(id) on delete cascade,
  service_id   text not null references public.services(id) on delete cascade,
  tier         smallint not null check (tier between 1 and 3),
  type         text not null check (type in ('percentage', 'fixed')),
  rate         numeric(6,4) check (rate is null or (rate >= 0 and rate <= 1)),
  fixed_amount bigint check (fixed_amount is null or fixed_amount >= 0),
  unique (plan_id, service_id, tier),
  check (
    (type = 'percentage' and rate is not null) or
    (type = 'fixed' and fixed_amount is not null)
  )
);

-- ④ パートナーに適用する料率パターン（null = サービス既定）
alter table public.partners
  add column if not exists rate_plan_id text references public.rate_plans(id) on delete set null;

alter table public.rate_plans         enable row level security;
alter table public.rate_plan_rewards  enable row level security;
-- anon ポリシーは作らない（service_role / RPC 経由のみ）
