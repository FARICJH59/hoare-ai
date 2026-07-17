import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleMarketplace(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.marketplace",
    name: "marketplace",
    files,
    metadata: { description: "marketplace engine registry search ratings publish", config, fileCount: files.length },
  };
}
