-- Phase 1 MVP hardening: durable runtime entities and schema versioning.

create table if not exists public.schema_versions (
  version integer primary key,
  description text not null,
  applied_at timestamptz not null default now()
);

insert into public.schema_versions (version, description)
values (1, 'phase1_mvp_hardening')
on conflict (version) do nothing;

create table if not exists public.sessions (
  id text primary key,
  name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.execution_jobs (
  id uuid primary key,
  tool_name text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.agents (
  id uuid primary key,
  name text not null,
  description text,
  status text not null default 'idle' check (status in ('idle', 'running', 'paused', 'stopped', 'error')),
  capabilities text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id uuid primary key,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'running', 'completed', 'failed', 'cancelled')),
  step_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text,
  supabase_user_id text,
  status text not null,
  latest_event_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_updated_at_idx on public.sessions (updated_at desc);
create index if not exists execution_jobs_created_at_idx on public.execution_jobs (created_at desc);
create index if not exists execution_jobs_status_idx on public.execution_jobs (status);
create index if not exists agents_updated_at_idx on public.agents (updated_at desc);
create index if not exists workflows_updated_at_idx on public.workflows (updated_at desc);
create index if not exists audit_events_created_at_idx on public.audit_events (created_at desc);
create index if not exists subscriptions_user_idx on public.subscriptions (supabase_user_id);

alter table public.schema_versions enable row level security;
alter table public.sessions enable row level security;
alter table public.execution_jobs enable row level security;
alter table public.agents enable row level security;
alter table public.workflows enable row level security;
alter table public.audit_events enable row level security;
alter table public.subscriptions enable row level security;
