import { v4 as uuidv4 } from "uuid";
import { metrics } from "../observability";
import { persistRecord, listRecords } from "./storage";

export interface PlatformAuditLog {
  id: string;
  org_id: string;
  actor_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  decision?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function writeAuditLog(input: Omit<PlatformAuditLog, "id" | "created_at">): PlatformAuditLog {
  const entry: PlatformAuditLog = { ...input, id: uuidv4(), created_at: new Date().toISOString() };
  persistRecord("audit_logs", entry as unknown as Record<string, unknown>);
  metrics.increment("hoare_audit_logs_total", { org_id: entry.org_id, action: entry.action });
  return entry;
}

export function listAuditLogs(orgId: string, limit = 100): PlatformAuditLog[] {
  return listRecords("audit_logs", orgId, limit) as unknown as PlatformAuditLog[];
}
