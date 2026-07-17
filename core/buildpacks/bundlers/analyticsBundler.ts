import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleAnalytics(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.analytics",
    name: "analytics",
    files,
    metadata: { description: "analytics engine metrics telemetry insights", config, fileCount: files.length },
  };
}
