import type { ExecutionRequest, ExecutionResult } from "../types";
import { createId } from "../types";
import { publishEvent } from "../events/bus";
import { runAgent } from "../agents/runtime";
import { stabilityHardening } from "../config/hardening/stability";
import { getHardenedContext, toSafeError, withConcurrency, withRetry, withTimeout } from "../hardening";
import { incrementMetric } from "../observability/metrics";
import { startTrace } from "../observability/traces";

async function runWorkflowCore(request: ExecutionRequest, id: string): Promise<ExecutionResult> {
  const context = getHardenedContext({ ...request, id });
  const trace = startTrace("workflows.engine.run", { id, workflowId: request.workflowId, correlationId: context.correlationId, tenantId: context.tenantId });
  const started = publishEvent("workflow.started", { id, workflowId: request.workflowId ?? "workflows.grid-readiness", correlationId: context.correlationId, tenantId: context.tenantId }, request.domain);
  const agentResult = await runAgent({ ...request, id: `${id}.agent`, metadata: { ...request.metadata, correlationId: context.correlationId, tenantId: context.tenantId } });
  const completed = publishEvent("workflow.completed", { id, workflowId: request.workflowId ?? "workflows.grid-readiness", agentRunId: agentResult.id, correlationId: context.correlationId }, request.domain);
  incrementMetric("workflows.runs");
  return { id, namespace: "workflows.engine", status: "completed", output: { workflowId: request.workflowId ?? "workflows.grid-readiness", tenantId: context.tenantId }, metadata: { agentResult, trace, context }, events: [started, completed] };
}

export async function runWorkflow(request: ExecutionRequest = {}): Promise<ExecutionResult> {
  const id = request.id ?? createId("workflowrun");
  const key = `workflow:${request.workflowId ?? "default"}`;
  return withConcurrency(key, stabilityHardening.workflows.maxConcurrency, () =>
    withRetry(() => withTimeout(runWorkflowCore(request, id), stabilityHardening.workflows.timeoutMs, "workflow.timeout"), stabilityHardening.workflows.retries, stabilityHardening.workflows.retryDelayMs)
  ).catch((error) => ({ id, namespace: "workflows.engine", status: "failed", output: { fallback: true }, metadata: { error: toSafeError(error) } }));
}
