import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleHolographicUI(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.holographicUI",
    name: "holographicUI",
    files,
    metadata: { description: "holographic dashboard UI i18n logo theme settings", config, fileCount: files.length },
  };
}
