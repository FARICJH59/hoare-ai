import { getEnvironmentConfig as getDevEnvironmentConfig } from "./dev";
import { getEnvironmentConfig as getEdgeEnvironmentConfig } from "./edge";
import { getEnvironmentConfig as getProductionEnvironmentConfig } from "./production";
import { getEnvironmentConfig as getSovereignEnvironmentConfig } from "./sovereign";
import { getEnvironmentConfig as getStagingEnvironmentConfig } from "./staging";

export type BuildPackEnvironment = "dev" | "staging" | "production" | "sovereign" | "edge" | "marketplace";

export interface EnvironmentConfig {
  namespace: string;
  environment: BuildPackEnvironment;
  verboseLogging: boolean;
  strictSafety: boolean;
  requiresApproval: boolean;
  dataLocality: "global" | "regional" | "sovereign" | "device";
  holographicMode: "full" | "balanced" | "reduced";
  releaseChannel: "dev" | "beta" | "stable" | "sovereign" | "edge";
}

export function getEnvironmentConfig(environment: BuildPackEnvironment): EnvironmentConfig {
  switch (environment) {
    case "staging": return getStagingEnvironmentConfig();
    case "production": return getProductionEnvironmentConfig();
    case "sovereign": return getSovereignEnvironmentConfig();
    case "edge": return getEdgeEnvironmentConfig();
    case "marketplace": return { ...getProductionEnvironmentConfig(), environment: "marketplace", namespace: "buildpacks.environments.marketplace", requiresApproval: true };
    default: return getDevEnvironmentConfig();
  }
}
