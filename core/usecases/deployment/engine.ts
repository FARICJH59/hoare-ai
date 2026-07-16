
import { createId, type JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { listDeployments, saveDeployment } from "./registry";
export function deployUseCase(input: JsonRecord) { const deployment = saveDeployment({ id: createId("ucdep"), namespace: "usecases.deployment.engine", status: "deployed", ...input }); publishEvent("usecase.deployed", { deployment }); return deployment; }
export function activateUseCase(input: JsonRecord) { publishEvent("usecase.activated", input); return { namespace: "usecases.deployment.engine", status: "activated", ...input }; }
export function deactivateUseCase(input: JsonRecord) { publishEvent("usecase.deactivated", input); return { namespace: "usecases.deployment.engine", status: "deactivated", ...input }; }
export { listDeployments };
