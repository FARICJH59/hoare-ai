
import type { ListResult, PhaseEntity } from "../../types";
export const packs: PhaseEntity[] = ["gridOpsPack", "drSimulationPack", "iotOrchestrationPack", "sustainabilitySuitePack", "forecastingSuitePack"].map((name) => ({ id: `usecases.packs.${name}`, namespace: "usecases.packs.registry", name, description: `${name} use case pack.` }));
export function listPacks(): ListResult<PhaseEntity> { return { namespace: "usecases.packs.registry", count: packs.length, items: packs }; }
export function getPack(id?: string) { return packs.find((item) => item.id === id || item.name === id) ?? packs[0]; }
