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
import { createManifest } from "../../buildpacks/manifest";

function validateMarketplaceItem(input: JsonRecord) {
  return Boolean(input.name ?? input.id ?? input.itemId);
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
