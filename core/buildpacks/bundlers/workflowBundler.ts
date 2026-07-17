import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleWorkflows(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.workflows",
    name: "workflows",
    files,
    metadata: { description: "workflow engine and registry", config, fileCount: files.length },
  };
}
