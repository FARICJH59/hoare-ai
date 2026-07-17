
import type { ExecutionRequest } from "../types";

export function deterministicSeed(request: ExecutionRequest) {
  return Buffer.from(JSON.stringify({ input: request.input ?? {}, domain: request.domain ?? "global" })).toString("base64url").slice(0, 16);
}
