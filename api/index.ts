import express, { Request, Response, NextFunction } from "express";
import { chatRouter } from "./chat";
import { executeRouter, listExecutionJobs } from "./execute";
import { toolsRouter } from "./tools";
import { sessionRouter, sessionStore } from "./session";
import { securityHeaders, auditLogger, rateLimit, requireJson, authMiddleware } from "./middleware";
import { structuredLogger, metrics } from "./observability";
import { allTools } from "../tools";
import { getPersistenceStatus } from "./storage/database";
import { agentRepository, workflowRepository } from "./storage/repositories";

const START_TIME = Date.now();
const VERSION = process.env.npm_package_version ?? "1.0.0";

async function buildGovernanceStatus() {
  const persistence = await getPersistenceStatus();
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
  const authConfigured = process.env.NODE_ENV !== "production" || Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
  const apiKeysConfigured = Boolean(process.env.API_KEYS?.split(",").filter(Boolean).length);

  return {
    persistence,
    auth: {
      configured: authConfigured,
      apiKeysConfigured,
    },
    billing: {
      stripeConfigured,
      webhooksConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
    audit: {
      enabled: true,
      durable: persistence.reachable,
    },
  };
}

function defaultAgents() {
  const groups = new Map<string, string[]>();
  for (const tool of allTools) {
    const [domain] = tool.name.split("-");
    const key = domain || "general";
    groups.set(key, [...(groups.get(key) ?? []), tool.name]);
  }
  return Array.from(groups.entries()).map(([domain, capabilities]) => ({
    id: `${domain}-agent`,
    name: `${domain[0]?.toUpperCase() ?? "G"}${domain.slice(1)} Agent`,
    description: `Default ${domain} capability agent backed by registered tools.`,
    status: "idle",
    capabilities,
    metadata: { source: "runtime-default" },
    createdAt: START_TIME,
    updatedAt: Date.now(),
  }));
}

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
  app.get("/health", async (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
    const governance = await buildGovernanceStatus();
    res.json({
      status: governance.persistence.configured && !governance.persistence.reachable ? "degraded" : "ok",
      version: VERSION,
      agents: {
        registered: defaultAgents().length,
        active: sessionStore.size,
      },
      uptime: uptimeSeconds,
      dependencies: {
        database: governance.persistence.reachable ? "configured" : "not-configured",
        redis: process.env.REDIS_URL ? "configured" : "not-configured",
        qgps: process.env.QGPS_BASE_URL ? "configured" : "not-configured",
        stripe: governance.billing.stripeConfigured ? "configured" : "not-configured",
      },
      governance,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/metrics", async (_req: Request, res: Response) => {
    const governance = await buildGovernanceStatus();
    metrics.gauge("hoare_governance_persistence_configured", governance.persistence.configured ? 1 : 0);
    metrics.gauge("hoare_governance_persistence_reachable", governance.persistence.reachable ? 1 : 0);
    metrics.gauge("hoare_governance_billing_configured", governance.billing.stripeConfigured ? 1 : 0);
    metrics.gauge("hoare_governance_audit_durable", governance.audit.durable ? 1 : 0);
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

  app.get("/api/agents", async (_req: Request, res: Response) => {
    const persistedAgents = await agentRepository.list().catch(() => []);
    const runtimeAgents = defaultAgents();
    res.json({
      count: persistedAgents.length + runtimeAgents.length,
      agents: [...persistedAgents, ...runtimeAgents],
    });
  });

  app.get("/api/workflows", async (_req: Request, res: Response) => {
    const persistedWorkflows = await workflowRepository.list().catch(() => []);
    const recentJobs = await listExecutionJobs();
    res.json({
      count: persistedWorkflows.length,
      workflows: persistedWorkflows,
      recentJobs,
    });
  });

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
