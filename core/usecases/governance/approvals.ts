
import { createId, type JsonRecord } from "../../types";
const approvals: JsonRecord[] = [];
export function requestApproval(input: JsonRecord) { const item = { id: createId("approval"), namespace: "usecases.governance.approvals", status: "requested", ...input }; approvals.push(item); return item; }
export function decideApproval(id: string, status: "approved" | "rejected") { const item = approvals.find((approval) => approval.id === id) ?? { id, namespace: "usecases.governance.approvals" }; item.status = status; return item; }
