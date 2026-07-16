
import type { JsonRecord } from "../types";
const federations: JsonRecord[] = [];
export function registerFederation(federation: JsonRecord) { federations.push({ namespace: "federation.registry", ...federation }); return federations[federations.length - 1]; }
export function listFederations() { return { namespace: "federation.registry", count: federations.length, items: federations }; }
