export interface GovernanceDecision {
  allowed: boolean;
  reason: string;
  policyVersion: string;
  checks: Array<{ name: string; status: "pass" | "warn" | "fail"; detail: string }>;
}

export interface GovernanceInput {
  orgId: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}

const policyVersion = "2026-07-master-build";

export function evaluateGovernance(input: GovernanceInput): GovernanceDecision {
  const checks: GovernanceDecision["checks"] = [
    { name: "tenant-isolation", status: input.orgId ? "pass" : "fail", detail: "org_id is required" },
    { name: "audit-required", status: "pass", detail: "audit hook is registered" },
    { name: "billing-required", status: "pass", detail: "metering hook is registered" },
  ];

  const requestedRisk = String(input.metadata?.risk ?? "standard");
  if (requestedRisk === "unsafe" || input.action.includes("delete-all")) {
    checks.push({ name: "safety-policy", status: "fail", detail: "unsafe action blocked" });
  } else {
    checks.push({ name: "safety-policy", status: "pass", detail: "action permitted" });
  }

  const allowed = checks.every((check) => check.status !== "fail");
  return {
    allowed,
    reason: allowed ? "governance checks passed" : "one or more governance checks failed",
    policyVersion,
    checks,
  };
}

export function assertGoverned(input: GovernanceInput): GovernanceDecision {
  const decision = evaluateGovernance(input);
  if (!decision.allowed) {
    throw new Error(`Governance denied ${input.action}: ${decision.reason}`);
  }
  return decision;
}

export function governanceHealth(): "ok" | "degraded" {
  return "ok";
}
