
import type { JsonRecord } from "../../types";
const audit: JsonRecord[] = [];
export function logAudit(input: JsonRecord) { const item = { namespace: "usecases.governance.audit", at: new Date().toISOString(), ...input }; audit.push(item); return item; }
export function listAudit() { return { namespace: "usecases.governance.audit", count: audit.length, items: audit }; }
