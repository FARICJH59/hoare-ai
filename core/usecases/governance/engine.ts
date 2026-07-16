
import type { JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { governancePolicies } from "./policies";
import { requestApproval, decideApproval } from "./approvals";
import { listAudit, logAudit } from "./audit";
export function enforceGovernance(input: JsonRecord) { logAudit({ action: "enforce", input }); return { namespace: "usecases.governance.engine", allowed: true, policies: governancePolicies }; }
export function requestGovernanceApproval(input: JsonRecord) { const approval = requestApproval(input); publishEvent("governance.approval.requested", { approval }); return approval; }
export function approveGovernanceApproval(id: string) { const approval = decideApproval(id, "approved"); publishEvent("governance.approval.approved", { approval }); return approval; }
export function rejectGovernanceApproval(id: string) { const approval = decideApproval(id, "rejected"); publishEvent("governance.approval.rejected", { approval }); return approval; }
export { listAudit, governancePolicies };
