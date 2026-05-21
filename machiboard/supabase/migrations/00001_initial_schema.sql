-- まちボード: Initial Database Schema
-- Run this migration against your Supabase project

-- Enable required extensions
create extension if not exists "pgcrypto";

-- =============================================================
-- 1. profiles (extends auth.users)
-- =============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  locale text not null default 'ja',
  font_size_preference text not null default 'default'
    check (font_size_preference in ('default', 'large', 'xlarge')),
  high_contrast boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 2. organizations (tenants)
-- =============================================================
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('自治会', '町内会', '管理組合', 'その他')),
  postal_code text,
  address text,
  household_count integer not null default 0,
  invite_code text unique not null default substr(encode(gen_random_bytes(6), 'hex'), 1, 8),
  stripe_customer_id text unique,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'mini', 'standard', 'premium')),
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- =============================================================
-- 3. memberships (user <-> organization, many-to-many)
-- =============================================================
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique(user_id, organization_id)
);

alter table public.memberships enable row level security;

-- RLS: members can see other members of their organization
create policy "Members can view org memberships"
  on public.memberships for select
  using (
    organization_id in (
      select m.organization_id from public.memberships m where m.user_id = auth.uid()
    )
  );

create policy "Admins can insert memberships"
  on public.memberships for insert
  with check (
    organization_id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
    or
    -- Allow self-join (for invite code flow)
    user_id = auth.uid()
  );

create policy "Admins can delete memberships"
  on public.memberships for delete
  using (
    organization_id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

-- Organization RLS depends on memberships
create policy "Members can view their organizations"
  on public.organizations for select
  using (
    id in (select m.organization_id from public.memberships m where m.user_id = auth.uid())
  );

create policy "Admins can update their organizations"
  on public.organizations for update
  using (
    id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

-- Anyone can create an organization (they become admin)
create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- =============================================================
-- 4. bulletins
-- =============================================================
create table public.bulletins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  content text not null,
  category text not null default 'general'
    check (category in ('general', 'garbage', 'disaster', 'event', 'important')),
  priority text not null default 'normal'
    check (priority in ('normal', 'high', 'urgent')),
  image_urls text[] not null default '{}',
  attachment_urls text[] not null default '{}',
  pdf_url text,
  published_at timestamptz,
  scheduled_at timestamptz,
  is_draft boolean not null default true,
  notification_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bulletins_org_published on public.bulletins(organization_id, published_at desc);
create index bulletins_org_category on public.bulletins(organization_id, category);

alter table public.bulletins enable row level security;

create policy "Members can view bulletins"
  on public.bulletins for select
  using (
    organization_id in (
      select m.organization_id from public.memberships m where m.user_id = auth.uid()
    )
  );

create policy "Admins can insert bulletins"
  on public.bulletins for insert
  with check (
    organization_id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

create policy "Admins can update bulletins"
  on public.bulletins for update
  using (
    organization_id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

create policy "Admins can delete bulletins"
  on public.bulletins for delete
  using (
    organization_id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

-- =============================================================
-- 5. read_confirmations
-- =============================================================
create table public.read_confirmations (
  id uuid primary key default gen_random_uuid(),
  bulletin_id uuid not null references public.bulletins(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(bulletin_id, user_id)
);

alter table public.read_confirmations enable row level security;

create policy "Members can view read confirmations in their org"
  on public.read_confirmations for select
  using (
    bulletin_id in (
      select b.id from public.bulletins b
      join public.memberships m on m.organization_id = b.organization_id
      where m.user_id = auth.uid()
    )
  );

create policy "Users can insert own read confirmations"
  on public.read_confirmations for insert
  with check (
    auth.uid() = user_id
    and bulletin_id in (
      select b.id from public.bulletins b
      join public.memberships m on m.organization_id = b.organization_id
      where m.user_id = auth.uid()
    )
  );

-- =============================================================
-- 6. notification_preferences
-- =============================================================
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  line_enabled boolean not null default false,
  line_user_id text,
  push_subscription jsonb,
  created_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================
-- 7. subscriptions (Stripe)
-- =============================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Admins can view subscriptions"
  on public.subscriptions for select
  using (
    organization_id in (
      select m.organization_id from public.memberships m
      where m.user_id = auth.uid() and m.role = 'admin'
    )
  );

-- =============================================================
-- Updated_at trigger
-- =============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger update_organizations_updated_at before update on public.organizations
  for each row execute function public.update_updated_at();
create trigger update_bulletins_updated_at before update on public.bulletins
  for each row execute function public.update_updated_at();
