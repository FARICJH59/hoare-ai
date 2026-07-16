
import { createId, type JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import { registerFederation, listFederations } from "./registry";
import { getFederationState, updateFederationState } from "./state";
import { applyConsensus } from "./strategies/consensus";

export function createFederation(input: JsonRecord) {
  const federation = registerFederation({ id: createId("federation"), status: "created", ...input });
  publishEvent("federation.created", { federation });
  return { namespace: "federation.engine", status: "created", federation };
}

export function runFederation(input: JsonRecord) {
  const strategy = applyConsensus(input);
  updateFederationState({ lastRunAt: new Date().toISOString(), strategy });
  publishEvent("federation.executed", { strategy });
  publishEvent("federation.strategy.applied", { strategy });
  return { namespace: "federation.engine", status: "completed", strategy };
}

export { listFederations, getFederationState };
