import { v4 as uuidv4 } from "uuid";
import { metrics } from "../observability";
import { writeAuditLog } from "./audit";
import { persistRecord } from "./storage";

export type GovernanceDecisionKind = "allow" | "downgrade" | "block";

export interface GovernanceDecision {
  id: string;
  org_id: string;
  actor_id?: string;
  action: string;
  resource: string;
  decision: GovernanceDecisionKind;
  reason: string;
  policy_version: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface GovernanceInput {
  orgId: string;
  actorId?: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}

const policyVersion = "phase1-core-platform-hardening";

function decide(input: GovernanceInput): GovernanceDecisionKind {
  const risk = String(input.metadata?.risk ?? "standard");
  if (risk === "unsafe" || input.action.includes("delete-all") || input.resource.includes("unsafe")) return "block";
  if (risk === "high" || input.metadata?.requiresDowngrade === true) return "downgrade";
  return "allow";
}

function record(input: GovernanceInput, decision: GovernanceDecisionKind, reason: string): GovernanceDecision {
  const entry: GovernanceDecision = {
    id: uuidv4(),
    org_id: input.orgId,
    actor_id: input.actorId,
    action: input.action,
    resource: input.resource,
    decision,
    reason,
    policy_version: policyVersion,
    metadata: input.metadata ?? {},
    created_at: new Date().toISOString(),
  };
  persistRecord("governance_decisions", entry as unknown as Record<string, unknown>);
  metrics.increment("hoare_governance_decisions_total", { org_id: input.orgId, decision, action: input.action });
  writeAuditLog({ org_id: input.orgId, actor_id: input.actorId, action: "governance.decision", resource_type: input.resource, decision, metadata: { reason } });
  return entry;
}

export const governance = {
  check(input: GovernanceInput): GovernanceDecision {
    const decision = decide(input);
    if (decision === "block") return this.block(input, "unsafe action blocked by governance policy");
    if (decision === "downgrade") return this.downgrade(input, "high-risk action downgraded by governance policy");
    return record(input, "allow", "governance checks passed");
  },

  downgrade(input: GovernanceInput, reason = "action downgraded"): GovernanceDecision {
    return record(input, "downgrade", reason);
  },

  block(input: GovernanceInput, reason = "action blocked"): GovernanceDecision {
    return record(input, "block", reason);
  },
};

export function assertGoverned(input: GovernanceInput): GovernanceDecision {
  const decision = governance.check(input);
  if (decision.decision === "block") throw new Error(`Governance blocked ${input.action}: ${decision.reason}`);
  return decision;
}

export function applyGovernanceDowngrade<T extends Record<string, unknown>>(params: T, decision: GovernanceDecision): T {
  if (decision.decision !== "downgrade") return params;
  return { ...params, maxTokens: Math.min(Number(params.maxTokens ?? 512), 512), risk: "downgraded" } as T;
}

export function governanceHealth(): "ok" {
  return "ok";
}
