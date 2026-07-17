export const enterpriseHardening = {
  defaultTenantId: "tenant.default",
  channels: ["dev", "beta", "stable", "edge", "sovereign"] as const,
  productionChannels: ["stable", "sovereign"] as const,
  sovereignRequiredMetadata: ["region", "dataLocality", "approvalId"],
  edgeDeviceReducedMode: true,
} as const;
