import type { JsonRecord } from "../../types";
import { enterpriseHardening } from "../../config/hardening/enterprise";
import { securityHardening } from "../../config/hardening/security";
import { getHardenedContext, assertRole } from "../../hardening";
import { publishEvent } from "../../events/bus";
import { governancePolicies } from "./policies";
import { requestApproval, decideApproval } from "./approvals";
import { listAudit, logAudit } from "./audit";

export function enforceGovernance(input: JsonRecord) {
  const context = getHardenedContext({ input, metadata: input });
  const environment = String(input.environment ?? context.environment);
  const action = String(input.action ?? "run");
  const channel = String(input.channel ?? context.channel);
  const approvalId = input.approvalId;
  const restrictedEnvironment = (securityHardening.restrictedEnvironments as readonly string[]).includes(environment);
  const promotionRestricted = ["stable", "sovereign"].includes(channel) && action !== "read";
  const requiresApproval = restrictedEnvironment || promotionRestricted || (securityHardening.restrictedActions as readonly string[]).includes(action);
  const allowedRole = assertRole(context.role, requiresApproval ? "admin" : "operator");
  const missingSovereignMetadata = environment === "sovereignRegion" ? enterpriseHardening.sovereignRequiredMetadata.filter((key) => !input[key]) : [];
  const allowed = allowedRole && (!requiresApproval || Boolean(approvalId)) && missingSovereignMetadata.length === 0;
  const result = { namespace: "usecases.governance.engine", allowed, requiresApproval, policies: governancePolicies, context, missingSovereignMetadata };
  logAudit({ action: "enforce", input, result });
  if (!allowed) publishEvent("governance.policy.triggered", { action, environment, channel, missingSovereignMetadata, tenantId: context.tenantId });
  return result;
}

export function requestGovernanceApproval(input: JsonRecord) { const approval = requestApproval(input); publishEvent("governance.approval.requested", { approval }); return approval; }
export function approveGovernanceApproval(id: string) { const approval = decideApproval(id, "approved"); publishEvent("governance.approval.approved", { approval }); return approval; }
export function rejectGovernanceApproval(id: string) { const approval = decideApproval(id, "rejected"); publishEvent("governance.approval.rejected", { approval }); return approval; }
export { listAudit, governancePolicies };
