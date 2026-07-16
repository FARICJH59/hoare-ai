import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { allTools } from "../tools";
import { getOrgId, invokeGovernedTool, type TenantRequest } from "./platform";

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

export const executeRouter = Router();

// POST /api/execute — submit a tool execution job
executeRouter.post("/", async (req: Request, res: Response) => {
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

  const orgId = getOrgId(req);
  const actor = (req as TenantRequest).auth?.subject;
  const jobId = uuidv4();
  const job: ExecutionJob = {
    id: jobId,
    toolName,
    params: params ?? {},
    status: "pending",
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  if (runAsync) {
    // Fire-and-forget
    setImmediate(async () => {
      job.status = "running";
      try {
        job.result = await invokeGovernedTool({ orgId, actor, tool, params: job.params });
        job.status = "completed";
      } catch (err) {
        job.error = err instanceof Error ? err.message : String(err);
        job.status = "failed";
      } finally {
        job.completedAt = Date.now();
      }
    });
    res.status(202).json({ jobId, status: "pending" });
    return;
  }

  // Synchronous execution
  job.status = "running";
  try {
    job.result = await invokeGovernedTool({ orgId, actor, tool, params: job.params });
    job.status = "completed";
    job.completedAt = Date.now();
    res.json({ jobId, status: job.status, result: job.result });
  } catch (err) {
    job.error = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.completedAt = Date.now();
    res.status(500).json({ jobId, status: job.status, error: job.error });
  }
});

// GET /api/execute/:jobId — poll job status and result
executeRouter.get("/:jobId", (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: `Job "${jobId}" not found.` });
    return;
  }
  res.json(job);
});

// GET /api/execute — list all jobs
executeRouter.get("/", (_req: Request, res: Response) => {
  res.json(Array.from(jobs.values()));
});
