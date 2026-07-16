import { v4 as uuidv4 } from "uuid";
import { metrics } from "../observability";
import { writeAuditLog } from "./audit";
import { persistRecord } from "./storage";

export type BillingMeter = "workflow_step" | "workflow_run" | "agent_run" | "tool_invocation" | "foundation_model_call";

export interface EntitlementDecision {
  allowed: boolean;
  reason: string;
  feature: BillingMeter;
}

export interface BillingUsageEvent {
  id: string;
  org_id: string;
  meter: BillingMeter;
  quantity: number;
  source: string;
  source_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const usage = new Map<string, BillingUsageEvent[]>();

export function checkEntitlement(orgId: string, feature: BillingMeter): EntitlementDecision {
  const disabled = (process.env.DISABLED_ENTITLEMENTS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const blocked = disabled.includes(feature) || disabled.includes(`${orgId}:${feature}`);
  return { allowed: !blocked, reason: blocked ? "entitlement disabled" : "entitlement active", feature };
}

export function meterUsage(args: {
  orgId: string;
  meter: BillingMeter;
  quantity?: number;
  source: string;
  sourceId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}): BillingUsageEvent {
  const entitlement = checkEntitlement(args.orgId, args.meter);
  writeAuditLog({ org_id: args.orgId, actor_id: args.actorId, action: "billing.entitlement.check", resource_type: args.meter, decision: entitlement.allowed ? "allow" : "block", metadata: { reason: entitlement.reason } });
  if (!entitlement.allowed) throw new Error(`Entitlement denied for ${args.meter}: ${entitlement.reason}`);

  const event: BillingUsageEvent = {
    id: uuidv4(),
    org_id: args.orgId,
    meter: args.meter,
    quantity: args.quantity ?? 1,
    source: args.source,
    source_id: args.sourceId,
    metadata: args.metadata ?? {},
    created_at: new Date().toISOString(),
  };
  const rows = usage.get(args.orgId) ?? [];
  rows.unshift(event);
  usage.set(args.orgId, rows.slice(0, 5000));
  persistRecord("billing_usage", event as unknown as Record<string, unknown>);
  metrics.increment(`hoare_billing_usage_${args.meter}_total`, { org_id: args.orgId, source: args.source }, event.quantity);
  writeAuditLog({ org_id: args.orgId, actor_id: args.actorId, action: "billing.usage.write", resource_type: args.meter, resource_id: event.id, metadata: { quantity: event.quantity, source: args.source } });
  return event;
}

export function getUsage(orgId: string): { records: BillingUsageEvent[]; totals: Record<string, number> } {
  const records = usage.get(orgId) ?? [];
  const totals = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.meter] = (acc[record.meter] ?? 0) + record.quantity;
    return acc;
  }, {});
  return { records, totals };
}

export function billingHealth(): "ok" {
  return "ok";
}
