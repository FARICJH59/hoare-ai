import type { EnvironmentConfig } from "./index";
export function getEnvironmentConfig(): EnvironmentConfig { return { namespace: "buildpacks.environments.sovereign", environment: "sovereign", verboseLogging: false, strictSafety: true, requiresApproval: true, dataLocality: "sovereign", holographicMode: "reduced", releaseChannel: "sovereign" }; }
