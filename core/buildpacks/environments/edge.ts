import type { EnvironmentConfig } from "./index";
export function getEnvironmentConfig(): EnvironmentConfig { return { namespace: "buildpacks.environments.edge", environment: "edge", verboseLogging: false, strictSafety: true, requiresApproval: false, dataLocality: "device", holographicMode: "reduced", releaseChannel: "edge" }; }
