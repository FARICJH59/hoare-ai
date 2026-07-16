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

export { foundationTools, foundationGenerateTextTool, foundationGenerateCodeTool, foundationEmbedTool } from "./foundation";

import { quantumTools } from "./quantum-compute";
import { financeTools } from "./finance";
import { roboticsTools } from "./robotics";
import { mlTools } from "./ml";
import { foundationTools } from "./foundation";

export const allTools: Tool[] = [
  ...quantumTools,
  ...financeTools,
  ...roboticsTools,
  ...mlTools,
  ...foundationTools,
];
