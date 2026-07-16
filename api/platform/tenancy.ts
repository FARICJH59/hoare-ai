import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";

export interface TenantContext {
  orgId: string;
  subject?: string;
}

export interface TenantRequest extends AuthenticatedRequest {
  tenant?: TenantContext;
}

function valueAsString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveOrgId(req: Request): string | undefined {
  const headerOrg = valueAsString(req.headers["x-org-id"]);
  const queryOrg = valueAsString(req.query.org_id) ?? valueAsString(req.query.orgId);
  const body = req.body as { org_id?: unknown; orgId?: unknown } | undefined;
  const bodyOrg = valueAsString(body?.org_id) ?? valueAsString(body?.orgId);
  const authSubject = valueAsString((req as TenantRequest).auth?.subject);
  return headerOrg ?? bodyOrg ?? queryOrg ?? authSubject ?? (process.env.NODE_ENV === "production" ? undefined : "dev-org");
}

export function requireOrgIsolation(req: TenantRequest, res: Response, next: NextFunction): void {
  const orgId = resolveOrgId(req);
  if (!orgId) {
    res.status(400).json({ error: "org_id is required for tenant isolation." });
    return;
  }
  req.tenant = { orgId, subject: req.auth?.subject };
  next();
}

export function getOrgId(req: Request): string {
  const orgId = (req as TenantRequest).tenant?.orgId ?? resolveOrgId(req);
  if (!orgId) throw new Error("org_id is required for tenant isolation.");
  return orgId;
}
