import { createId, type JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { getHardenedContext } from "../../hardening";
import { enforceGovernance } from "../governance/engine";
import { listDeployments, saveDeployment } from "./registry";

export function deployUseCase(input: JsonRecord) {
  const context = getHardenedContext({ input, metadata: input });
  const governance = enforceGovernance({ ...input, action: "deploy", environment: input.environment ?? "development" });
  if (!governance.allowed) return { namespace: "usecases.deployment.engine", status: "blocked", governance };
  const deployment = saveDeployment({ id: createId("ucdep"), namespace: "usecases.deployment.engine", status: "deployed", tenantId: context.tenantId, channel: context.channel, ...input });
  publishEvent("usecase.deployed", { deployment, tenantId: context.tenantId });
  return deployment;
}

export function activateUseCase(input: JsonRecord) { publishEvent("usecase.activated", input); return { namespace: "usecases.deployment.engine", status: "activated", ...input }; }
export function deactivateUseCase(input: JsonRecord) { publishEvent("usecase.deactivated", input); return { namespace: "usecases.deployment.engine", status: "deactivated", ...input }; }
export { listDeployments };
