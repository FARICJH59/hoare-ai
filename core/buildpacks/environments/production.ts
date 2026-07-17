import type { EnvironmentConfig } from "./index";
export function getEnvironmentConfig(): EnvironmentConfig { return { namespace: "buildpacks.environments.production", environment: "production", verboseLogging: false, strictSafety: true, requiresApproval: true, dataLocality: "regional", holographicMode: "balanced", releaseChannel: "stable" }; }
