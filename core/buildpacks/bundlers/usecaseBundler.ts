import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleUsecases(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.usecases",
    name: "usecases",
    files,
    metadata: { description: "usecase engine and registry", config, fileCount: files.length },
  };
}
