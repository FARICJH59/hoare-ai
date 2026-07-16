-- Energy Grid Optimization: durable regional, facility, telemetry, action, and workflow state.

insert into public.schema_versions (version, description)
values (2, 'energy_grid_optimization')
on conflict (version) do nothing;

create table if not exists public.energy_grid_regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grid_operator text not null,
  timezone text not null default 'UTC',
  carbon_intensity numeric not null default 0,
  max_capacity numeric not null default 0,
  current_load numeric not null default 0,
  stress_level text not null default 'LOW' check (stress_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.energy_facilities (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  region_id uuid not null references public.energy_grid_regions(id) on delete cascade,
  name text not null,
  type text not null,
  baseline_load numeric not null default 0,
  criticality_level text not null default 'MEDIUM' check (criticality_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.energy_telemetry (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.energy_facilities(id) on delete cascade,
  timestamp timestamptz not null default now(),
  power_kw numeric not null,
  carbon_intensity numeric not null default 0,
  temperature numeric,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.energy_actions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.energy_facilities(id) on delete cascade,
  timestamp timestamptz not null default now(),
  action_type text not null check (action_type in ('LOAD_SHIFT', 'LOAD_SHED', 'COOLING_OPTIMIZE', 'BATTERY_DISPATCH')),
  action_payload jsonb not null default '{}'::jsonb,
  governance_decision text not null check (governance_decision in ('APPROVED', 'DOWNGRADED', 'REJECTED', 'DRY_RUN')),
  status text not null default 'proposed' check (status in ('proposed', 'executed', 'skipped', 'failed'))
);

create table if not exists public.energy_workflows (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  name text not null,
  description text,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists energy_regions_stress_idx on public.energy_grid_regions (stress_level);
create index if not exists energy_facilities_org_idx on public.energy_facilities (org_id);
create index if not exists energy_facilities_region_idx on public.energy_facilities (region_id);
create index if not exists energy_telemetry_facility_time_idx on public.energy_telemetry (facility_id, timestamp desc);
create index if not exists energy_actions_facility_time_idx on public.energy_actions (facility_id, timestamp desc);
create index if not exists energy_actions_decision_idx on public.energy_actions (governance_decision);
create index if not exists energy_workflows_org_idx on public.energy_workflows (org_id);

alter table public.energy_grid_regions enable row level security;
alter table public.energy_facilities enable row level security;
alter table public.energy_telemetry enable row level security;
alter table public.energy_actions enable row level security;
alter table public.energy_workflows enable row level security;
