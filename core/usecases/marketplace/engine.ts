import type { JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { enforceGovernance } from "../governance/engine";
import { getMarketplaceItem, listMarketplaceItems } from "./registry";
import { searchMarketplace } from "./search";
import { publishMarketplaceItem } from "./publish";
import { rateMarketplaceItem } from "./ratings";
import { compileToBuildPack } from "../../buildpacks/compiler";
import { deployBuildPack } from "../../buildpacks/deployer";
import { detectProjectComponents } from "../../buildpacks/detector";
import type { UABPArtifact, UABPManifest } from "../../buildpacks/manifest";
import { createManifest } from "../../buildpacks/manifest";

export interface MarketplacePublishResult { namespace: "usecases.marketplace.buildpacks.publish"; status: "published" | "blocked"; manifestId?: string; artifactId?: string; metadata: JsonRecord; }
export interface MarketplaceInstallResult { namespace: "usecases.marketplace.buildpacks.install"; status: "installed" | "blocked"; manifestId: string; metadata: JsonRecord; }

const buildPackMarketplace = new Map<string, { manifest: UABPManifest; artifact: UABPArtifact }>();

function validateMarketplaceItem(input: JsonRecord) {
  return Boolean(input.name ?? input.id ?? input.itemId);
}

export function publishBuildPack(manifest: UABPManifest, artifact: UABPArtifact): MarketplacePublishResult {
  const governance = enforceGovernance({ name: manifest.name, action: "publish", role: artifact.options?.role ?? "admin", approvalId: artifact.options?.approvalId });
  if (!governance.allowed) return { namespace: "usecases.marketplace.buildpacks.publish", status: "blocked", metadata: { governance } };
  buildPackMarketplace.set(artifact.id, { manifest, artifact });
  publishMarketplaceItem({ id: artifact.id, name: manifest.name, manifest, artifactId: artifact.id, checksum: artifact.checksum });
  publishEvent("marketplace.buildpack.published", { manifestId: artifact.id, checksum: artifact.checksum });
  return { namespace: "usecases.marketplace.buildpacks.publish", status: "published", manifestId: artifact.id, artifactId: artifact.id, metadata: { checksum: artifact.checksum } };
}

export function installBuildPack(manifestId: string): MarketplaceInstallResult {
  const item = buildPackMarketplace.get(manifestId);
  if (!item) return { namespace: "usecases.marketplace.buildpacks.install", status: "blocked", manifestId, metadata: { reason: "manifest-not-found" } };
  const deployed = deployBuildPack(item.manifest, item.artifact, "marketplace");
  publishEvent("marketplace.buildpack.installed", { manifestId, deployed });
  return { namespace: "usecases.marketplace.buildpacks.install", status: deployed.status === "deployed" ? "installed" : "blocked", manifestId, metadata: { deployed } };
}

export function installMarketplaceItem(input: JsonRecord) {
  const governance = enforceGovernance({ ...input, action: "install" });
  if (!validateMarketplaceItem(input) || !governance.allowed) return { namespace: "usecases.marketplace.engine", status: "blocked", governance, reason: "unapproved-or-invalid-item" };
  const detection = detectProjectComponents(String(input.rootPath ?? process.cwd()));
  const artifact = compileToBuildPack(detection, { ...input, marketplaceInstall: true });
  const deployed = deployBuildPack(artifact.manifest, artifact, "marketplace");
  publishEvent("marketplace.item.installed", { ...input, buildPackId: artifact.id });
  return { namespace: "usecases.marketplace.engine", status: "installed", buildPack: { manifest: artifact.manifest, artifactId: artifact.id, deployed }, ...input };
}

export function publishItem(input: JsonRecord) {
  const governance = enforceGovernance({ ...input, action: "publish" });
  if (!validateMarketplaceItem(input) || !governance.allowed) return { namespace: "usecases.marketplace.engine", status: "blocked", governance, reason: "unapproved-or-invalid-item" };
  const detection = input.detectionResult ? input.detectionResult as never : detectProjectComponents(String(input.rootPath ?? process.cwd()));
  const manifest = createManifest(detection);
  const artifact = compileToBuildPack(detection, { ...input, marketplacePublish: true });
  const item = publishMarketplaceItem({ ...input, manifest, artifactId: artifact.id, checksum: artifact.checksum });
  publishEvent("marketplace.item.published", { item });
  return item;
}

export function rateItem(input: JsonRecord) { const rating = rateMarketplaceItem(input); publishEvent("marketplace.item.rated", rating); return rating; }
export { getMarketplaceItem, listMarketplaceItems, searchMarketplace };
