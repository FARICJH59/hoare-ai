import { Router } from "express";
import { compileToBuildPack } from "../../../core/buildpacks/compiler";
import { deployBuildPack } from "../../../core/buildpacks/deployer";
import { detectProjectComponents } from "../../../core/buildpacks/detector";
import { getEnvironmentConfig, type BuildPackEnvironment } from "../../../core/buildpacks/environments";
import { createManifest, parseManifest, serializeManifest, type BuildPackArtifact, type BuildPackManifest } from "../../../core/buildpacks/manifest";
import { body, ok } from "../respond";

export const buildpacksPhaseRouter = Router();
const rootPath = process.cwd();
const artifacts = new Map<string, BuildPackArtifact>();
const manifests = new Map<string, BuildPackManifest>();

function compileCurrent(environment: BuildPackEnvironment, options: Record<string, unknown> = {}) {
  const detection = detectProjectComponents(rootPath);
  const artifact = compileToBuildPack(detection, { ...options, environment });
  artifacts.set(artifact.id, artifact);
  manifests.set(artifact.id, artifact.manifest);
  return artifact;
}

buildpacksPhaseRouter.get("/buildpacks/detect", (_req, res) => ok(res, detectProjectComponents(rootPath)));
buildpacksPhaseRouter.get("/buildpacks/manifest", (req, res) => {
  const manifestId = String(req.query.manifestId ?? "");
  const manifest = manifestId && manifests.has(manifestId) ? manifests.get(manifestId)! : createManifest(detectProjectComponents(rootPath));
  ok(res, { manifest, serialized: serializeManifest(manifest) });
});
buildpacksPhaseRouter.post("/buildpacks/compile", (req, res) => {
  const requestBody = body(req);
  const environment = String(requestBody.environment ?? "dev") as BuildPackEnvironment;
  const artifact = compileCurrent(environment, requestBody.options as Record<string, unknown> | undefined);
  ok(res, { manifest: artifact.manifest, artifact: { id: artifact.id, checksum: artifact.checksum, sections: artifact.sections.map((section) => section.name) } });
});
buildpacksPhaseRouter.post("/buildpacks/deploy", (req, res) => {
  const requestBody = body(req);
  const environment = getEnvironmentConfig(String(requestBody.environment ?? "dev") as BuildPackEnvironment);
  const manifestId = String(requestBody.manifestId ?? "");
  const parsedManifest = requestBody.manifest ? parseManifest(requestBody.manifest as never) : undefined;
  const artifact = manifestId && artifacts.has(manifestId) ? artifacts.get(manifestId)! : compileCurrent(environment.environment, requestBody.options as Record<string, unknown> | undefined);
  const manifest = parsedManifest ?? manifests.get(manifestId) ?? artifact.manifest;
  manifests.set(artifact.id, manifest);
  ok(res, { environment, deployment: deployBuildPack(manifest, artifact, environment), artifact: { id: artifact.id, checksum: artifact.checksum } });
});
