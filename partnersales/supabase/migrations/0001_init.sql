-- PartnerSales v1 初期スキーマ
-- 報酬計算は TS エンジン（lib/commission.ts）を単一の真実とする。
-- DB は生データ（サービス / パートナー / 成約）のみを保持し、報酬はアプリ側で算出する。

-- ─────────────────────────────────────────────
-- services: 弊社が販売する商材
-- ─────────────────────────────────────────────
create table if not exists public.services (
  id          text primary key,
  name        text not null,
  description text,
  unit_price  bigint,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- service_rewards: サービス × 段（1〜3）ごとの報酬定義
-- type = 'percentage' なら rate（0〜1）、'fixed' なら fixed_amount（円）
-- ─────────────────────────────────────────────
create table if not exists public.service_rewards (
  id           uuid primary key default gen_random_uuid(),
  service_id   text not null references public.services(id) on delete cascade,
  tier         smallint not null check (tier between 1 and 3),
  type         text not null check (type in ('percentage', 'fixed')),
  rate         numeric(6,4) check (rate is null or (rate >= 0 and rate <= 1)),
  fixed_amount bigint check (fixed_amount is null or fixed_amount >= 0),
  unique (service_id, tier),
  check (
    (type = 'percentage' and rate is not null) or
    (type = 'fixed' and fixed_amount is not null)
  )
);

-- ─────────────────────────────────────────────
-- partners: 紹介会社。parent_id で紹介ツリーを構成（親 = 紹介元）
-- ─────────────────────────────────────────────
create table if not exists public.partners (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  slug          text not null unique,
  parent_id     text references public.partners(id) on delete set null,
  referral_code text not null unique,
  contact_person text,
  contact_email  text,
  joined_at     date not null default current_date,
  status        text not null default 'active' check (status in ('active', 'dormant', 'suspended')),
  -- Notion 同期の追跡用（同期済みなら Notion ページ ID を保持）
  notion_page_id text,
  created_at    timestamptz not null default now()
);

create index if not exists partners_parent_id_idx on public.partners(parent_id);

-- ─────────────────────────────────────────────
-- deals: クライアント契約（成約）。報酬はこの金額を起点に計算
-- introducer_partner_id = クライアントを紹介したパートナー（tier1 受領者）
-- ─────────────────────────────────────────────
create table if not exists public.deals (
  id                   text primary key default gen_random_uuid()::text,
  service_id           text not null references public.services(id),
  client_name          text not null,
  introducer_partner_id text not null references public.partners(id),
  amount               bigint not null check (amount >= 0),
  status               text not null default 'pending' check (status in ('pending', 'confirmed', 'paid')),
  closed_at            date not null default current_date,
  is_self_deal         boolean not null default false,
  note                 text,
  created_at           timestamptz not null default now()
);

create index if not exists deals_introducer_idx on public.deals(introducer_partner_id);
create index if not exists deals_service_idx on public.deals(service_id);
create index if not exists deals_status_idx on public.deals(status);
