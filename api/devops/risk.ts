import { Router, Request, Response } from "express";
import { getUsage, meterUsage, writeAuditLog, getOrgId, type TenantRequest } from "../platform";
import { metrics } from "../observability";

export interface DevopsRiskScore {
  orgId: string;
  overallScore: number;
  domains: Record<string, number>;
  events: Array<{ domain: string; severity: "low" | "medium" | "high"; message: string }>;
  createdAt: string;
}

const latestScores = new Map<string, DevopsRiskScore>();

function envPresent(name: string): boolean {
  return Boolean(process.env[name]);
}

export function collectRiskSignals(orgId: string): DevopsRiskScore["events"] {
  const usage = getUsage(orgId);
  const events: DevopsRiskScore["events"] = [];
  if (!envPresent("DATABASE_URL")) events.push({ domain: "durability", severity: "medium", message: "DATABASE_URL is not configured for durable workflow/session storage." });
  if (!envPresent("STRIPE_SECRET_KEY")) events.push({ domain: "billing", severity: "medium", message: "Stripe secret is not configured." });
  if (!envPresent("NEXT_PUBLIC_SUPABASE_URL") && !envPresent("SUPABASE_URL")) events.push({ domain: "supabase", severity: "medium", message: "Supabase URL is not configured." });
  if ((usage.totals.tool_invocation ?? 0) === 0) events.push({ domain: "tools", severity: "low", message: "No tool invocation telemetry has been recorded for this org." });
  if ((usage.totals.workflow_run ?? 0) === 0) events.push({ domain: "workflows", severity: "low", message: "No workflow run persistence has been exercised for this org." });
  if (!envPresent("ENERGY_TELEMETRY_URL")) events.push({ domain: "energy", severity: "low", message: "Energy telemetry feed is not configured." });
  return events;
}

function scoreDomain(events: DevopsRiskScore["events"], domain: string): number {
  const domainEvents = events.filter((event) => event.domain === domain);
  const penalty = domainEvents.reduce((sum, event) => sum + (event.severity === "high" ? 30 : event.severity === "medium" ? 18 : 8), 0);
  return Math.max(0, 100 - penalty);
}

export function runDevopsRiskAnalysis(orgId: string): DevopsRiskScore {
  const events = collectRiskSignals(orgId);
  const domains = {
    deploymentLogs: scoreDomain(events, "deployment"),
    envVars: scoreDomain(events, "durability"),
    stripeConfig: scoreDomain(events, "billing"),
    supabaseSchema: scoreDomain(events, "supabase"),
    governance: 100,
    energyTelemetry: scoreDomain(events, "energy"),
    workflowDurability: scoreDomain(events, "workflows"),
    toolSafety: scoreDomain(events, "tools"),
  };
  const overallScore = Math.round(Object.values(domains).reduce((sum, score) => sum + score, 0) / Object.keys(domains).length);
  const score: DevopsRiskScore = { orgId, overallScore, domains, events, createdAt: new Date().toISOString() };
  latestScores.set(orgId, score);
  metrics.gauge("hoare_devops_risk_score", overallScore, { org_id: orgId });
  metrics.increment("hoare_devops_risk_events_total", { org_id: orgId }, events.length);
  return score;
}

export function getLatestDevopsRiskScore(orgId = "dev-org"): DevopsRiskScore {
  return latestScores.get(orgId) ?? runDevopsRiskAnalysis(orgId);
}

export function devopsRiskHealth(): "ok" | "degraded" {
  const latest = getLatestDevopsRiskScore();
  return latest.overallScore >= 60 ? "ok" : "degraded";
}

export const devopsRiskRouter = Router();

devopsRiskRouter.get("/risk", (req: Request, res: Response) => {
  res.json(getLatestDevopsRiskScore(getOrgId(req)));
});

devopsRiskRouter.post("/risk", (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const actor = (req as TenantRequest).auth?.subject;
  const score = runDevopsRiskAnalysis(orgId);
  meterUsage(orgId, "devops_risk_analysis", 1, { score: score.overallScore });
  writeAuditLog({ orgId, actor, action: "devops.risk.analyze", resource: orgId, metadata: { score: score.overallScore } });
  res.json(score);
});
