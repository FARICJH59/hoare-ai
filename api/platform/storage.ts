import * as https from "https";

export type PlatformTable =
  | "platform_orgs"
  | "agent_sessions"
  | "workflow_jobs"
  | "rate_limits"
  | "workflow_runs"
  | "audit_logs"
  | "governance_decisions"
  | "entitlements"
  | "billing_usage";

const memoryStore = new Map<PlatformTable, Array<Record<string, unknown>>>();

function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function postToSupabase(table: PlatformTable, record: Record<string, unknown>): void {
  if (!supabaseConfigured()) return;
  const baseUrl = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/rest/v1/${table}`);
  const body = JSON.stringify(record);
  const request = https.request(
    url,
    {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
        "Content-Length": Buffer.byteLength(body).toString(),
      },
    },
    (response) => response.resume()
  );
  request.on("error", () => undefined);
  request.write(body);
  request.end();
}

export function persistRecord(table: PlatformTable, record: Record<string, unknown>): void {
  const rows = memoryStore.get(table) ?? [];
  rows.unshift(record);
  memoryStore.set(table, rows.slice(0, 5000));
  postToSupabase(table, record);
}

export function listRecords(table: PlatformTable, orgId: string, limit = 100): Array<Record<string, unknown>> {
  return (memoryStore.get(table) ?? []).filter((row) => row.org_id === orgId || row.orgId === orgId).slice(0, limit);
}

export function durableStorageHealth(): "ok" | "degraded" {
  return supabaseConfigured() ? "ok" : "degraded";
}

export function durableStorageStatus(): Record<string, string> {
  const status = supabaseConfigured() ? "supabase-configured" : "in-memory-fallback";
  return {
    agentSessions: status,
    workflowJobs: status,
    rateLimits: status,
    workflowRuns: status,
    auditLogs: status,
    billingUsage: status,
    governanceDecisions: status,
  };
}
