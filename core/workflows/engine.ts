
import type { ExecutionRequest, ExecutionResult } from "../types";
import { createId } from "../types";
import { publishEvent } from "../events/bus";
import { runAgent } from "../agents/runtime";

export async function runWorkflow(request: ExecutionRequest = {}): Promise<ExecutionResult> {
  const id = request.id ?? createId("workflowrun");
  const started = publishEvent("workflow.started", { id, workflowId: request.workflowId }, request.domain);
  const agentResult = await runAgent({ ...request, id: `${id}.agent` });
  const completed = publishEvent("workflow.completed", { id, workflowId: request.workflowId, agentRunId: agentResult.id }, request.domain);
  return { id, namespace: "workflows.engine", status: "completed", output: { workflowId: request.workflowId ?? "workflows.grid-readiness" }, metadata: { agentResult }, events: [started, completed] };
}
