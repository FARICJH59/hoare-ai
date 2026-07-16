
import type { ExecutionRequest } from "../types";
import { deterministicSeed } from "./determinism";

export function planDeterministicRoute(request: ExecutionRequest) {
  return { namespace: "orchestration.gps", enabled: Boolean(request.deterministic), routeId: deterministicSeed(request), domain: request.domain ?? "global" };
}
