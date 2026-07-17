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
import { stabilityHardening } from "../config/hardening/stability";
import { getHardenedContext, toSafeError, withConcurrency, withRetry, withTimeout } from "../hardening";

async function runAgentCore(request: ExecutionRequest, id: string): Promise<ExecutionResult> {
  const context = getHardenedContext({ ...request, id });
  const agent = getAgent(request.agentId);
  const domain = getDomainMetadata(request.domain);
  const trace = startTrace("agents.runtime.run", { id, agentId: agent.id, correlationId: context.correlationId, tenantId: context.tenantId });
  const started = publishEvent("agent.started", { id, agentId: agent.id, correlationId: context.correlationId, tenantId: context.tenantId }, request.domain);
  log("agents.runtime", "agent execution started", { id, agentId: agent.id, correlationId: context.correlationId, tenantId: context.tenantId, environment: context.environment, version: context.version });
  incrementMetric("agents.runtime.started");

  let safety;
  let risk;
  try {
    safety = evaluateSafety(request);
    incrementMetric("safety.decisions");
    if (!safety.allowed) {
      incrementMetric("agents.runtime.blocked");
      return { id, namespace: "agents.runtime", status: "blocked", metadata: { agent, domain, safety, trace, context }, events: [started] };
    }
    risk = evaluateRisk(request);
    incrementMetric("risk.decisions");
  } catch (error) {
    const safeError = toSafeError(error);
    publishEvent("agent.failed", { id, agentId: agent.id, error: safeError, correlationId: context.correlationId }, request.domain);
    return { id, namespace: "agents.runtime", status: "blocked", output: { reason: "safety-or-risk-failed" }, metadata: { agent, domain, error: safeError, trace, context }, events: [started] };
  }

  const orchestration = planDeterministicRoute(request);
  const tool = request.toolName ? await executeTool({ ...request, metadata: { ...request.metadata, correlationId: context.correlationId, tenantId: context.tenantId, role: context.role } }) : undefined;
  const scheduled = request.metadata?.schedule ? scheduleTask({ agentId: agent.id, schedule: request.metadata.schedule, tenantId: context.tenantId, correlationId: context.correlationId }) : undefined;
  const mailbox = getMailbox(agent.id);
  const federation = getFederationState();

  const output = { agentId: agent.id, toolOutput: tool?.output ?? {}, input: request.input ?? {}, tenantId: context.tenantId };
  setRecord(`agents.state.${context.tenantId}.${id}`, { id, agentId: agent.id, output, correlationId: context.correlationId });
  const completed = publishEvent("agent.completed", { id, agentId: agent.id, risk, correlationId: context.correlationId, tenantId: context.tenantId }, request.domain);
  incrementMetric("agents.runtime.completed");

  return {
    id,
    namespace: "agents.runtime",
    status: "completed",
    output,
    metadata: { agent, domain, safety, risk, orchestration, trace, mailbox, federation, scheduled, context },
    events: [started, ...(tool?.events ?? []), completed],
  };
}

export async function runAgent(request: ExecutionRequest = {}): Promise<ExecutionResult> {
  const id = request.id ?? createId("agentrun");
  const agent = getAgent(request.agentId);
  return withConcurrency(`agent:${agent.id}`, stabilityHardening.agents.maxConcurrency, () =>
    withRetry(() => withTimeout(runAgentCore(request, id), stabilityHardening.agents.timeoutMs, "agent.timeout"), stabilityHardening.agents.retries, stabilityHardening.agents.retryDelayMs)
      .catch((error) => {
        const safeError = toSafeError(error);
        publishEvent("agent.failed", { id, agentId: agent.id, error: safeError }, request.domain);
        incrementMetric("agents.runtime.failed");
        return { id, namespace: "agents.runtime", status: "failed", output: { fallback: true }, metadata: { error: safeError } };
      })
  );
}
