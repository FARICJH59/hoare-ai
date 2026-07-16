import { Router, Request, Response } from "express";
import { foundationTools } from "../../tools/foundation";
import { getOrgId, invokeGovernedTool, type TenantRequest } from "../platform";

export const foundationRouter = Router();

foundationRouter.post("/generate", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const actor = (req as TenantRequest).auth?.subject;
  const task = String(req.body?.task ?? "generateText");
  const toolName = task.startsWith("foundation.") ? task : `foundation.${task}`;
  const tool = foundationTools.find((candidate) => candidate.name === toolName) ?? foundationTools[0];
  try {
    const result = await invokeGovernedTool({ orgId, actor, tool, params: req.body?.params ?? req.body ?? {}, meter: "foundation_model_call" });
    res.json({ tool: tool.name, result });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
