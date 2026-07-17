
import type { ListResult, PhaseEntity } from "../types";

export const safetyPolicies: PhaseEntity[] = [
  { id: "safety.policy.no-destructive-default", namespace: "safety.policies", name: "No destructive default", description: "Blocks destructive actions unless explicitly approved." },
  { id: "safety.policy.human-approval-high-impact", namespace: "safety.policies", name: "Human approval for high impact", description: "Requires approval metadata for high-impact grid operations." },
];

export function listSafetyPolicies(): ListResult<PhaseEntity> {
  return { namespace: "safety.policies", count: safetyPolicies.length, items: safetyPolicies };
}
