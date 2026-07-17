
import type { ListResult, PhaseEntity } from "../../types";
export const templates: PhaseEntity[] = [
  { id: "usecases.templates.gridOptimizationBasic", namespace: "usecases.templates.registry", name: "Grid Optimization Basic", description: "Basic grid optimization scenario." },
  { id: "usecases.templates.drEventSimulation", namespace: "usecases.templates.registry", name: "DR Event Simulation", description: "Demand-response event simulation." },
  { id: "usecases.templates.iotOrchestrationBasic", namespace: "usecases.templates.registry", name: "IoT Orchestration Basic", description: "Basic IoT orchestration." },
  { id: "usecases.templates.sustainabilityScorecard", namespace: "usecases.templates.registry", name: "Sustainability Scorecard", description: "Sustainability scorecard." },
  { id: "usecases.templates.forecastScenarioAnalysis", namespace: "usecases.templates.registry", name: "Forecast Scenario Analysis", description: "Forecast scenario analysis." },
];
export function listTemplates(): ListResult<PhaseEntity> { return { namespace: "usecases.templates.registry", count: templates.length, items: templates }; }
export function getTemplate(id?: string) { return templates.find((item) => item.id === id || item.name === id) ?? templates[0]; }
