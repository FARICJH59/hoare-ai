import { v4 as uuidv4 } from "uuid";
import { metrics } from "../observability";
import {
  billingRepository,
  type BillingEntitlementRecord,
  type BillingEventType,
  type BillingPlanRecord,
  type OrgBillingStateRecord,
  type UsageEventRecord,
} from "../storage/repositories";

export interface EntitlementDecision {
  allowed: boolean;
  reason: "ALLOWED" | "ENTITLEMENT_LIMIT_REACHED" | "NO_PLAN";
  remaining?: number;
  plan?: BillingPlanRecord;
  state?: OrgBillingStateRecord;
}

const EVENT_TO_ENTITLEMENT: Record<BillingEventType, string> = {
  AGENT_RUN: "AGENT_RUNS",
  WORKFLOW_RUN: "WORKFLOW_RUNS",
  ENERGY_OPT_RUN: "ENERGY_OPT_RUNS",
  WEB_SEARCH: "WEB_SEARCHES",
  GOVERNANCE_CHECK: "GOVERNANCE_CHECKS",
  OBSERVABILITY_DASHBOARD_VIEW: "OBSERVABILITY_DASHBOARDS",
  DOMAIN_TOOL_INVOCATION: "DOMAIN_TOOL_PACK",
};

export async function getOrgPlanAndEntitlements(orgId: string) {
  const state = await billingRepository.getOrgBillingState(orgId);
  const plan = state.planId ? await billingRepository.getPlan(state.planId) : await billingRepository.getDefaultPlan();
  const entitlements = plan ? await billingRepository.getPlanEntitlements(plan.id) : [];
  return { state, plan, entitlements };
}

export async function getUsageCounts(orgId: string, periodStart: number, periodEnd: number) {
  const events = await billingRepository.getUsageEventsForPeriod(orgId, periodStart, periodEnd);
  return events.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
    return acc;
  }, {});
}

function findEntitlement(entitlements: BillingEntitlementRecord[], eventType: BillingEventType) {
  return entitlements.find((entitlement) => entitlement.entitlementCode === EVENT_TO_ENTITLEMENT[eventType]);
}

export async function canPerformEvent(orgId: string, eventType: BillingEventType): Promise<EntitlementDecision> {
  const { state, plan, entitlements } = await getOrgPlanAndEntitlements(orgId);
  if (!plan) return { allowed: false, reason: "NO_PLAN", state };
  if (plan.isEnterprise) return { allowed: true, reason: "ALLOWED", plan, state };
  const entitlement = findEntitlement(entitlements, eventType);
  if (!entitlement) return { allowed: false, reason: "ENTITLEMENT_LIMIT_REACHED", plan, state, remaining: 0 };
  const usageCounts = await getUsageCounts(orgId, state.currentPeriodStart, state.currentPeriodEnd);
  const used = usageCounts[eventType] ?? 0;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const dailyCounts = await getUsageCounts(orgId, startOfDay.getTime(), Date.now() + 1);
  const usedToday = dailyCounts[eventType] ?? 0;
  if (entitlement.limitPerDay !== undefined && usedToday >= entitlement.limitPerDay) {
    metrics.increment("hoare_billing_entitlement_denials_total", { event_type: eventType });
    return { allowed: false, reason: "ENTITLEMENT_LIMIT_REACHED", remaining: 0, plan, state };
  }
  if (entitlement.limitPerMonth !== undefined && used >= entitlement.limitPerMonth) {
    metrics.increment("hoare_billing_entitlement_denials_total", { event_type: eventType });
    return { allowed: false, reason: "ENTITLEMENT_LIMIT_REACHED", remaining: 0, plan, state };
  }
  return {
    allowed: true,
    reason: "ALLOWED",
    remaining: entitlement.limitPerMonth === undefined ? undefined : entitlement.limitPerMonth - used,
    plan,
    state,
  };
}

export async function recordUsageEvent(input: {
  orgId: string;
  userId?: string;
  eventType: BillingEventType;
  eventContext: Record<string, unknown>;
  costCents?: number;
}) {
  const state = await billingRepository.getOrgBillingState(input.orgId);
  const event: UsageEventRecord = {
    id: uuidv4(),
    orgId: input.orgId,
    userId: input.userId,
    planId: state.planId,
    eventType: input.eventType,
    eventContext: input.eventContext,
    occurredAt: Date.now(),
    billed: false,
    costCents: input.costCents ?? 0,
  };
  await billingRepository.recordUsageEvent(event);
  metrics.increment("hoare_billing_usage_events_total", { event_type: input.eventType });
  return event;
}

export async function enforceEntitlement(orgId: string, eventType: BillingEventType) {
  const decision = await canPerformEvent(orgId, eventType);
  if (!decision.allowed) {
    return {
      allowed: false,
      governanceDecision: { decision: "DENY", reason: decision.reason, eventType, remaining: decision.remaining },
    };
  }
  return { allowed: true, governanceDecision: { decision: "ALLOW", reason: "ALLOWED", eventType, remaining: decision.remaining } };
}
