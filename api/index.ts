import express, { Request, Response, NextFunction } from "express";
import { chatRouter } from "./chat";
import { executeRouter } from "./execute";
import { toolsRouter } from "./tools";
import { sessionRouter } from "./session";
import { securityHeaders, auditLogger, rateLimit, requireJson, authMiddleware } from "./middleware";
import { structuredLogger, metrics } from "./observability";
import { allTools } from "../tools";
import { registerPhaseRoutes } from "./phaseRoutes";

const START_TIME = Date.now();
const VERSION = process.env.npm_package_version ?? "1.0.0";

export function createApp(): express.Application {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────────────
  app.use(securityHeaders);
  app.use(auditLogger);
  app.use(rateLimit({ max: 200, windowMs: 60_000 }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requireJson);

  // Instrument every request
  app.use((req: Request, _res: Response, next: NextFunction) => {
    metrics.increment("http_requests_total", { method: req.method, path: req.path });
    next();
  });

  // ── Health & Metrics endpoints ────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    res.json({
      status: "ok",
      version: VERSION,
      agents: {
        registered: 0, // extend with AgentRegistry count when wired
        active: 0,
      },
      uptime: uptimeSeconds,
      dependencies: {
        database: process.env.DATABASE_URL ? "configured" : "not-configured",
        redis: process.env.REDIS_URL ? "configured" : "not-configured",
        qgps: process.env.QGPS_BASE_URL ? "configured" : "not-configured",
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/metrics", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(metrics.toPrometheusText());
  });

  // ── Auth gate — all /api/* routes require authentication in production ────
  app.use("/api", authMiddleware);

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use("/api/chat", chatRouter);
  app.use("/api/execute", executeRouter);
  app.use("/api/tools", toolsRouter);
  app.use("/api/session", sessionRouter);

  // Phase 0-22 standalone/interoperable scaffold routes
  registerPhaseRoutes(app);

  // Capability discovery
  app.get("/api/capabilities", (_req: Request, res: Response) => {
    res.json({
      count: allTools.length,
      capabilities: allTools.map((t) => ({ id: t.name, name: t.name, description: t.description })),
    });
  });

  // ── Error handlers ─────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found." });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error";
    structuredLogger.error("unhandled_error", { message });
    res.status(500).json({ error: message });
  });

  return app;
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    structuredLogger.info("server_started", { port: PORT, env: process.env.NODE_ENV });
  });
}

export { chatRouter } from "./chat";
export { executeRouter } from "./execute";
export { toolsRouter } from "./tools";
export { sessionRouter } from "./session";
