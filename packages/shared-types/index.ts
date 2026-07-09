// ── Shared domain types for HOARE.ai ─────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  agents: { registered: number; active: number };
  uptime: number;
  dependencies: Record<string, string>;
  timestamp: string;
}

// ── Agent types ───────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "paused" | "stopped" | "error";

export interface AgentDescriptor {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  capabilities: string[];
  createdAt: number;
}

// ── Workflow types ────────────────────────────────────────────────────────────

export type WorkflowStatus = "draft" | "pending" | "running" | "completed" | "failed" | "cancelled";

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStepDefinition[];
  createdAt: number;
}

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  capabilityId: string;
  params: Record<string, unknown>;
  dependsOn: string[];
  retries?: number;
  timeoutMs?: number;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  stepResults: WorkflowStepResult[];
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface WorkflowStepResult {
  stepId: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: unknown;
  error?: string;
  durationMs?: number;
}

// ── QGPS types ────────────────────────────────────────────────────────────────

export interface QGPSTask {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority?: number;
  submittedAt: number;
}

export interface QGPSTaskResult {
  taskId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
  completedAt?: number;
}

export interface QGPSSystemHealth {
  status: "healthy" | "degraded" | "down";
  controlPlane: string;
  activeTasks: number;
  uptime: number;
}

// ── Security types ────────────────────────────────────────────────────────────

export type Permission = "read" | "write" | "admin" | "execute";
export type Role = "viewer" | "operator" | "admin" | "service";

export interface UserContext {
  id: string;
  roles: Role[];
  permissions: Permission[];
}
