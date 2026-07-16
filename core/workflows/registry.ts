
import type { ListResult, PhaseEntity } from "../types";
export const workflows: PhaseEntity[] = [
  { id: "workflows.grid-readiness", namespace: "workflows.registry", name: "Grid Readiness", description: "Runs the grid readiness agent/tool chain." },
  { id: "workflows.usecase-launch", namespace: "workflows.registry", name: "Use Case Launch", description: "Launches governed use case execution." },
];
export function listWorkflows(): ListResult<PhaseEntity> { return { namespace: "workflows.registry", count: workflows.length, items: workflows }; }
