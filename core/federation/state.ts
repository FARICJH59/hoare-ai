
import type { JsonRecord } from "../types";
const state: JsonRecord = { namespace: "federation.state", members: [], shared: {} };
export function getFederationState() { return state; }
export function updateFederationState(next: JsonRecord) { Object.assign(state, next); return state; }
