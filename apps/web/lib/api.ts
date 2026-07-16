// Shared API client for the HOARE.ai backend
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  if (typeof window === "undefined" && process.env.HOARE_API_KEY) {
    headers.set("x-api-key", process.env.HOARE_API_KEY);
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error: string }).error ?? "API error");
  }
  return res.json() as Promise<T>;
}

export interface AgentSummary {
  id: string;
  name: string;
  description?: string;
  status: string;
  capabilities: string[];
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  status: string;
  stepCount: number;
}

export interface ExecutionJobSummary {
  id: string;
  toolName: string;
  status: string;
  createdAt: number;
  completedAt?: number;
}

export interface HealthSummary {
  status: string;
  version: string;
  agents: { registered: number; active: number };
  dependencies: Record<string, string>;
  governance?: Record<string, unknown>;
}

export const apiClient = {
  health: () => apiFetch<HealthSummary>("/health"),
  listTools: () => apiFetch<unknown>("/api/tools"),
  chat: (message: string, sessionId?: string) =>
    apiFetch<unknown>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),
  listCapabilities: () => apiFetch<unknown>("/api/capabilities"),
  listAgents: () => apiFetch<{ count: number; agents: AgentSummary[] }>("/api/agents"),
  listWorkflows: () =>
    apiFetch<{ count: number; workflows: WorkflowSummary[]; recentJobs: ExecutionJobSummary[] }>(
      "/api/workflows"
    ),
  listSessions: () => apiFetch<Array<{ id: string; name?: string; updatedAt: number }>>("/api/session"),
};

export interface EnergyRegionSummary {
  id: string;
  name: string;
  gridOperator: string;
  timezone: string;
  carbonIntensity: number;
  maxCapacity: number;
  currentLoad: number;
  stressLevel: string;
}

export interface EnergyFacilitySummary {
  id: string;
  orgId: string;
  regionId: string;
  name: string;
  type: string;
  baselineLoad: number;
  criticalityLevel: string;
}

export interface EnergyActionSummary {
  id: string;
  facilityId: string;
  timestamp: number;
  actionType: string;
  governanceDecision: string;
  status: string;
}

export interface EnergyOverview {
  orgId: string;
  regions: EnergyRegionSummary[];
  facilities: EnergyFacilitySummary[];
  workflows: Array<{ id: string; name: string; enabled: boolean; lastRunAt?: number }>;
  recentActions: EnergyActionSummary[];
  summary: { facilityCount: number; highStressRegions: number; lastRunAt?: number };
}

export async function listEnergyOverview(orgId?: string, regionId?: string, facilityId?: string) {
  const params = new URLSearchParams();
  if (orgId) params.set("orgId", orgId);
  if (regionId) params.set("regionId", regionId);
  if (facilityId) params.set("facilityId", facilityId);
  const query = params.toString();
  return apiFetch<EnergyOverview>(`/api/energy/workflows${query ? `?${query}` : ""}`);
}

export interface BillingSummary {
  orgId: string;
  plan?: { id: string; name: string; code: string };
  usageCounts: Record<string, number>;
  currentInvoice?: { status: string; totalCostCents: number };
}

export async function getBillingSummary(orgId?: string) {
  const params = new URLSearchParams();
  if (orgId) params.set("orgId", orgId);
  const query = params.toString();
  return apiFetch<BillingSummary>(`/api/billing/summary${query ? `?${query}` : ""}`);
}

export async function recordObservabilityDashboardView(dashboardId: string, orgId?: string) {
  return apiFetch<{ recorded: boolean }>("/api/billing/observe", {
    method: "POST",
    body: JSON.stringify({ dashboardId, orgId }),
  });
}
