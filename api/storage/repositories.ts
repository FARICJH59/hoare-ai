import { v4 as uuidv4 } from "uuid";
import { supabaseRequest, isPersistenceConfigured } from "./database";
import type { UnifiedSession } from "../session";
import type { ExecutionJob } from "../execute";

export interface AgentRecord {
  id: string;
  name: string;
  description?: string;
  status: "idle" | "running" | "paused" | "stopped" | "error";
  capabilities: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  description?: string;
  status: "draft" | "pending" | "running" | "completed" | "failed" | "cancelled";
  stepCount: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

interface SessionRow {
  id: string;
  name?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface JobRow {
  id: string;
  tool_name: string;
  params: Record<string, unknown> | null;
  status: ExecutionJob["status"];
  result?: unknown;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
}

interface AgentRow {
  id: string;
  name: string;
  description?: string | null;
  status: AgentRecord["status"];
  capabilities: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface WorkflowRow {
  id: string;
  name: string;
  description?: string | null;
  status: WorkflowRecord["status"];
  step_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function toMillis(value?: string | null): number | undefined {
  return value ? new Date(value).getTime() : undefined;
}

function fromMillis(value?: number): string | null {
  return value ? new Date(value).toISOString() : null;
}

function sessionFromRow(row: SessionRow): UnifiedSession {
  return {
    id: row.id,
    name: row.name ?? undefined,
    metadata: row.metadata ?? {},
    createdAt: toMillis(row.created_at) ?? Date.now(),
    updatedAt: toMillis(row.updated_at) ?? Date.now(),
  };
}

function jobFromRow(row: JobRow): ExecutionJob {
  return {
    id: row.id,
    toolName: row.tool_name,
    params: row.params ?? {},
    status: row.status,
    result: row.result,
    error: row.error ?? undefined,
    createdAt: toMillis(row.created_at) ?? Date.now(),
    completedAt: toMillis(row.completed_at) ?? undefined,
  };
}

function agentFromRow(row: AgentRow): AgentRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    capabilities: row.capabilities ?? [],
    metadata: row.metadata ?? {},
    createdAt: toMillis(row.created_at) ?? Date.now(),
    updatedAt: toMillis(row.updated_at) ?? Date.now(),
  };
}

function workflowFromRow(row: WorkflowRow): WorkflowRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    stepCount: row.step_count ?? 0,
    metadata: row.metadata ?? {},
    createdAt: toMillis(row.created_at) ?? Date.now(),
    updatedAt: toMillis(row.updated_at) ?? Date.now(),
  };
}

