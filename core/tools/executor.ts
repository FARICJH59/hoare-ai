import type { ExecutionRequest, ExecutionResult } from "../types";
import { createId } from "../types";
import { publishEvent } from "../events/bus";
import { getTool } from "./registry";
import { stabilityHardening } from "../config/hardening/stability";
import { getHardenedContext, toSafeError, withCircuitBreaker, withRetry, withTimeout } from "../hardening";
import { incrementMetric } from "../observability/metrics";

async function executeToolCore(request: ExecutionRequest): Promise<ExecutionResult> {
  const context = getHardenedContext(request);
  const tool = getTool(request.toolName);
  const event = publishEvent("tool.executed", { toolId: tool.id, input: request.input ?? {}, tenantId: context.tenantId, correlationId: context.correlationId }, request.domain);
  incrementMetric("tools.calls");
  return {
    id: createId("toolrun"),
    namespace: "tools.executor",
    status: "completed",
    output: { toolId: tool.id, result: "executed", input: request.input ?? {}, tenantId: context.tenantId },
    metadata: { context },
    events: [event],
  };
}

export async function executeTool(request: ExecutionRequest): Promise<ExecutionResult> {
  const tool = getTool(request.toolName);
  const fallback = () => ({
    id: createId("toolrun"),
    namespace: "tools.executor",
    status: "completed" as const,
    output: { toolId: tool.id, result: "fallback", safeDefault: true },
    metadata: { circuitOpen: true },
  });
  return withCircuitBreaker(
    `tool:${tool.id}`,
    stabilityHardening.tools.circuitBreakerFailures,
    stabilityHardening.tools.circuitBreakerResetMs,
    () => withRetry(() => withTimeout(executeToolCore(request), stabilityHardening.tools.timeoutMs, "tool.timeout"), stabilityHardening.tools.retries, 50),
    fallback
  ).catch((error) => {
    const safeError = toSafeError(error);
    return { ...fallback(), metadata: { error: safeError } };
  });
}
