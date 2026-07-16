import express, { Request, Response, NextFunction } from "express";
import { chatRouter } from "./chat";
import { executeRouter } from "./execute";
import { toolsRouter } from "./tools";
import { sessionRouter, sessionStore } from "./session";
import { workflowRouter, workflowHealth } from "./workflow";
import { foundationRouter } from "./foundation";
import { devopsRiskRouter, devopsRiskHealth, getLatestDevopsRiskScore } from "./devops/risk";
import { securityHeaders, auditLogger, rateLimit, requireJson, authMiddleware } from "./middleware";
import { structuredLogger, metrics } from "./observability";
import { allTools } from "../tools";
import { Agent } from "../agent/agent";
import { getOrgId, requireOrgIsolation, evaluateGovernance, getUsage, listAuditLogs, durableStorageStatus, durableStorageHealth, billingHealth, governanceHealth, meterUsage, writeAuditLog, type TenantRequest } from "./platform";

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
      platform: {
        durableStorage: durableStorageStatus(),
        devopsRisk: getLatestDevopsRiskScore().overallScore,
        workflowEngine: workflowHealth(),
        agentRuntime: "ok",
        billingEngine: billingHealth(),
        governance: governanceHealth(),
        durability: durableStorageHealth(),
        devopsRiskHealth: devopsRiskHealth(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/metrics", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    metrics.gauge("hoare_registered_tools", allTools.length);
    metrics.gauge("hoare_sessions_active", sessionStore.size);
    res.send(metrics.toPrometheusText());
  });

  // ── Auth + tenant gate — protected routes require org isolation ───────────
  app.use("/api", authMiddleware, requireOrgIsolation);
  app.use(["/agent", "/workflow", "/tools", "/foundation", "/governance", "/billing", "/audit", "/session"], authMiddleware, requireOrgIsolation);

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use("/api/chat", chatRouter);
  app.use("/api/execute", executeRouter);
  app.use("/api/tools", toolsRouter);
  app.use("/api/session", sessionRouter);
  app.use("/api/workflow", workflowRouter);
  app.use("/api/foundation", foundationRouter);
  app.use("/api/devops", devopsRiskRouter);

  app.post("/agent/run", async (req: Request, res: Response) => {
    const orgId = getOrgId(req);
    const message = String(req.body?.message ?? req.body?.prompt ?? "").trim();
    if (!message) {
      res.status(400).json({ error: "message is required." });
      return;
    }
    const agent = new Agent({ name: "external-agent", tools: allTools });
    const result = await agent.run(message);
    meterUsage(orgId, "agent_run", 1, { toolsUsed: result.toolsUsed.length });
    writeAuditLog({ orgId, actor: (req as TenantRequest).auth?.subject, action: "agent.run", resource: result.agentId, metadata: { toolsUsed: result.toolsUsed } });
    res.json(result);
  });
  app.use("/workflow", workflowRouter);
  app.use("/tools", toolsRouter);
  app.use("/foundation", foundationRouter);
  app.get("/governance/check", (req: Request, res: Response) => res.json(evaluateGovernance({ orgId: getOrgId(req), action: String(req.query.action ?? "read"), resource: String(req.query.resource ?? "platform") })));
  app.get("/billing/usage", (req: Request, res: Response) => res.json(getUsage(getOrgId(req))));
  app.get("/audit/logs", (req: Request, res: Response) => res.json({ logs: listAuditLogs(getOrgId(req)) }));
  app.get("/session/state", (req: Request, res: Response) => res.json(Array.from(sessionStore.values()).filter((session) => session.orgId === getOrgId(req))));
  app.post("/session/update", (req: Request, res: Response) => {
    const orgId = getOrgId(req);
    const id = String(req.body?.sessionId ?? req.body?.id ?? "");
    const session = sessionStore.get(id);
    if (!session || session.orgId !== orgId) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    session.metadata = { ...session.metadata, ...(req.body?.metadata ?? {}) };
    session.updatedAt = Date.now();
    writeAuditLog({ orgId, actor: (req as TenantRequest).auth?.subject, action: "session.update", resource: id, metadata: {} });
    res.json(session);
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
export { workflowRouter } from "./workflow";
export { foundationRouter } from "./foundation";
export { devopsRiskRouter } from "./devops/risk";
