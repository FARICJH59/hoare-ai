
import type { PhaseEntity, ListResult } from "../types";

export interface AgentDefinition extends PhaseEntity {
  namespace: "agents.registry";
  capabilities: string[];
  domains: string[];
}

const agents: AgentDefinition[] = [
  { id: "agents.grid-operator", namespace: "agents.registry", name: "Grid Operator Agent", description: "Coordinates Tech Fusion Grid UI grid operations.", capabilities: ["grid.optimize", "risk.evaluate", "events.publish"], domains: ["grid", "forecast"] },
  { id: "agents.hoare-analyst", namespace: "agents.registry", name: "HOARE.ai Analyst Agent", description: "Runs HOARE.ai analysis workflows with safety, risk, and tooling hooks.", capabilities: ["tools.execute", "workflows.run", "usecases.run"], domains: ["dr", "sustainability", "iot"] },
];

export function listAgents(): ListResult<AgentDefinition> {
  return { namespace: "agents.registry", count: agents.length, items: agents };
}

export function getAgent(agentId = "agents.hoare-analyst") {
  return agents.find((agent) => agent.id === agentId) ?? agents[0];
}
