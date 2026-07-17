import type { JsonRecord } from "../../types";
import type { BundleSection } from "../manifest";

export function bundleQuantumShaders(config: JsonRecord = {}, files: string[] = []): BundleSection {
  return {
    namespace: "buildpacks.bundle.quantumShaders",
    name: "quantumShaders",
    files,
    metadata: { description: "QuantumGrid QuantumParticles QuantumShimmer QuantumBloom", config, fileCount: files.length },
  };
}
