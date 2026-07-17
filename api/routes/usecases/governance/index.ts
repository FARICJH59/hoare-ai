
import { Router } from "express";
import { body, ok } from "../../respond";
import { governancePolicies, listAudit, requestGovernanceApproval, approveGovernanceApproval, rejectGovernanceApproval } from "../../../../core/usecases/governance/engine";
export const usecaseGovernancePhaseRouter = Router();
usecaseGovernancePhaseRouter.get("/usecases/governance/policies", (_req, res) => ok(res, { namespace: "usecases.governance.policies", items: governancePolicies }));
usecaseGovernancePhaseRouter.get("/usecases/governance/roles", (_req, res) => ok(res, { namespace: "usecases.governance.roles", items: ["admin", "operator", "viewer", "auditor"] }));
usecaseGovernancePhaseRouter.get("/usecases/governance/audit", (_req, res) => ok(res, listAudit()));
usecaseGovernancePhaseRouter.post("/usecases/governance/approval/request", (req, res) => ok(res, requestGovernanceApproval(body(req))));
usecaseGovernancePhaseRouter.post("/usecases/governance/approval/approve", (req, res) => ok(res, approveGovernanceApproval(String(body(req).id ?? ""))));
usecaseGovernancePhaseRouter.post("/usecases/governance/approval/reject", (req, res) => ok(res, rejectGovernanceApproval(String(body(req).id ?? ""))));
