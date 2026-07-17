export type EnterpriseRole = "admin" | "operator" | "viewer" | "auditor";

export const roleHierarchy: Record<EnterpriseRole, number> = {
  viewer: 1,
  auditor: 2,
  operator: 3,
  admin: 4,
};

export const securityHardening = {
  defaultRole: "operator" as EnterpriseRole,
  restrictedEnvironments: ["production", "sovereignRegion"],
  restrictedActions: ["deploy", "rollback", "publish", "install", "promote"],
  routePermissions: {
    agents: "operator",
    workflows: "operator",
    tools: "operator",
    usecases: "operator",
    deployment: "admin",
    governance: "auditor",
    marketplace: "operator",
    versioning: "operator",
  } satisfies Record<string, EnterpriseRole>,
} as const;
