import type { EnterpriseRole } from "../config/hardening/security";
import { roleHierarchy, securityHardening } from "../config/hardening/security";

export function assertRole(role: EnterpriseRole, required: EnterpriseRole) {
  return roleHierarchy[role] >= roleHierarchy[required];
}

export function requiredRoleForNamespace(namespace: string): EnterpriseRole {
  if (namespace.includes("deployment")) return securityHardening.routePermissions.deployment;
  if (namespace.includes("governance")) return securityHardening.routePermissions.governance;
  if (namespace.includes("marketplace")) return securityHardening.routePermissions.marketplace;
  if (namespace.includes("versioning")) return securityHardening.routePermissions.versioning;
  if (namespace.includes("tools")) return securityHardening.routePermissions.tools;
  if (namespace.includes("workflows")) return securityHardening.routePermissions.workflows;
  if (namespace.includes("agents")) return securityHardening.routePermissions.agents;
  return securityHardening.routePermissions.usecases;
}
