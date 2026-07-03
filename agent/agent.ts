import { routeTask, type RouteResult } from "./router";
import { appendSessionMemory, getSessionMemory } from "./memory";
import type { VerificationResult } from "./hoare-agent";
import type { ToolPayload } from "../tools/types";

// The HOARE-AGENT verification engine lives in a sibling repository.
// The import below will resolve at runtime once HOARE-AGENT is installed.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: module not yet installed
import { verify } from "../../../HOARE-AGENT/verify";

export type AgentRequest = {
  sessionId: string;
  kind: string;
  payload: ToolPayload;
};

export type AgentResponse = {
  session: string;
  result: RouteResult;
  verification: VerificationResult;
  memory: ReturnType<typeof getSessionMemory>;
};

export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const { sessionId, kind, payload } = request;

  const result = await routeTask(kind, payload);

  const verification = verify(result) as VerificationResult;

  appendSessionMemory(sessionId, {
    payload,
    kind,
    result,
    verification,
    timestamp: Date.now(),
  });

  return {
    session: sessionId,
    memory: getSessionMemory(sessionId),
    result,
    verification,
  };
}
