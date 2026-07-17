import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleVersioning(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.versioning",
    name: "versioning",
    files,
    metadata: { description: "versioning engine registry changelog diff", config, fileCount: files.length },
  };
}
