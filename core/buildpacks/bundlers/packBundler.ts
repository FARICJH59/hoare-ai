import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundlePacks(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.packs",
    name: "packs",
    files,
    metadata: { description: "usecase packs", config, fileCount: files.length },
  };
}
