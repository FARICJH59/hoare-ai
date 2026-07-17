import type { JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import type { BuildPackArtifact, BuildPackManifest } from "./manifest";
import { validateManifest } from "./manifest";
import { getEnvironmentConfig, type BuildPackEnvironment, type EnvironmentConfig } from "./environments";

export interface DeploymentResult {
  namespace: "buildpacks.deployer";
  status: "deployed" | "blocked";
  environment: BuildPackEnvironment;
  manifestName: string;
  artifactId: string;
  metadata: JsonRecord;
}

function normalizeEnvironment(environment: BuildPackEnvironment | EnvironmentConfig): EnvironmentConfig {
  return typeof environment === "string" ? getEnvironmentConfig(environment) : environment;
}

export function deployBuildPack(manifest: BuildPackManifest, artifact: BuildPackArtifact, environment: BuildPackEnvironment | EnvironmentConfig): DeploymentResult {
  const env = normalizeEnvironment(environment);
  if (!validateManifest(manifest)) return { namespace: "buildpacks.deployer", status: "blocked", environment: env.environment, manifestName: manifest.name, artifactId: artifact.id, metadata: { reason: "invalid-manifest", env } };
  if (env.requiresApproval && !artifact.options?.approvalId) return { namespace: "buildpacks.deployer", status: "blocked", environment: env.environment, manifestName: manifest.name, artifactId: artifact.id, metadata: { reason: "approval-required", env } };
  const result = { namespace: "buildpacks.deployer" as const, status: "deployed" as const, environment: env.environment, manifestName: manifest.name, artifactId: artifact.id, metadata: { env, checksum: artifact.checksum, releaseChannel: env.releaseChannel } };
  publishEvent("buildpack.deployed", result.metadata);
  return result;
}
