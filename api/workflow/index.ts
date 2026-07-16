import { Router, Request, Response } from "express";
import { WorkflowEngine } from "../../packages/workflow-engine";
import type { WorkflowDefinition } from "../../packages/shared-types";
import { allTools } from "../../tools";
import { getOrgId, invokeGovernedTool, meterUsage, writeAuditLog, type TenantRequest } from "../platform";
import { metrics } from "../observability";

export const workflowRouter = Router();

const workflowRuns = new Map<string, unknown>();

function buildEngine(orgId: string, actor?: string): WorkflowEngine {
  const engine = new WorkflowEngine();
  for (const tool of allTools) {
    engine.registerHandler(tool.name, async (params) => {
      const result = await invokeGovernedTool({ orgId, actor, tool, params });
      meterUsage(orgId, "workflow_step", 1, { tool: tool.name });
      metrics.increment("hoare_workflow_steps_total", { org_id: orgId, capability: tool.name });
      return result;
    });
  }
  return engine;
}

function validateDefinition(definition: WorkflowDefinition): string[] {
  const stepIds = new Set(definition.steps.map((step) => step.id));
  const errors: string[] = [];
  for (const step of definition.steps) {
    if (!allTools.some((tool) => tool.name === step.capabilityId)) errors.push(`No handler registered for ${step.capabilityId}`);
    for (const dep of step.dependsOn) if (!stepIds.has(dep)) errors.push(`Missing dependency ${dep} for step ${step.id}`);
  }
  return errors;
}

workflowRouter.post("/dry-build", (req: Request, res: Response) => {
  const definition = req.body?.definition as WorkflowDefinition | undefined;
  if (!definition?.steps) {
    res.status(400).json({ error: "definition with steps is required." });
    return;
  }
  const errors = validateDefinition(definition);
  res.json({ valid: errors.length === 0, errors, steps: definition.steps.length });
});

workflowRouter.post("/execute", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const actor = (req as TenantRequest).auth?.subject;
  const definition = req.body?.definition as WorkflowDefinition | undefined;
  if (!definition?.steps) {
    res.status(400).json({ error: "definition with steps is required." });
    return;
  }
  const errors = validateDefinition(definition);
  if (errors.length > 0) {
    res.status(400).json({ error: "workflow dry-build failed", errors });
    return;
  }
  const engine = buildEngine(orgId, actor);
  const run = await engine.execute(definition);
  workflowRuns.set(run.id, { ...run, orgId });
  meterUsage(orgId, "workflow_run", 1, { workflowId: definition.id, status: run.status });
  metrics.increment("hoare_workflow_runs_total", { org_id: orgId, status: run.status });
  writeAuditLog({ orgId, actor, action: "workflow.execute", resource: definition.id, metadata: { runId: run.id, status: run.status } });
  res.status(run.status === "failed" ? 500 : 200).json(run);
});

workflowRouter.get("/runs", (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  res.json({ runs: Array.from(workflowRuns.values()).filter((run) => (run as { orgId?: string }).orgId === orgId) });
});

export function workflowHealth(): "ok" | "degraded" {
  return "ok";
}
