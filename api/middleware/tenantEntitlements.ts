import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth";

/**
 * Minimal entitlement boundary for the public execution plane.
 *
 * Production implementations should replace the environment-backed map with
 * the canonical HOARE.ai subscription/tenant store. The important invariant is
 * that callers never choose their own entitlement set.
 */
export function requireTenantEntitlement(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.auth?.type === "service") {
    next();
    return;
  }

  const subject = req.auth?.subject;
  if (!subject) {
    res.status(403).json({ error: "Tenant identity is required.", code: "TENANT_REQUIRED" });
    return;
  }

  const configured = process.env.TENANT_ENTITLEMENTS_JSON;
  if (!configured) {
    res.status(403).json({ error: "Tenant entitlement is not configured.", code: "ENTITLEMENT_NOT_CONFIGURED" });
    return;
  }

  try {
    const entitlements = JSON.parse(configured) as Record<string, string[]>;
    const capabilities = entitlements[subject];
    const toolName = typeof req.body?.toolName === "string" ? req.body.toolName : "";
    if (!capabilities?.includes(toolName)) {
      res.status(403).json({ error: "Capability is not entitled for this tenant.", code: "CAPABILITY_NOT_ENTITLED" });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: "Tenant entitlement configuration is invalid.", code: "ENTITLEMENT_CONFIG_INVALID" });
  }
}
