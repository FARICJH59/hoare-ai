import { Router, Response } from "express";
import { metrics, structuredLogger } from "../observability";
import type { AuthenticatedRequest } from "../middleware/auth";
import { billingRepository, type BillingEventType } from "../storage/repositories";
import { enforceEntitlement, getOrgPlanAndEntitlements, getUsageCounts, recordUsageEvent } from "./entitlements";

export const billingRouter = Router();

function resolveOrgId(req: AuthenticatedRequest): string {
  if (req.auth?.type === "jwt" && req.auth.subject) return req.auth.subject;
  const bodyOrg = typeof req.body?.orgId === "string" ? req.body.orgId : undefined;
  const queryOrg = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
  const headerOrg = typeof req.headers["x-org-id"] === "string" ? req.headers["x-org-id"] : undefined;
  return bodyOrg ?? queryOrg ?? headerOrg ?? "default-org";
}

function nextPeriod(periodEnd: number) {
  const start = new Date(periodEnd);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function eventCost(planMetadata: Record<string, unknown>, eventType: BillingEventType) {
  const costs = planMetadata.overageCostCents as Record<string, number> | undefined;
  return costs?.[eventType] ?? 0;
}

async function generateInvoiceForOrg(orgId: string) {
  const { state, plan } = await getOrgPlanAndEntitlements(orgId);
  if (!plan || !state.planId) throw new Error("No billing plan configured for org.");
  const events = await billingRepository.getUsageEventsForPeriod(orgId, state.currentPeriodStart, state.currentPeriodEnd);
  const usageCost = events.reduce((sum, event) => sum + (event.costCents || eventCost(plan.metadata, event.eventType)), 0);
  const total = plan.monthlyPriceCents + usageCost;
  const invoice = await billingRepository.createOrUpdateInvoice(
    orgId,
    state.planId,
    state.currentPeriodStart,
    state.currentPeriodEnd,
    total,
    "PENDING"
  );
  await billingRepository.markUsageEventsBilled(orgId, state.currentPeriodStart, state.currentPeriodEnd);
  const next = nextPeriod(state.currentPeriodEnd);
  await billingRepository.updateOrgBillingState(orgId, state.planId, next.start, next.end, next.end, invoice.id);
  metrics.increment("hoare_billing_invoices_total", { status: invoice.status });
  structuredLogger.info("billing_invoice_generated", { orgId, invoiceId: invoice.id, total });
  return invoice;
}

billingRouter.post("/observe", async (req: AuthenticatedRequest, res: Response) => {
  const orgId = resolveOrgId(req);
  const dashboardId = typeof req.body?.dashboardId === "string" ? req.body.dashboardId : "unknown";
  const entitlement = await enforceEntitlement(orgId, "OBSERVABILITY_DASHBOARD_VIEW");
  if (!entitlement.allowed) {
    res.status(402).json({ error: "Action blocked: plan limit reached for OBSERVABILITY_DASHBOARD_VIEW.", governanceDecision: entitlement.governanceDecision });
    return;
  }
  await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "OBSERVABILITY_DASHBOARD_VIEW", eventContext: { dashboardId, orgId } });
  res.status(202).json({ recorded: true, dashboardId });
});

billingRouter.get("/summary", async (req: AuthenticatedRequest, res: Response) => {
  const orgId = resolveOrgId(req);
  const { state, plan, entitlements } = await getOrgPlanAndEntitlements(orgId);
  const usageCounts = await getUsageCounts(orgId, state.currentPeriodStart, state.currentPeriodEnd);
  const invoices = await billingRepository.listInvoices(orgId);
  res.json({ orgId, plan, state, entitlements, usageCounts, currentInvoice: invoices[0] });
});

billingRouter.post("/run", async (req: AuthenticatedRequest, res: Response) => {
  const orgId = resolveOrgId(req);
  const invoice = await generateInvoiceForOrg(orgId);
  res.status(201).json({ orgId, invoice });
});

export async function getBillingHealth() {
  try {
    const plan = await billingRepository.getDefaultPlan();
    return {
      configured: billingRepository.enabled(),
      reachable: Boolean(plan),
      stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      lastInvoiceGenerationTime: undefined,
    };
  } catch (err) {
    return {
      configured: billingRepository.enabled(),
      reachable: false,
      stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      message: err instanceof Error ? err.message : "billing health check failed",
    };
  }
}
