import { Router, Request, Response } from "express";
import { WorkflowEngine } from "../../packages/workflow-engine";
import type { WorkflowDefinition } from "../../packages/shared-types";
import { allTools } from "../../tools";
import { getOrgId, invokeGovernedTool, meterUsage, persistRecord, writeAuditLog, type TenantRequest } from "../platform";
import { metrics } from "../observability";

export const workflowRouter = Router();

function buildEngine(orgId: string, actorId?: string): WorkflowEngine {
  const engine = new WorkflowEngine();
  for (const tool of allTools) {
    engine.registerHandler(tool.name, async (params) => {
      const result = await invokeGovernedTool({ orgId, actorId, tool, params, source: "workflow_step" });
      meterUsage({ orgId, actorId, meter: "workflow_step", source: "workflow", sourceId: tool.name, metadata: { capability: tool.name } });
      metrics.increment("hoare_workflow_steps_total", { org_id: orgId, capability: tool.name });
      return result;
    });
  }
  return engine;
}

workflowRouter.post("/execute", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const actorId = (req as TenantRequest).tenant?.actorId;
  const definition = req.body?.definition as WorkflowDefinition | undefined;
  if (!definition?.steps) {
    res.status(400).json({ error: "definition with steps is required." });
    return;
  }

  const engine = buildEngine(orgId, actorId);
  const run = await engine.execute(definition);
  persistRecord("workflow_runs", {
    id: run.id,
    org_id: orgId,
    workflow_id: run.workflowId,
    status: run.status,
    definition,
    step_results: run.stepResults,
    error: run.error,
    started_at: new Date(run.startedAt).toISOString(),
    completed_at: run.completedAt ? new Date(run.completedAt).toISOString() : undefined,
  });
  meterUsage({ orgId, actorId, meter: "workflow_run", source: "workflow", sourceId: definition.id, metadata: { status: run.status } });
  metrics.increment("hoare_workflow_runs_total", { org_id: orgId, status: run.status });
  writeAuditLog({ org_id: orgId, actor_id: actorId, action: "workflow.execute", resource_type: "workflow", resource_id: definition.id, decision: run.status, metadata: { runId: run.id } });
  res.status(run.status === "failed" ? 500 : 200).json(run);
});

export function workflowHealth(): "ok" {
  return "ok";
}
