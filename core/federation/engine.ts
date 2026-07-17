import { createId, type JsonRecord } from "../types";
import { publishDeadLetter, publishEvent } from "../events/bus";
import { withCircuitBreaker, withRetry } from "../hardening";
import { registerFederation, listFederations } from "./registry";
import { getFederationState, updateFederationState } from "./state";
import { applyConsensus } from "./strategies/consensus";

export function createFederation(input: JsonRecord) {
  const federation = registerFederation({ id: createId("federation"), status: "created", ...input });
  publishEvent("federation.created", { federation });
  return { namespace: "federation.engine", status: "created", federation };
}

export async function runFederation(input: JsonRecord) {
  return withCircuitBreaker("federation.consensus", 3, 30_000, async () => withRetry(async () => {
    const strategy = applyConsensus(input);
    updateFederationState({ lastRunAt: new Date().toISOString(), strategy });
    publishEvent("federation.executed", { strategy });
    publishEvent("federation.strategy.applied", { strategy });
    return { namespace: "federation.engine", status: "completed", strategy };
  }, 1, 50), () => {
    publishDeadLetter("federation.consensus.failed", input);
    return { namespace: "federation.engine", status: "completed", degraded: true, strategy: { namespace: "federation.strategies.safeFallback", result: input } };
  });
}

export { listFederations, getFederationState };
