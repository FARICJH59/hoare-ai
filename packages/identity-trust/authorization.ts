import type { HoareIdentity } from "./types";
import { getPermissionsForRole, hasPermission } from "../security";
import type { Permission, Role } from "../shared-types";

export interface AuthorizationRequest {
  identity: HoareIdentity;
  requiredPermission: Permission;
  tenantId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  permissions: Permission[];
}

/**
 * Tenant-aware authorization boundary. Existing HOARE RBAC remains the
 * source of role->permission mappings; this layer does not issue credentials.
 */
export function authorize(request: AuthorizationRequest): AuthorizationDecision {
  const { identity, requiredPermission, tenantId } = request;

  if (!identity.subject) {
    return { allowed: false, reason: "Missing identity subject", permissions: [] };
  }

  if (tenantId && identity.tenantId !== tenantId) {
    return {
      allowed: false,
      reason: "Identity is outside the requested tenant boundary",
      permissions: [],
    };
  }

  const roles = identity.roles.filter(isRole);
  const permissions = [...new Set(roles.flatMap(getPermissionsForRole))];

  if (!hasPermission(roles, requiredPermission)) {
    return {
      allowed: false,
      reason: `Required permission denied: ${requiredPermission}`,
      permissions,
    };
  }

  return { allowed: true, reason: "Permission granted", permissions };
}

function isRole(value: string): value is Role {
  return value === "viewer" || value === "operator" || value === "admin" || value === "service";
}
