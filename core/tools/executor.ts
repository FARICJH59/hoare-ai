
import type { ExecutionRequest, ExecutionResult } from "../types";
import { createId } from "../types";
import { publishEvent } from "../events/bus";
import { getTool } from "./registry";

export async function executeTool(request: ExecutionRequest): Promise<ExecutionResult> {
  const tool = getTool(request.toolName);
  const event = publishEvent("tool.executed", { toolId: tool.id, input: request.input ?? {} }, request.domain);
  return {
    id: createId("toolrun"),
    namespace: "tools.executor",
    status: "completed",
    output: { toolId: tool.id, result: "executed", input: request.input ?? {} },
    events: [event],
  };
}
