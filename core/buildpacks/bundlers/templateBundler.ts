import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleTemplates(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.templates",
    name: "templates",
    files,
    metadata: { description: "usecase templates", config, fileCount: files.length },
  };
}
