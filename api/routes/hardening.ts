import type { NextFunction, Request, Response } from "express";
import { incrementMetric } from "../../core/observability/metrics";
import { getCached } from "../../core/hardening/cache";
import { assertRole, requiredRoleForNamespace } from "../../core/hardening/rbac";
import { securityHardening, type EnterpriseRole } from "../../core/config/hardening/security";

function namespaceForPath(path: string) {
  const segment = path.split("/").filter(Boolean)[0] ?? "usecases";
  if (path.includes("deployment")) return "usecases.deployment";
  if (path.includes("governance")) return "usecases.governance";
  if (path.includes("marketplace")) return "usecases.marketplace";
  if (path.includes("versioning")) return "usecases.versioning";
  return segment;
}

export function phaseRouteHardening(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const namespace = namespaceForPath(req.path);
  const explicitRole = req.header("x-hoare-role") as EnterpriseRole | undefined;
  const role = explicitRole ?? securityHardening.defaultRole;
  const required = requiredRoleForNamespace(namespace);

  if ((process.env.NODE_ENV === "production" || explicitRole) && !assertRole(role, required)) {
    res.status(403).json({ error: "Forbidden", namespace, requiredRole: required });
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = (payload: unknown) => {
    incrementMetric(`api.${namespace}.responses`);
    incrementMetric("api.latency.ms", Date.now() - startedAt);
    return originalJson(payload);
  };
  next();
}

export function cacheReadResponse<T>(key: string, producer: () => T): T {
  return getCached(key, producer);
}
