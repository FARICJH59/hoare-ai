import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleAgents(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.agents",
    name: "agents",
    files,
    metadata: { description: "agent runtime and registry", config, fileCount: files.length },
  };
}
