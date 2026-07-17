import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleGovernance(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.governance",
    name: "governance",
    files,
    metadata: { description: "governance policies roles approvals audit", config, fileCount: files.length },
  };
}
