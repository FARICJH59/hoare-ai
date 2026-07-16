
import type { ListResult, PhaseEntity } from "../types";

export interface ToolDefinition extends PhaseEntity {
  namespace: "tools.registry";
  inputSchema: Record<string, string>;
}

const tools: ToolDefinition[] = [
  { id: "tools.echo", namespace: "tools.registry", name: "Echo Tool", description: "Returns the provided payload for smoke tests.", inputSchema: { payload: "object" } },
  { id: "tools.grid-score", namespace: "tools.registry", name: "Grid Score Tool", description: "Produces a deterministic grid readiness score.", inputSchema: { domain: "string" } },
];

export function listTools(): ListResult<ToolDefinition> {
  return { namespace: "tools.registry", count: tools.length, items: tools };
}

export function getTool(toolName = "tools.echo") {
  return tools.find((tool) => tool.id === toolName || tool.name === toolName) ?? tools[0];
}
