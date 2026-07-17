import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleTools(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.tools",
    name: "tools",
    files,
    metadata: { description: "tool registry and executor", config, fileCount: files.length },
  };
}
