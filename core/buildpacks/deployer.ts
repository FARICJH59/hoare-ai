import type { JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import type { BuildPackArtifact, BuildPackManifest } from "./manifest";
import { validateManifest } from "./manifest";
import { getEnvironmentConfig, type BuildPackEnvironment } from "./environments";

export interface DeploymentResult {
  namespace: "buildpacks.deployer";
  status: "deployed" | "blocked";
  environment: BuildPackEnvironment;
  manifestName: string;
  artifactId: string;
  metadata: JsonRecord;
}

export function deployBuildPack(manifest: BuildPackManifest, artifact: BuildPackArtifact, environment: BuildPackEnvironment): DeploymentResult {
  const env = getEnvironmentConfig(environment);
  if (!validateManifest(manifest)) return { namespace: "buildpacks.deployer", status: "blocked", environment, manifestName: manifest.name, artifactId: artifact.id, metadata: { reason: "invalid-manifest", env } };
  if (env.requiresApproval && !artifact.options?.approvalId) return { namespace: "buildpacks.deployer", status: "blocked", environment, manifestName: manifest.name, artifactId: artifact.id, metadata: { reason: "approval-required", env } };
  const result = { namespace: "buildpacks.deployer" as const, status: "deployed" as const, environment, manifestName: manifest.name, artifactId: artifact.id, metadata: { env, checksum: artifact.checksum } };
  publishEvent("buildpack.deployed", result.metadata);
  return result;
}
