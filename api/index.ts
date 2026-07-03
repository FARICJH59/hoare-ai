import express, { Request, Response, NextFunction } from "express";
import { chatRouter } from "./chat";
import { executeRouter } from "./execute";
import { toolsRouter } from "./tools";
import { sessionRouter } from "./session";

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Mount routers
  app.use("/api/chat", chatRouter);
  app.use("/api/execute", executeRouter);
  app.use("/api/tools", toolsRouter);
  app.use("/api/session", sessionRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found." });
  });

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`hoare-ai API server listening on port ${PORT}`);
  });
}

export { chatRouter } from "./chat";
export { executeRouter } from "./execute";
export { toolsRouter } from "./tools";
export { sessionRouter } from "./session";
