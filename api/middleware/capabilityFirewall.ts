import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth";

/**
 * Public capability firewall.
 *
 * The complete tool registry belongs to HOARE.ai's control brain and must not
 * become an implicit public API. Public execution is therefore deny-by-default
 * and requires an explicit PUBLIC_CAPABILITIES allow-list.
 *
 * HOARE_INTERNAL_SERVICE_KEY is intentionally separate from API_KEYS. It is
 * reserved for trusted HOARE.ai -> HOARE Agent calls and must never be exposed
 * to customers or browser clients.
 */
function configuredCapabilities(): Set<string> {
  return new Set(
    (process.env.PUBLIC_CAPABILITIES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function isInternalService(req: AuthenticatedRequest): boolean {
  return req.auth?.type === "service";
}

export function requireCapabilityAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const toolName = typeof req.body?.toolName === "string" ? req.body.toolName : "";

  if (!toolName) {
    res.status(400).json({ error: "toolName is required." });
    return;
  }

  if (isInternalService(req)) {
    next();
    return;
  }

  const allowed = configuredCapabilities();
  if (!allowed.has(toolName)) {
    res.status(403).json({
      error: "Capability is not enabled for this public service boundary.",
      code: "CAPABILITY_NOT_ENTITLED",
    });
    return;
  }

  next();
}

/** Return only public capabilities; never expose the internal registry. */
export function publicCapabilityList(allNames: string[]): string[] {
  const allowed = configuredCapabilities();
  return allNames.filter((name) => allowed.has(name));
}
