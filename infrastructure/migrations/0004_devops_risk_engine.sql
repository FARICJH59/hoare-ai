-- 0004_devops_risk_engine.sql
-- Adds tenant-isolated DevOps risk engine storage without modifying prior migrations.

create table if not exists public.devops_risk_profiles (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null default 'default',
  thresholds jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devops_risk_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  profile_id uuid references public.devops_risk_profiles(id) on delete set null,
  domain text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.devops_risk_scores (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  profile_id uuid references public.devops_risk_profiles(id) on delete set null,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
  domain_scores jsonb not null default '{}'::jsonb,
  event_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists devops_risk_profiles_org_id_idx on public.devops_risk_profiles(org_id);
create index if not exists devops_risk_events_org_id_created_at_idx on public.devops_risk_events(org_id, created_at desc);
create index if not exists devops_risk_scores_org_id_created_at_idx on public.devops_risk_scores(org_id, created_at desc);

alter table public.devops_risk_profiles enable row level security;
alter table public.devops_risk_events enable row level security;
alter table public.devops_risk_scores enable row level security;

create policy devops_risk_profiles_org_isolation on public.devops_risk_profiles
  using (org_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', current_setting('app.org_id', true)))
  with check (org_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', current_setting('app.org_id', true)));

create policy devops_risk_events_org_isolation on public.devops_risk_events
  using (org_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', current_setting('app.org_id', true)))
  with check (org_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', current_setting('app.org_id', true)));

create policy devops_risk_scores_org_isolation on public.devops_risk_scores
  using (org_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', current_setting('app.org_id', true)))
  with check (org_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id', current_setting('app.org_id', true)));
