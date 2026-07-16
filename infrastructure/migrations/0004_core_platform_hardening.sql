-- 0004_core_platform_hardening.sql
-- Phase 1: durable, tenant-isolated platform storage for sessions, jobs,
-- rate limits, workflow runs, audit logs, governance decisions, entitlements,
-- and billing usage. This migration does not modify 0001, 0002, or 0003.

create table if not exists public.platform_orgs (
  id text primary key,
  name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  user_id text,
  name text,
  state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  tool_name text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  bucket text not null,
  subject text not null,
  count integer not null default 0,
  limit_count integer not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, bucket, subject, window_start)
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  workflow_id text not null,
  status text not null check (status in ('draft', 'pending', 'running', 'completed', 'failed', 'cancelled')),
  definition jsonb not null default '{}'::jsonb,
  step_results jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  actor_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  decision text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.governance_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  actor_id text,
  action text not null,
  resource text not null,
  decision text not null check (decision in ('allow', 'downgrade', 'block')),
  reason text not null,
  policy_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  feature text not null,
  enabled boolean not null default true,
  hard_limit integer,
  used integer not null default 0,
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, feature, period_start)
);

create table if not exists public.billing_usage (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.platform_orgs(id) on delete cascade,
  entitlement_id uuid references public.entitlements(id) on delete set null,
  meter text not null,
  quantity integer not null check (quantity > 0),
  source text not null,
  source_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_sessions_org_updated_idx on public.agent_sessions(org_id, updated_at desc);
create index if not exists workflow_jobs_org_status_created_idx on public.workflow_jobs(org_id, status, created_at desc);
create index if not exists rate_limits_org_bucket_window_idx on public.rate_limits(org_id, bucket, window_end);
create index if not exists workflow_runs_org_workflow_started_idx on public.workflow_runs(org_id, workflow_id, started_at desc);
create index if not exists audit_logs_org_created_idx on public.audit_logs(org_id, created_at desc);
create index if not exists governance_decisions_org_created_idx on public.governance_decisions(org_id, created_at desc);
create index if not exists entitlements_org_feature_idx on public.entitlements(org_id, feature, period_end);
create index if not exists billing_usage_org_meter_created_idx on public.billing_usage(org_id, meter, created_at desc);

alter table public.platform_orgs enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.workflow_jobs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.governance_decisions enable row level security;
alter table public.entitlements enable row level security;
alter table public.billing_usage enable row level security;

create or replace function public.current_platform_org_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('app.org_id', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'org_id'
  )
$$;

create policy platform_orgs_org_isolation on public.platform_orgs
  using (id = public.current_platform_org_id())
  with check (id = public.current_platform_org_id());

create policy agent_sessions_org_isolation on public.agent_sessions
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy workflow_jobs_org_isolation on public.workflow_jobs
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy rate_limits_org_isolation on public.rate_limits
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy workflow_runs_org_isolation on public.workflow_runs
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy audit_logs_org_isolation on public.audit_logs
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy governance_decisions_org_isolation on public.governance_decisions
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy entitlements_org_isolation on public.entitlements
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());

create policy billing_usage_org_isolation on public.billing_usage
  using (org_id = public.current_platform_org_id())
  with check (org_id = public.current_platform_org_id());
