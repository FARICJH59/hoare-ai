export interface PlatformAuditLog {
  id: string;
  orgId: string;
  actor?: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const auditLogs = new Map<string, PlatformAuditLog[]>();
let auditSeq = 0;

export function writeAuditLog(input: Omit<PlatformAuditLog, "id" | "createdAt">): PlatformAuditLog {
  const entry: PlatformAuditLog = {
    ...input,
    id: `audit-${++auditSeq}`,
    createdAt: new Date().toISOString(),
  };
  const orgLogs = auditLogs.get(entry.orgId) ?? [];
  orgLogs.unshift(entry);
  auditLogs.set(entry.orgId, orgLogs.slice(0, 1000));
  return entry;
}

export function listAuditLogs(orgId: string, limit = 100): PlatformAuditLog[] {
  return (auditLogs.get(orgId) ?? []).slice(0, limit);
}
