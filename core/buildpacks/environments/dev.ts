import type { EnvironmentConfig } from "./index";
export function getEnvironmentConfig(): EnvironmentConfig { return { namespace: "buildpacks.environments.dev", environment: "dev", verboseLogging: true, strictSafety: false, requiresApproval: false, dataLocality: "global", holographicMode: "full", releaseChannel: "dev" }; }
