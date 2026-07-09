import { Router, Request, Response } from "express";
import { allTools } from "../tools";

export const toolsRouter = Router();

// GET /api/tools — list all registered tools
toolsRouter.get("/", (_req: Request, res: Response) => {
  const toolList = allTools.map((t) => ({
    name: t.name,
    description: t.description,
  }));
  res.json({ count: toolList.length, tools: toolList });
});

// GET /api/tools/:name — get details of a specific tool
toolsRouter.get("/:name", (req: Request, res: Response) => {
  const { name } = req.params;
  const tool = allTools.find((t) => t.name === name);
  if (!tool) {
    res.status(404).json({ error: `Tool "${name}" not found.` });
    return;
  }
  res.json({ name: tool.name, description: tool.description });
});

// POST /api/tools/:name/invoke — invoke a tool directly
toolsRouter.post("/:name/invoke", async (req: Request, res: Response) => {
  const { name } = req.params;
  const tool = allTools.find((t) => t.name === name);
  if (!tool) {
    res.status(404).json({ error: `Tool "${name}" not found.` });
    return;
  }

  const params = (req.body?.params as Record<string, unknown> | undefined) ?? {};

  try {
    const result = await tool.execute(params);
    res.json({ tool: name, result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ tool: name, error: msg });
  }
});
