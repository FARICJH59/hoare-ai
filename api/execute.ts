import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { allTools } from "../tools";
import { jobRepository } from "./storage/repositories";
import type { AuthenticatedRequest } from "./middleware/auth";
import { enforceEntitlement, recordUsageEvent } from "./billing/entitlements";

function resolveOrgId(req: AuthenticatedRequest): string {
  if (req.auth?.type === "jwt" && req.auth.subject) return req.auth.subject;
  return typeof req.headers["x-org-id"] === "string" ? req.headers["x-org-id"] : "default-org";
}

function toolDomain(toolName: string): string {
  return toolName.split("-")[0] || "general";
}

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface ExecutionJob {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  status: ExecutionStatus;
  result?: unknown;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

const jobs: Map<string, ExecutionJob> = new Map();

async function persistJob(job: ExecutionJob): Promise<void> {
  try {
    await jobRepository.upsert(job);
  } catch (err) {
    console.warn("job_persist_failed", err instanceof Error ? err.message : err);
  }
}

export async function listExecutionJobs(): Promise<ExecutionJob[]> {
  try {
    const persisted = await jobRepository.list();
    const merged = new Map<string, ExecutionJob>();
    for (const job of persisted) merged.set(job.id, job);
    for (const job of jobs.values()) merged.set(job.id, job);
    return Array.from(merged.values());
  } catch {
    return Array.from(jobs.values());
  }
}

export const executeRouter = Router();

// POST /api/execute — submit a tool execution job
executeRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const { toolName, params, async: runAsync } = req.body as {
    toolName?: string;
    params?: Record<string, unknown>;
    async?: boolean;
  };

  if (!toolName || typeof toolName !== "string") {
    res.status(400).json({ error: "toolName is required." });
    return;
  }

  const tool = allTools.find((t) => t.name === toolName);
  if (!tool) {
    res.status(404).json({ error: `Tool "${toolName}" not found.` });
    return;
  }

  const orgId = resolveOrgId(req);
  const toolEntitlement = await enforceEntitlement(orgId, "DOMAIN_TOOL_INVOCATION");
  if (!toolEntitlement.allowed) {
    res.status(402).json({ error: "Action blocked: plan limit reached for DOMAIN_TOOL_INVOCATION.", governanceDecision: toolEntitlement.governanceDecision });
    return;
  }
  const workflowEntitlement = await enforceEntitlement(orgId, "WORKFLOW_RUN");
  if (!workflowEntitlement.allowed) {
    res.status(402).json({ error: "Action blocked: plan limit reached for WORKFLOW_RUN.", governanceDecision: workflowEntitlement.governanceDecision });
    return;
  }

  const jobId = uuidv4();
  const job: ExecutionJob = {
    id: jobId,
    toolName,
    params: params ?? {},
    status: "pending",
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  await persistJob(job);

  if (runAsync) {
    // Fire-and-forget
    setImmediate(async () => {
      job.status = "running";
      await persistJob(job);
      try {
        job.result = await tool.execute({ ...job.params, orgId, userId: req.auth?.subject, workflowId: job.id });
        job.status = "completed";
        await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "DOMAIN_TOOL_INVOCATION", eventContext: { toolName, domain: toolDomain(toolName), workflowId: job.id } });
        await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "WORKFLOW_RUN", eventContext: { workflowId: job.id, orgId, status: job.status } });
      } catch (err) {
        job.error = err instanceof Error ? err.message : String(err);
        job.status = "failed";
      } finally {
        job.completedAt = Date.now();
        await persistJob(job);
      }
    });
    res.status(202).json({ jobId, status: "pending" });
    return;
  }

  // Synchronous execution
  job.status = "running";
  await persistJob(job);
  try {
    job.result = await tool.execute({ ...job.params, orgId, userId: req.auth?.subject, workflowId: job.id });
    job.status = "completed";
    await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "DOMAIN_TOOL_INVOCATION", eventContext: { toolName, domain: toolDomain(toolName), workflowId: job.id } });
    await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "WORKFLOW_RUN", eventContext: { workflowId: job.id, orgId, status: job.status } });
    job.completedAt = Date.now();
    await persistJob(job);
    res.json({ jobId, status: job.status, result: job.result });
  } catch (err) {
    job.error = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.completedAt = Date.now();
    await persistJob(job);
    res.status(500).json({ jobId, status: job.status, error: job.error });
  }
});

// GET /api/execute/:jobId — poll job status and result
executeRouter.get("/:jobId", async (req: Request, res: Response) => {
  const { jobId } = req.params;
  let job = jobs.get(jobId);
  if (!job) {
    try {
      job = await jobRepository.get(jobId);
    } catch {
      job = undefined;
    }
  }
  if (!job) {
    res.status(404).json({ error: `Job "${jobId}" not found.` });
    return;
  }
  res.json(job);
});

// GET /api/execute — list all jobs
executeRouter.get("/", async (_req: Request, res: Response) => {
  res.json(await listExecutionJobs());
});
