import { metrics } from "../observability";

export type BillingMeter =
  | "workflow_step"
  | "workflow_run"
  | "agent_run"
  | "tool_invocation"
  | "foundation_model_call"
  | "devops_risk_analysis";

export interface BillingUsageRecord {
  orgId: string;
  meter: BillingMeter;
  quantity: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const usage = new Map<string, BillingUsageRecord[]>();

export function meterUsage(
  orgId: string,
  meter: BillingMeter,
  quantity = 1,
  metadata: Record<string, unknown> = {}
): BillingUsageRecord {
  const record: BillingUsageRecord = {
    orgId,
    meter,
    quantity,
    metadata,
    createdAt: new Date().toISOString(),
  };
  const orgUsage = usage.get(orgId) ?? [];
  orgUsage.unshift(record);
  usage.set(orgId, orgUsage.slice(0, 5000));
  metrics.increment(`hoare_${meter}_total`, { org_id: orgId }, quantity);
  return record;
}

export function getUsage(orgId: string): { records: BillingUsageRecord[]; totals: Record<string, number> } {
  const records = usage.get(orgId) ?? [];
  const totals = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.meter] = (acc[record.meter] ?? 0) + record.quantity;
    return acc;
  }, {});
  return { records, totals };
}

export function billingHealth(): "ok" | "degraded" {
  return "ok";
}
