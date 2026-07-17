import type { JsonRecord } from "../types";

export interface BundleSection {
  namespace: string;
  name: string;
  files: string[];
  metadata: JsonRecord;
}

export interface BuildPackDetectionResult {
  namespace: "buildpacks.detector";
  rootPath: string;
  components: Record<string, string[]>;
  detectedAt: string;
}

export type UABPDetectionResult = BuildPackDetectionResult;

export interface BuildPackManifest {
  schemaVersion: "uabp.v1";
  namespace: "buildpacks.manifest";
  name: string;
  generatedAt: string;
  agents: BundleSection;
  workflows: BundleSection;
  tools: BundleSection;
  safety: BundleSection;
  risk: BundleSection;
  observability: BundleSection;
  events: BundleSection;
  messaging: BundleSection;
  scheduling: BundleSection;
  persistence: BundleSection;
  federation: BundleSection;
  usecases: BundleSection;
  templates: BundleSection;
  packs: BundleSection;
  deployment: BundleSection;
  governance: BundleSection;
  versioning: BundleSection;
  analytics: BundleSection;
  marketplace: BundleSection;
  holographicUI: BundleSection;
  quantumShaders: BundleSection;
}

export type UABPManifest = BuildPackManifest;

export interface BuildPackArtifact {
  namespace: "buildpacks.compiler";
  id: string;
  manifest: BuildPackManifest;
  sections: BundleSection[];
  checksum: string;
  createdAt: string;
  options?: JsonRecord;
}

export type UABPArtifact = BuildPackArtifact;

export function section(name: string, files: string[], metadata: JsonRecord = {}): BundleSection {
  return { namespace: `buildpacks.bundle.${name}`, name, files, metadata };
}

export function createManifest(detectionResult: UABPDetectionResult): UABPManifest {
  const c = detectionResult.components;
  return {
    schemaVersion: "uabp.v1",
    namespace: "buildpacks.manifest",
    name: "HOARE.ai + Tech Fusion Grid UI UABP",
    generatedAt: new Date().toISOString(),
    agents: section("agents", c.agents ?? []),
    workflows: section("workflows", c.workflows ?? []),
    tools: section("tools", c.tools ?? []),
    safety: section("safety", c.safety ?? []),
    risk: section("risk", c.risk ?? []),
    observability: section("observability", c.observability ?? []),
    events: section("events", c.events ?? []),
    messaging: section("messaging", c.messaging ?? []),
    scheduling: section("scheduling", c.scheduling ?? []),
    persistence: section("persistence", c.persistence ?? []),
    federation: section("federation", c.federation ?? []),
    usecases: section("usecases", c.usecases ?? []),
    templates: section("templates", c.templates ?? []),
    packs: section("packs", c.packs ?? []),
    deployment: section("deployment", c.deployment ?? []),
    governance: section("governance", c.governance ?? []),
    versioning: section("versioning", c.versioning ?? []),
    analytics: section("analytics", c.analytics ?? []),
    marketplace: section("marketplace", c.marketplace ?? []),
    holographicUI: section("holographicUI", c.holographicUI ?? []),
    quantumShaders: section("quantumShaders", c.quantumShaders ?? []),
  };
}

export function validateManifest(manifest: UABPManifest): boolean {
  return manifest.schemaVersion === "uabp.v1" && Boolean(manifest.agents && manifest.workflows && manifest.usecases && manifest.holographicUI && manifest.quantumShaders);
}

export function serializeManifest(manifest: UABPManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function parseManifest(raw: string | JsonRecord): UABPManifest {
  const manifest = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!validateManifest(manifest as UABPManifest)) throw new Error("Invalid UABP manifest");
  return manifest as UABPManifest;
}
