
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = Record<string, unknown>;

export type PhaseNamespace =
  | "agents" | "workflows" | "tools" | "safety" | "risk" | "observability"
  | "orchestration" | "domain" | "events" | "messaging" | "scheduling"
  | "federation" | "persistence" | "usecases";

export interface PhaseEntity {
  id: string;
  namespace: PhaseNamespace | string;
  name: string;
  description: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionRequest {
  id?: string;
  namespace?: string;
  agentId?: string;
  workflowId?: string;
  toolName?: string;
  input?: JsonRecord;
  domain?: string;
  deterministic?: boolean;
  messages?: JsonRecord[];
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  id: string;
  namespace: string;
  status: "completed" | "blocked" | "failed" | "scheduled" | "created" | "ok";
  output?: JsonRecord;
  metadata?: Record<string, unknown>;
  events?: unknown[];
}

export interface ListResult<T> {
  namespace: string;
  count: number;
  items: T[];
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
