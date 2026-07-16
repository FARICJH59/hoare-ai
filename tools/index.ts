export interface Tool {
  name: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<unknown>;
}

export { quantumTools, quantumSimulateTool, quantumOptimizeTool } from "./quantum-compute";
export type { QuantumCircuit, QuantumGate, QuantumSimulationResult, QuantumOptimizationResult } from "./quantum-compute";

export { financeTools, marketDataTool, portfolioAnalysisTool, riskAnalysisTool } from "./finance";
export type { MarketData, PortfolioPosition, RiskMetrics } from "./finance";

export { roboticsTools, robotStatusTool, robotCommandTool, trajectoryPlanTool } from "./robotics";
export type { RobotState, RobotCommand, TrajectoryPlan } from "./robotics";

export { mlTools, mlTrainTool, mlInferenceTool, mlEmbeddingTool } from "./ml";
export type { TrainingConfig, TrainingResult, InferenceResult, EmbeddingResult } from "./ml";
export { energyTools } from "./energy";
export { computerVisionTools } from "./computer-vision";
export { webSearchTools } from "./web-search";
export { foundationTools, foundationRoute } from "./foundation";

import { quantumTools } from "./quantum-compute";
import { financeTools } from "./finance";
import { roboticsTools } from "./robotics";
import { mlTools } from "./ml";
import { energyTools } from "./energy";
import { computerVisionTools } from "./computer-vision";
import { webSearchTools } from "./web-search";
import { foundationTools } from "./foundation";

export const allTools: Tool[] = [
  ...quantumTools,
  ...financeTools,
  ...roboticsTools,
  ...mlTools,
  ...energyTools,
  ...computerVisionTools,
  ...webSearchTools,
  ...foundationTools,
];
