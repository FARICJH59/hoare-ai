import { Router, Request, Response } from "express";
import { foundationTools } from "../../tools";
import { getOrgId, invokeGovernedTool, type TenantRequest } from "../platform";

export const foundationRouter = Router();

foundationRouter.post("/generate", async (req: Request, res: Response) => {
  const task = String(req.body?.task ?? "generateText");
  const toolName = task.startsWith("foundation.") ? task : `foundation.${task}`;
  const tool = foundationTools.find((candidate) => candidate.name === toolName) ?? foundationTools[0];

  try {
    const result = await invokeGovernedTool({
      orgId: getOrgId(req),
      actorId: (req as TenantRequest).tenant?.actorId,
      tool,
      params: (req.body?.params as Record<string, unknown> | undefined) ?? req.body ?? {},
      source: "foundation",
      meter: "foundation_model_call",
    });
    res.json({ tool: tool.name, result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
