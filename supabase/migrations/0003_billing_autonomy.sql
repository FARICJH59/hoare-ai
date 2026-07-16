-- Autonomous billing and entitlement system for HOARE.ai.

insert into public.schema_versions (version, description)
values (3, 'autonomous_billing_entitlements')
on conflict (version) do nothing;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  monthly_price_cents integer not null default 0,
  yearly_price_cents integer not null default 0,
  is_enterprise boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.billing_plans(id) on delete cascade,
  entitlement_code text not null,
  limit_per_month integer,
  limit_per_day integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(plan_id, entitlement_code)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  user_id text,
  plan_id uuid references public.billing_plans(id) on delete set null,
  event_type text not null check (event_type in (
    'AGENT_RUN',
    'WORKFLOW_RUN',
    'ENERGY_OPT_RUN',
    'WEB_SEARCH',
    'GOVERNANCE_CHECK',
    'OBSERVABILITY_DASHBOARD_VIEW',
    'DOMAIN_TOOL_INVOCATION'
  )),
  event_context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  billed boolean not null default false,
  cost_cents integer not null default 0
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  plan_id uuid references public.billing_plans(id) on delete set null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_cost_cents integer not null default 0,
  status text not null check (status in ('PENDING', 'PAID', 'FAILED')),
  stripe_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, period_start, period_end)
);

create table if not exists public.org_billing_state (
  org_id text primary key,
  plan_id uuid references public.billing_plans(id) on delete set null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  usage_reset_at timestamptz not null,
  last_invoice_id uuid references public.billing_invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_entitlements_plan_idx on public.billing_entitlements (plan_id);
create index if not exists usage_events_org_period_idx on public.usage_events (org_id, occurred_at desc);
create index if not exists usage_events_type_idx on public.usage_events (event_type);
create index if not exists usage_events_billed_idx on public.usage_events (billed);
create index if not exists billing_invoices_org_period_idx on public.billing_invoices (org_id, period_start desc, period_end desc);
create index if not exists billing_invoices_status_idx on public.billing_invoices (status);

alter table public.billing_plans enable row level security;
alter table public.billing_entitlements enable row level security;
alter table public.usage_events enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.org_billing_state enable row level security;

insert into public.billing_plans (id, name, code, description, monthly_price_cents, yearly_price_cents, is_enterprise, metadata)
values
  ('00000000-0000-4000-8000-000000000101', 'Starter', 'STARTER', 'MVP plan for early HOARE.ai usage.', 0, 0, false, '{"overageCostCents":{"AGENT_RUN":1,"WORKFLOW_RUN":5,"ENERGY_OPT_RUN":25,"WEB_SEARCH":1,"GOVERNANCE_CHECK":1,"OBSERVABILITY_DASHBOARD_VIEW":1,"DOMAIN_TOOL_INVOCATION":3}}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'Growth', 'GROWTH', 'Production SaaS plan for growing teams.', 4900, 49000, false, '{"overageCostCents":{"AGENT_RUN":1,"WORKFLOW_RUN":4,"ENERGY_OPT_RUN":20,"WEB_SEARCH":1,"GOVERNANCE_CHECK":1,"OBSERVABILITY_DASHBOARD_VIEW":1,"DOMAIN_TOOL_INVOCATION":2}}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'Enterprise', 'ENTERPRISE', 'Custom enterprise plan with negotiated limits.', 0, 0, true, '{"overageCostCents":{}}'::jsonb)
on conflict (code) do nothing;

insert into public.billing_entitlements (plan_id, entitlement_code, limit_per_month, limit_per_day, metadata)
values
  ('00000000-0000-4000-8000-000000000101', 'AGENT_RUNS', 1000, 100, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'WORKFLOW_RUNS', 100, 20, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'ENERGY_OPT_RUNS', 25, 5, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'WEB_SEARCHES', 250, 50, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'GOVERNANCE_CHECKS', 2000, 250, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'OBSERVABILITY_DASHBOARDS', 100, 25, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'ORG_SEATS', 3, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000101', 'DOMAIN_TOOL_PACK', 500, 100, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'AGENT_RUNS', 50000, 5000, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'WORKFLOW_RUNS', 5000, 1000, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'ENERGY_OPT_RUNS', 1000, 100, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'WEB_SEARCHES', 10000, 1000, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'GOVERNANCE_CHECKS', 100000, 10000, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'OBSERVABILITY_DASHBOARDS', 5000, 500, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'ORG_SEATS', 25, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'DOMAIN_TOOL_PACK', 25000, 2500, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'AGENT_RUNS', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'WORKFLOW_RUNS', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'ENERGY_OPT_RUNS', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'WEB_SEARCHES', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'GOVERNANCE_CHECKS', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'OBSERVABILITY_DASHBOARDS', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'ORG_SEATS', null, null, '{}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'DOMAIN_TOOL_PACK', null, null, '{}'::jsonb)
on conflict (plan_id, entitlement_code) do nothing;
