import type { HoarePlugin, PluginRegistrations } from "../../packages/plugin-system";
import { quantumTools } from "../../tools/quantum-compute";
import { financeTools } from "../../tools/finance";
import { roboticsTools } from "../../tools/robotics";
import { mlTools } from "../../tools/ml";

/**
 * Demo plugin — bundles the original HOARE.ai tools (finance, ML,
 * quantum-compute, robotics) as a single plugin. This proves the
 * plugin framework works without changing any tool source code.
 */
export const demoPlugin: HoarePlugin = {
  manifest: {
    id: "hoare-demo",
    name: "HOARE Demo Tools",
    version: "1.0.0",
    description: "Bundled finance, ML, quantum-compute, and robotics simulation tools.",
    category: "demo",
  },
  register(): PluginRegistrations {
    return {
      tools: [
        ...quantumTools,
        ...financeTools,
        ...roboticsTools,
        ...mlTools,
      ],
    };
  },
};

export default demoPlugin;
