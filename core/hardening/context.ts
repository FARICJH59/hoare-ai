import { createId, type ExecutionRequest } from "../types";
import { enterpriseHardening } from "../config/hardening/enterprise";
import { securityHardening, type EnterpriseRole } from "../config/hardening/security";

export interface HardenedContext {
  correlationId: string;
  tenantId: string;
  role: EnterpriseRole;
  environment: string;
  channel: string;
  version: string;
}

export function getHardenedContext(request: ExecutionRequest = {}): HardenedContext {
  const metadata = request.metadata ?? {};
  return {
    correlationId: String(metadata.correlationId ?? request.id ?? createId("corr")),
    tenantId: String(metadata.tenantId ?? enterpriseHardening.defaultTenantId),
    role: (metadata.role as EnterpriseRole) ?? securityHardening.defaultRole,
    environment: String(metadata.environment ?? "development"),
    channel: String(metadata.channel ?? "dev"),
    version: String(metadata.version ?? "0.0.0"),
  };
}
