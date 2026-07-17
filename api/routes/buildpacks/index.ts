import { Router } from "express";
import { compileToBuildPack } from "../../../core/buildpacks/compiler";
import { deployBuildPack } from "../../../core/buildpacks/deployer";
import { detectProjectComponents } from "../../../core/buildpacks/detector";
import { getEnvironmentConfig } from "../../../core/buildpacks/environments";
import { createManifest } from "../../../core/buildpacks/manifest";
import { body, ok } from "../respond";

export const buildpacksPhaseRouter = Router();
const rootPath = process.cwd();

buildpacksPhaseRouter.get("/buildpacks/detect", (_req, res) => ok(res, detectProjectComponents(rootPath)));
buildpacksPhaseRouter.get("/buildpacks/manifest", (_req, res) => ok(res, createManifest(detectProjectComponents(rootPath))));
buildpacksPhaseRouter.post("/buildpacks/compile", (req, res) => {
  const detection = detectProjectComponents(rootPath);
  ok(res, compileToBuildPack(detection, body(req).options as Record<string, unknown> | undefined));
});
buildpacksPhaseRouter.post("/buildpacks/deploy", (req, res) => {
  const requestBody = body(req);
  const detection = detectProjectComponents(rootPath);
  const artifact = compileToBuildPack(detection, requestBody.options as Record<string, unknown> | undefined);
  const environment = String(requestBody.environment ?? "dev") as never;
  ok(res, { environment: getEnvironmentConfig(environment), deployment: deployBuildPack(artifact.manifest, artifact, environment), artifact: { id: artifact.id, checksum: artifact.checksum } });
});