export const sessionRepository = {
  enabled: isPersistenceConfigured,
  async upsert(session: UnifiedSession): Promise<void> {
    if (!isPersistenceConfigured()) return;
    const row = {
      id: session.id,
      name: session.name ?? null,
      metadata: session.metadata ?? {},
      created_at: fromMillis(session.createdAt),
      updated_at: fromMillis(session.updatedAt),
    };
    await supabaseRequest("/sessions?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(row),
    });
  },
  async list(): Promise<UnifiedSession[]> {
    if (!isPersistenceConfigured()) return [];
    const rows = await supabaseRequest<SessionRow[]>(
      "/sessions?select=id,name,metadata,created_at,updated_at&order=updated_at.desc"
    );
    return rows.map(sessionFromRow);
  },
  async get(id: string): Promise<UnifiedSession | undefined> {
    if (!isPersistenceConfigured()) return undefined;
    const rows = await supabaseRequest<SessionRow[]>(
      `/sessions?select=id,name,metadata,created_at,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    return rows[0] ? sessionFromRow(rows[0]) : undefined;
  },
  async delete(id: string): Promise<void> {
    if (!isPersistenceConfigured()) return;
    await supabaseRequest(`/sessions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

export const jobRepository = {
  enabled: isPersistenceConfigured,
  async upsert(job: ExecutionJob): Promise<void> {
    if (!isPersistenceConfigured()) return;
    const row = {
      id: job.id,
      tool_name: job.toolName,
      params: job.params ?? {},
      status: job.status,
      result: job.result ?? null,
      error: job.error ?? null,
      created_at: fromMillis(job.createdAt),
      completed_at: fromMillis(job.completedAt),
    };
    await supabaseRequest("/execution_jobs?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(row),
    });
  },
  async list(): Promise<ExecutionJob[]> {
    if (!isPersistenceConfigured()) return [];
    const rows = await supabaseRequest<JobRow[]>(
      "/execution_jobs?select=id,tool_name,params,status,result,error,created_at,completed_at&order=created_at.desc"
    );
    return rows.map(jobFromRow);
  },
  async get(id: string): Promise<ExecutionJob | undefined> {
    if (!isPersistenceConfigured()) return undefined;
    const rows = await supabaseRequest<JobRow[]>(
      `/execution_jobs?select=id,tool_name,params,status,result,error,created_at,completed_at&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    return rows[0] ? jobFromRow(rows[0]) : undefined;
  },
};

export const agentRepository = {
  enabled: isPersistenceConfigured,
  async list(): Promise<AgentRecord[]> {
    if (!isPersistenceConfigured()) return [];
    const rows = await supabaseRequest<AgentRow[]>(
      "/agents?select=id,name,description,status,capabilities,metadata,created_at,updated_at&order=updated_at.desc"
    );
    return rows.map(agentFromRow);
  },
};

export const workflowRepository = {
  enabled: isPersistenceConfigured,
  async list(): Promise<WorkflowRecord[]> {
    if (!isPersistenceConfigured()) return [];
    const rows = await supabaseRequest<WorkflowRow[]>(
      "/workflows?select=id,name,description,status,step_count,metadata,created_at,updated_at&order=updated_at.desc"
    );
    return rows.map(workflowFromRow);
  },
};

export type EnergyStressLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EnergyActionType = "LOAD_SHIFT" | "LOAD_SHED" | "COOLING_OPTIMIZE" | "BATTERY_DISPATCH";
export type EnergyGovernanceDecision = "APPROVED" | "DOWNGRADED" | "REJECTED" | "DRY_RUN";
export type EnergyActionStatus = "proposed" | "executed" | "skipped" | "failed";

export interface EnergyGridRegionRecord {
  id: string;
  name: string;
  gridOperator: string;
  timezone: string;
  carbonIntensity: number;
  maxCapacity: number;
  currentLoad: number;
  stressLevel: EnergyStressLevel;
  createdAt?: number;
  updatedAt?: number;
}

export interface EnergyFacilityRecord {
  id: string;
  orgId: string;
  regionId: string;
  name: string;
  type: string;
  baselineLoad: number;
  criticalityLevel: EnergyStressLevel;
  createdAt?: number;
  updatedAt?: number;
}

export interface EnergyTelemetryRecord {
  id: string;
  facilityId: string;
  timestamp: number;
  powerKw: number;
  carbonIntensity: number;
  temperature?: number;
  metadata: Record<string, unknown>;
}

export interface EnergyActionRecord {
  id: string;
  facilityId: string;
  timestamp: number;
  actionType: EnergyActionType;
  actionPayload: Record<string, unknown>;
  governanceDecision: EnergyGovernanceDecision;
  status: EnergyActionStatus;
}

export interface EnergyWorkflowRecord {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  enabled: boolean;
  lastRunAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

interface EnergyRegionRow {
  id: string;
  name: string;
  grid_operator: string;
  timezone: string;
  carbon_intensity: number;
  max_capacity: number;
  current_load: number;
  stress_level: EnergyStressLevel;
  created_at?: string;
  updated_at?: string;
}

interface EnergyFacilityRow {
  id: string;
  org_id: string;
  region_id: string;
  name: string;
  type: string;
  baseline_load: number;
  criticality_level: EnergyStressLevel;
  created_at?: string;
  updated_at?: string;
}

interface EnergyTelemetryRow {
  id: string;
  facility_id: string;
  timestamp: string;
  power_kw: number;
  carbon_intensity: number;
  temperature?: number | null;
  metadata: Record<string, unknown> | null;
}

interface EnergyActionRow {
  id: string;
  facility_id: string;
  timestamp: string;
  action_type: EnergyActionType;
  action_payload: Record<string, unknown> | null;
  governance_decision: EnergyGovernanceDecision;
  status: EnergyActionStatus;
}

interface EnergyWorkflowRow {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  last_run_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const memoryEnergyRegions = new Map<string, EnergyGridRegionRecord>();
const memoryEnergyFacilities = new Map<string, EnergyFacilityRecord>();
const memoryEnergyTelemetry = new Map<string, EnergyTelemetryRecord>();
const memoryEnergyActions = new Map<string, EnergyActionRecord>();
const memoryEnergyWorkflows = new Map<string, EnergyWorkflowRecord>();

function energyRegionFromRow(row: EnergyRegionRow): EnergyGridRegionRecord {
  return {
    id: row.id,
    name: row.name,
    gridOperator: row.grid_operator,
    timezone: row.timezone,
    carbonIntensity: Number(row.carbon_intensity),
    maxCapacity: Number(row.max_capacity),
    currentLoad: Number(row.current_load),
    stressLevel: row.stress_level,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function energyFacilityFromRow(row: EnergyFacilityRow): EnergyFacilityRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    regionId: row.region_id,
    name: row.name,
    type: row.type,
    baselineLoad: Number(row.baseline_load),
    criticalityLevel: row.criticality_level,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

function energyTelemetryFromRow(row: EnergyTelemetryRow): EnergyTelemetryRecord {
  return {
    id: row.id,
    facilityId: row.facility_id,
    timestamp: toMillis(row.timestamp) ?? Date.now(),
    powerKw: Number(row.power_kw),
    carbonIntensity: Number(row.carbon_intensity),
    temperature: row.temperature === null ? undefined : row.temperature,
    metadata: row.metadata ?? {},
  };
}

function energyActionFromRow(row: EnergyActionRow): EnergyActionRecord {
  return {
    id: row.id,
    facilityId: row.facility_id,
    timestamp: toMillis(row.timestamp) ?? Date.now(),
    actionType: row.action_type,
    actionPayload: row.action_payload ?? {},
    governanceDecision: row.governance_decision,
    status: row.status,
  };
}

function energyWorkflowFromRow(row: EnergyWorkflowRow): EnergyWorkflowRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description ?? undefined,
    enabled: row.enabled,
    lastRunAt: toMillis(row.last_run_at),
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
}

export const energyRepository = {
  enabled: isPersistenceConfigured,
  async listRegions(): Promise<EnergyGridRegionRecord[]> {
    if (!isPersistenceConfigured()) return Array.from(memoryEnergyRegions.values());
    const rows = await supabaseRequest<EnergyRegionRow[]>(
      "/energy_grid_regions?select=id,name,grid_operator,timezone,carbon_intensity,max_capacity,current_load,stress_level,created_at,updated_at&order=name.asc"
    );
    return rows.map(energyRegionFromRow);
  },
  async upsertRegion(region: EnergyGridRegionRecord): Promise<void> {
    memoryEnergyRegions.set(region.id, region);
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/energy_grid_regions?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: region.id,
        name: region.name,
        grid_operator: region.gridOperator,
        timezone: region.timezone,
        carbon_intensity: region.carbonIntensity,
        max_capacity: region.maxCapacity,
        current_load: region.currentLoad,
        stress_level: region.stressLevel,
        updated_at: new Date().toISOString(),
      }),
    });
  },
  async listFacilities(orgId: string, regionId?: string): Promise<EnergyFacilityRecord[]> {
    if (!isPersistenceConfigured()) {
      return Array.from(memoryEnergyFacilities.values()).filter(
        (facility) => facility.orgId === orgId && (!regionId || facility.regionId === regionId)
      );
    }
    const regionFilter = regionId ? `&region_id=eq.${encodeURIComponent(regionId)}` : "";
    const rows = await supabaseRequest<EnergyFacilityRow[]>(
      `/energy_facilities?select=id,org_id,region_id,name,type,baseline_load,criticality_level,created_at,updated_at&org_id=eq.${encodeURIComponent(orgId)}${regionFilter}&order=name.asc`
    );
    return rows.map(energyFacilityFromRow);
  },
  async upsertFacility(facility: EnergyFacilityRecord): Promise<void> {
    memoryEnergyFacilities.set(facility.id, facility);
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/energy_facilities?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: facility.id,
        org_id: facility.orgId,
        region_id: facility.regionId,
        name: facility.name,
        type: facility.type,
        baseline_load: facility.baselineLoad,
        criticality_level: facility.criticalityLevel,
        updated_at: new Date().toISOString(),
      }),
    });
  },
  async listLatestTelemetry(facilityIds: string[]): Promise<EnergyTelemetryRecord[]> {
    if (facilityIds.length === 0) return [];
    if (!isPersistenceConfigured()) {
      return facilityIds.flatMap((facilityId) =>
        Array.from(memoryEnergyTelemetry.values())
          .filter((item) => item.facilityId === facilityId)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 1)
      );
    }
    const rows = await supabaseRequest<EnergyTelemetryRow[]>(
      `/energy_telemetry?select=id,facility_id,timestamp,power_kw,carbon_intensity,temperature,metadata&facility_id=in.(${facilityIds.map(encodeURIComponent).join(",")})&order=timestamp.desc`
    );
    const latest = new Map<string, EnergyTelemetryRecord>();
    for (const item of rows.map(energyTelemetryFromRow)) {
      if (!latest.has(item.facilityId)) latest.set(item.facilityId, item);
    }
    return Array.from(latest.values());
  },
  async insertTelemetry(telemetry: EnergyTelemetryRecord): Promise<void> {
    memoryEnergyTelemetry.set(telemetry.id, telemetry);
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/energy_telemetry", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: telemetry.id,
        facility_id: telemetry.facilityId,
        timestamp: fromMillis(telemetry.timestamp),
        power_kw: telemetry.powerKw,
        carbon_intensity: telemetry.carbonIntensity,
        temperature: telemetry.temperature ?? null,
        metadata: telemetry.metadata,
      }),
    });
  },
  async listActions(orgId: string, limit = 50): Promise<EnergyActionRecord[]> {
    const facilities = await this.listFacilities(orgId);
    const facilityIds = new Set(facilities.map((facility) => facility.id));
    if (!isPersistenceConfigured()) {
      return Array.from(memoryEnergyActions.values())
        .filter((action) => facilityIds.has(action.facilityId))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }
    if (facilityIds.size === 0) return [];
    const rows = await supabaseRequest<EnergyActionRow[]>(
      `/energy_actions?select=id,facility_id,timestamp,action_type,action_payload,governance_decision,status&facility_id=in.(${Array.from(facilityIds).map(encodeURIComponent).join(",")})&order=timestamp.desc&limit=${limit}`
    );
    return rows.map(energyActionFromRow);
  },
  async insertAction(action: EnergyActionRecord): Promise<void> {
    memoryEnergyActions.set(action.id, action);
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/energy_actions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: action.id,
        facility_id: action.facilityId,
        timestamp: fromMillis(action.timestamp),
        action_type: action.actionType,
        action_payload: action.actionPayload,
        governance_decision: action.governanceDecision,
        status: action.status,
      }),
    });
  },
  async listWorkflows(orgId: string): Promise<EnergyWorkflowRecord[]> {
    if (!isPersistenceConfigured()) {
      return Array.from(memoryEnergyWorkflows.values()).filter((workflow) => workflow.orgId === orgId);
    }
    const rows = await supabaseRequest<EnergyWorkflowRow[]>(
      `/energy_workflows?select=id,org_id,name,description,enabled,last_run_at,created_at,updated_at&org_id=eq.${encodeURIComponent(orgId)}&order=updated_at.desc`
    );
    return rows.map(energyWorkflowFromRow);
  },
  async upsertWorkflow(workflow: EnergyWorkflowRecord): Promise<void> {
    memoryEnergyWorkflows.set(workflow.id, workflow);
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/energy_workflows?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: workflow.id,
        org_id: workflow.orgId,
        name: workflow.name,
        description: workflow.description ?? null,
        enabled: workflow.enabled,
        last_run_at: fromMillis(workflow.lastRunAt),
        updated_at: new Date().toISOString(),
      }),
    });
  },
};

export type BillingEventType =
  | "AGENT_RUN"
  | "WORKFLOW_RUN"
  | "ENERGY_OPT_RUN"
  | "WEB_SEARCH"
  | "GOVERNANCE_CHECK"
  | "OBSERVABILITY_DASHBOARD_VIEW"
  | "DOMAIN_TOOL_INVOCATION";
export type BillingInvoiceStatus = "PENDING" | "PAID" | "FAILED";

export interface BillingPlanRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  isEnterprise: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface BillingEntitlementRecord {
  id: string;
  planId: string;
  entitlementCode: string;
  limitPerMonth?: number;
  limitPerDay?: number;
  metadata: Record<string, unknown>;
}

export interface UsageEventRecord {
  id: string;
  orgId: string;
  userId?: string;
  planId?: string;
  eventType: BillingEventType;
  eventContext: Record<string, unknown>;
  occurredAt: number;
  billed: boolean;
  costCents: number;
}

export interface BillingInvoiceRecord {
  id: string;
  orgId: string;
  planId?: string;
  periodStart: number;
  periodEnd: number;
  totalCostCents: number;
  status: BillingInvoiceStatus;
  stripeInvoiceId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface OrgBillingStateRecord {
  orgId: string;
  planId?: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  usageResetAt: number;
  lastInvoiceId?: string;
}

interface BillingPlanRow {
  id: string; name: string; code: string; description?: string | null;
  monthly_price_cents: number; yearly_price_cents: number; is_enterprise: boolean; is_active: boolean;
  metadata: Record<string, unknown> | null;
}
interface BillingEntitlementRow {
  id: string; plan_id: string; entitlement_code: string; limit_per_month?: number | null; limit_per_day?: number | null; metadata: Record<string, unknown> | null;
}
interface UsageEventRow {
  id: string; org_id: string; user_id?: string | null; plan_id?: string | null; event_type: BillingEventType; event_context: Record<string, unknown> | null; occurred_at: string; billed: boolean; cost_cents: number;
}
interface BillingInvoiceRow {
  id: string; org_id: string; plan_id?: string | null; period_start: string; period_end: string; total_cost_cents: number; status: BillingInvoiceStatus; stripe_invoice_id?: string | null; created_at?: string; updated_at?: string;
}
interface OrgBillingStateRow {
  org_id: string; plan_id?: string | null; current_period_start: string; current_period_end: string; usage_reset_at: string; last_invoice_id?: string | null;
}

const STARTER_PLAN_ID = "00000000-0000-4000-8000-000000000101";
const memoryBillingPlans = new Map<string, BillingPlanRecord>([[STARTER_PLAN_ID, {
  id: STARTER_PLAN_ID,
  name: "Starter",
  code: "STARTER",
  description: "MVP plan for early HOARE.ai usage.",
  monthlyPriceCents: 0,
  yearlyPriceCents: 0,
  isEnterprise: false,
  isActive: true,
  metadata: { overageCostCents: { AGENT_RUN: 1, WORKFLOW_RUN: 5, ENERGY_OPT_RUN: 25, WEB_SEARCH: 1, GOVERNANCE_CHECK: 1, OBSERVABILITY_DASHBOARD_VIEW: 1, DOMAIN_TOOL_INVOCATION: 3 } },
}]]);
const memoryBillingEntitlements = new Map<string, BillingEntitlementRecord[]>([[STARTER_PLAN_ID, [
  { id: "starter-agent-runs", planId: STARTER_PLAN_ID, entitlementCode: "AGENT_RUNS", limitPerMonth: 1000, limitPerDay: 100, metadata: {} },
  { id: "starter-workflow-runs", planId: STARTER_PLAN_ID, entitlementCode: "WORKFLOW_RUNS", limitPerMonth: 100, limitPerDay: 20, metadata: {} },
  { id: "starter-energy-runs", planId: STARTER_PLAN_ID, entitlementCode: "ENERGY_OPT_RUNS", limitPerMonth: 25, limitPerDay: 5, metadata: {} },
  { id: "starter-web-searches", planId: STARTER_PLAN_ID, entitlementCode: "WEB_SEARCHES", limitPerMonth: 250, limitPerDay: 50, metadata: {} },
  { id: "starter-governance", planId: STARTER_PLAN_ID, entitlementCode: "GOVERNANCE_CHECKS", limitPerMonth: 2000, limitPerDay: 250, metadata: {} },
  { id: "starter-observability", planId: STARTER_PLAN_ID, entitlementCode: "OBSERVABILITY_DASHBOARDS", limitPerMonth: 100, limitPerDay: 25, metadata: {} },
  { id: "starter-domain-tools", planId: STARTER_PLAN_ID, entitlementCode: "DOMAIN_TOOL_PACK", limitPerMonth: 500, limitPerDay: 100, metadata: {} },
]]);
const memoryUsageEvents = new Map<string, UsageEventRecord>();
const memoryBillingInvoices = new Map<string, BillingInvoiceRecord>();
const memoryOrgBillingState = new Map<string, OrgBillingStateRecord>();

function planFromRow(row: BillingPlanRow): BillingPlanRecord {
  return { id: row.id, name: row.name, code: row.code, description: row.description ?? undefined, monthlyPriceCents: row.monthly_price_cents, yearlyPriceCents: row.yearly_price_cents, isEnterprise: row.is_enterprise, isActive: row.is_active, metadata: row.metadata ?? {} };
}
function entitlementFromRow(row: BillingEntitlementRow): BillingEntitlementRecord {
  return { id: row.id, planId: row.plan_id, entitlementCode: row.entitlement_code, limitPerMonth: row.limit_per_month ?? undefined, limitPerDay: row.limit_per_day ?? undefined, metadata: row.metadata ?? {} };
}
function usageEventFromRow(row: UsageEventRow): UsageEventRecord {
  return { id: row.id, orgId: row.org_id, userId: row.user_id ?? undefined, planId: row.plan_id ?? undefined, eventType: row.event_type, eventContext: row.event_context ?? {}, occurredAt: toMillis(row.occurred_at) ?? Date.now(), billed: row.billed, costCents: row.cost_cents };
}
function invoiceFromRow(row: BillingInvoiceRow): BillingInvoiceRecord {
  return { id: row.id, orgId: row.org_id, planId: row.plan_id ?? undefined, periodStart: toMillis(row.period_start) ?? Date.now(), periodEnd: toMillis(row.period_end) ?? Date.now(), totalCostCents: row.total_cost_cents, status: row.status, stripeInvoiceId: row.stripe_invoice_id ?? undefined, createdAt: toMillis(row.created_at), updatedAt: toMillis(row.updated_at) };
}
function billingStateFromRow(row: OrgBillingStateRow): OrgBillingStateRecord {
  return { orgId: row.org_id, planId: row.plan_id ?? undefined, currentPeriodStart: toMillis(row.current_period_start) ?? Date.now(), currentPeriodEnd: toMillis(row.current_period_end) ?? Date.now(), usageResetAt: toMillis(row.usage_reset_at) ?? Date.now(), lastInvoiceId: row.last_invoice_id ?? undefined };
}

function defaultBillingPeriod(now = Date.now()) {
  const start = new Date(now); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export const billingRepository = {
  enabled: isPersistenceConfigured,
  async getDefaultPlan(): Promise<BillingPlanRecord> {
    if (!isPersistenceConfigured()) return memoryBillingPlans.get(STARTER_PLAN_ID)!;
    const rows = await supabaseRequest<BillingPlanRow[]>("/billing_plans?select=id,name,code,description,monthly_price_cents,yearly_price_cents,is_enterprise,is_active,metadata&code=eq.STARTER&limit=1");
    return rows[0] ? planFromRow(rows[0]) : memoryBillingPlans.get(STARTER_PLAN_ID)!;
  },
  async getOrgBillingState(orgId: string): Promise<OrgBillingStateRecord> {
    if (!isPersistenceConfigured()) {
      const existing = memoryOrgBillingState.get(orgId);
      if (existing) return existing;
      const period = defaultBillingPeriod();
      const state = { orgId, planId: STARTER_PLAN_ID, currentPeriodStart: period.start, currentPeriodEnd: period.end, usageResetAt: period.end };
      memoryOrgBillingState.set(orgId, state);
      return state;
    }
    const rows = await supabaseRequest<OrgBillingStateRow[]>(`/org_billing_state?select=org_id,plan_id,current_period_start,current_period_end,usage_reset_at,last_invoice_id&org_id=eq.${encodeURIComponent(orgId)}&limit=1`);
    if (rows[0]) return billingStateFromRow(rows[0]);
    const plan = await this.getDefaultPlan();
    const period = defaultBillingPeriod();
    const state = { orgId, planId: plan.id, currentPeriodStart: period.start, currentPeriodEnd: period.end, usageResetAt: period.end };
    await this.updateOrgBillingState(orgId, plan.id, period.start, period.end, period.end);
    return state;
  },
  async getPlan(planId: string): Promise<BillingPlanRecord | undefined> {
    if (!isPersistenceConfigured()) return memoryBillingPlans.get(planId);
    const rows = await supabaseRequest<BillingPlanRow[]>(`/billing_plans?select=id,name,code,description,monthly_price_cents,yearly_price_cents,is_enterprise,is_active,metadata&id=eq.${encodeURIComponent(planId)}&limit=1`);
    return rows[0] ? planFromRow(rows[0]) : undefined;
  },
  async getPlanEntitlements(planId: string): Promise<BillingEntitlementRecord[]> {
    if (!isPersistenceConfigured()) return memoryBillingEntitlements.get(planId) ?? [];
    const rows = await supabaseRequest<BillingEntitlementRow[]>(`/billing_entitlements?select=id,plan_id,entitlement_code,limit_per_month,limit_per_day,metadata&plan_id=eq.${encodeURIComponent(planId)}`);
    return rows.map(entitlementFromRow);
  },
  async recordUsageEvent(event: UsageEventRecord): Promise<void> {
    memoryUsageEvents.set(event.id, event);
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/usage_events", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ id: event.id, org_id: event.orgId, user_id: event.userId ?? null, plan_id: event.planId ?? null, event_type: event.eventType, event_context: event.eventContext, occurred_at: fromMillis(event.occurredAt), billed: event.billed, cost_cents: event.costCents }) });
  },
  async getUsageEventsForPeriod(orgId: string, periodStart: number, periodEnd: number): Promise<UsageEventRecord[]> {
    if (!isPersistenceConfigured()) return Array.from(memoryUsageEvents.values()).filter((event) => event.orgId === orgId && event.occurredAt >= periodStart && event.occurredAt < periodEnd);
    const rows = await supabaseRequest<UsageEventRow[]>(`/usage_events?select=id,org_id,user_id,plan_id,event_type,event_context,occurred_at,billed,cost_cents&org_id=eq.${encodeURIComponent(orgId)}&occurred_at=gte.${encodeURIComponent(fromMillis(periodStart) ?? "")}&occurred_at=lt.${encodeURIComponent(fromMillis(periodEnd) ?? "")}`);
    return rows.map(usageEventFromRow);
  },
  async createOrUpdateInvoice(orgId: string, planId: string, periodStart: number, periodEnd: number, totalCostCents: number, status: BillingInvoiceStatus, stripeInvoiceId?: string): Promise<BillingInvoiceRecord> {
    const existing = Array.from(memoryBillingInvoices.values()).find((invoice) => invoice.orgId === orgId && invoice.periodStart === periodStart && invoice.periodEnd === periodEnd);
    const invoice = { id: existing?.id ?? uuidv4(), orgId, planId, periodStart, periodEnd, totalCostCents, status, stripeInvoiceId, createdAt: existing?.createdAt ?? Date.now(), updatedAt: Date.now() };
    memoryBillingInvoices.set(invoice.id, invoice);
    if (!isPersistenceConfigured()) return invoice;
    const rows = await supabaseRequest<BillingInvoiceRow[]>("/billing_invoices?on_conflict=org_id,period_start,period_end", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: invoice.id, org_id: orgId, plan_id: planId, period_start: fromMillis(periodStart), period_end: fromMillis(periodEnd), total_cost_cents: totalCostCents, status, stripe_invoice_id: stripeInvoiceId ?? null, updated_at: new Date().toISOString() }) });
    return rows[0] ? invoiceFromRow(rows[0]) : invoice;
  },
  async updateOrgBillingState(orgId: string, planId: string, periodStart: number, periodEnd: number, usageResetAt: number, lastInvoiceId?: string): Promise<void> {
    memoryOrgBillingState.set(orgId, { orgId, planId, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, usageResetAt, lastInvoiceId });
    if (!isPersistenceConfigured()) return;
    await supabaseRequest("/org_billing_state?on_conflict=org_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ org_id: orgId, plan_id: planId, current_period_start: fromMillis(periodStart), current_period_end: fromMillis(periodEnd), usage_reset_at: fromMillis(usageResetAt), last_invoice_id: lastInvoiceId ?? null, updated_at: new Date().toISOString() }) });
  },
  async listOrgBillingStates(): Promise<OrgBillingStateRecord[]> {
    if (!isPersistenceConfigured()) return Array.from(memoryOrgBillingState.values());
    const rows = await supabaseRequest<OrgBillingStateRow[]>("/org_billing_state?select=org_id,plan_id,current_period_start,current_period_end,usage_reset_at,last_invoice_id");
    return rows.map(billingStateFromRow);
  },
  async markUsageEventsBilled(orgId: string, periodStart: number, periodEnd: number): Promise<void> {
    for (const event of memoryUsageEvents.values()) if (event.orgId === orgId && event.occurredAt >= periodStart && event.occurredAt < periodEnd) event.billed = true;
    if (!isPersistenceConfigured()) return;
    await supabaseRequest(`/usage_events?org_id=eq.${encodeURIComponent(orgId)}&occurred_at=gte.${encodeURIComponent(fromMillis(periodStart) ?? "")}&occurred_at=lt.${encodeURIComponent(fromMillis(periodEnd) ?? "")}`, { method: "PATCH", body: JSON.stringify({ billed: true }) });
  },
  async listInvoices(orgId: string): Promise<BillingInvoiceRecord[]> {
    if (!isPersistenceConfigured()) return Array.from(memoryBillingInvoices.values()).filter((invoice) => invoice.orgId === orgId).sort((a, b) => b.periodStart - a.periodStart);
    const rows = await supabaseRequest<BillingInvoiceRow[]>(`/billing_invoices?select=id,org_id,plan_id,period_start,period_end,total_cost_cents,status,stripe_invoice_id,created_at,updated_at&org_id=eq.${encodeURIComponent(orgId)}&order=period_start.desc`);
    return rows.map(invoiceFromRow);
  },
  async updateInvoiceStatusByStripeId(stripeInvoiceId: string, status: BillingInvoiceStatus): Promise<void> {
    for (const invoice of memoryBillingInvoices.values()) if (invoice.stripeInvoiceId === stripeInvoiceId) invoice.status = status;
    if (!isPersistenceConfigured()) return;
    await supabaseRequest(`/billing_invoices?stripe_invoice_id=eq.${encodeURIComponent(stripeInvoiceId)}`, { method: "PATCH", body: JSON.stringify({ status, updated_at: new Date().toISOString() }) });
  },
};
