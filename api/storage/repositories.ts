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
