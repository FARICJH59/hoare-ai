import { Request, Response, NextFunction } from "express";
import { structuredLogger } from "../observability/logger";
import { persistRecord, resolveOrgId } from "../platform";

export interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
}

/**
 * Audit logger middleware. Logs every completed request as a structured entry.
 * In production, wire this to a persistent store (e.g., a database audit table).
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const ip = req.ip ?? "unknown";
  const userAgent = req.headers["user-agent"] ?? "";

  res.on("finish", () => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip,
      userAgent,
    };
    structuredLogger.info("audit", entry);
    persistRecord("audit_logs", {
      org_id: resolveOrgId(req) ?? "anonymous",
      action: "http.request",
      resource_type: req.path,
      decision: String(res.statusCode),
      metadata: entry,
      created_at: entry.timestamp,
    });
  });

  next();
}
