import { createId, type JsonRecord } from "../types";
import { bundleAgents } from "./bundlers/agentBundler";
import { bundleWorkflows } from "./bundlers/workflowBundler";
import { bundleTools } from "./bundlers/toolBundler";
import { bundleUsecases } from "./bundlers/usecaseBundler";
import { bundleTemplates } from "./bundlers/templateBundler";
import { bundlePacks } from "./bundlers/packBundler";
import { bundleGovernance } from "./bundlers/governanceBundler";
import { bundleVersioning } from "./bundlers/versioningBundler";
import { bundleAnalytics } from "./bundlers/analyticsBundler";
import { bundleMarketplace } from "./bundlers/marketplaceBundler";
import { bundleHolographicUI } from "./bundlers/holographicUIBundler";
import { bundleQuantumShaders } from "./bundlers/quantumShaderBundler";
import { createManifest, type BuildPackArtifact, type BuildPackDetectionResult, type BundleSection } from "./manifest";

function checksum(value: unknown) { return Buffer.from(JSON.stringify(value)).toString("base64url").slice(0, 32); }

export function compileToBuildPack(detectionResult: BuildPackDetectionResult, options: JsonRecord = {}): BuildPackArtifact {
  const manifest = createManifest(detectionResult);
  const c = detectionResult.components;
  const sections: BundleSection[] = [
    bundleAgents(options, c.agents ?? []), bundleWorkflows(options, c.workflows ?? []), bundleTools(options, c.tools ?? []),
    bundleUsecases(options, c.usecases ?? []), bundleTemplates(options, c.templates ?? []), bundlePacks(options, c.packs ?? []),
    bundleGovernance(options, c.governance ?? []), bundleVersioning(options, c.versioning ?? []), bundleAnalytics(options, c.analytics ?? []),
    bundleMarketplace(options, c.marketplace ?? []), bundleHolographicUI(options, c.holographicUI ?? []), bundleQuantumShaders(options, c.quantumShaders ?? []),
  ];
  return { namespace: "buildpacks.compiler", id: createId("uabp"), manifest, sections, checksum: checksum({ manifest, sections }), createdAt: new Date().toISOString(), options };
}
