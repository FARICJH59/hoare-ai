import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";

export interface TenantRequest extends AuthenticatedRequest {
  tenant?: { orgId: string; actorId?: string };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveOrgId(req: Request): string | undefined {
  const body = req.body as { org_id?: unknown; orgId?: unknown } | undefined;
  return (
    asString(req.headers["x-org-id"]) ??
    asString(body?.org_id) ??
    asString(body?.orgId) ??
    asString(req.query.org_id) ??
    asString(req.query.orgId) ??
    asString((req as TenantRequest).auth?.subject) ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-org")
  );
}

export function requireOrgIsolation(req: TenantRequest, res: Response, next: NextFunction): void {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: "org_id is required." });
    return;
  }
  req.tenant = { orgId, actorId: req.auth?.subject };
  next();
}

export function getOrgId(req: Request): string {
  const orgId = (req as TenantRequest).tenant?.orgId ?? resolveOrgId(req);
  if (!orgId) throw new Error("org_id is required.");
  return orgId;
}
