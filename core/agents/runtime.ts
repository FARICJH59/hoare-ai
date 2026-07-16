
import type { ExecutionRequest, ExecutionResult } from "../types";
import { createId } from "../types";
import { getAgent } from "./registry";
import { evaluateSafety } from "../safety/engine";
import { evaluateRisk } from "../risk/engine";
import { executeTool } from "../tools/executor";
import { log } from "../observability/logger";
import { startTrace } from "../observability/traces";
import { incrementMetric } from "../observability/metrics";
import { planDeterministicRoute } from "../orchestration/gps";
import { getDomainMetadata } from "../domain/registry";
import { publishEvent } from "../events/bus";
import { getMailbox } from "../messaging/mailbox";
import { scheduleTask } from "../scheduling/engine";
import { getFederationState } from "../federation/state";
import { setRecord } from "../persistence/engine";

export async function runAgent(request: ExecutionRequest = {}): Promise<ExecutionResult> {
  const id = request.id ?? createId("agentrun");
  const agent = getAgent(request.agentId);
  const domain = getDomainMetadata(request.domain);
  const trace = startTrace("agents.runtime.run", { id, agentId: agent.id });
  const started = publishEvent("agent.started", { id, agentId: agent.id }, request.domain);
  log("agents.runtime", "agent execution started", { id, agentId: agent.id });
  incrementMetric("agents.runtime.started");

  const safety = evaluateSafety(request);
  if (!safety.allowed) {
    incrementMetric("agents.runtime.blocked");
    return { id, namespace: "agents.runtime", status: "blocked", metadata: { agent, domain, safety, trace }, events: [started] };
  }

  const risk = evaluateRisk(request);
  const orchestration = planDeterministicRoute(request);
  const tool = request.toolName ? await executeTool(request) : undefined;
  const scheduled = request.metadata?.schedule ? scheduleTask({ agentId: agent.id, schedule: request.metadata.schedule }) : undefined;
  const mailbox = getMailbox(agent.id);
  const federation = getFederationState();

  const output = { agentId: agent.id, toolOutput: tool?.output ?? {}, input: request.input ?? {} };
  setRecord(`agents.state.${id}`, { id, agentId: agent.id, output });
  const completed = publishEvent("agent.completed", { id, agentId: agent.id, risk }, request.domain);
  incrementMetric("agents.runtime.completed");

  return {
    id,
    namespace: "agents.runtime",
    status: "completed",
    output,
    metadata: { agent, domain, safety, risk, orchestration, trace, mailbox, federation, scheduled },
    events: [started, ...(tool?.events ?? []), completed],
  };
}
