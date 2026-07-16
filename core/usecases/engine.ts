
import type { ExecutionRequest, JsonRecord } from "../types";
import { createId } from "../types";
import { runWorkflow } from "../workflows/engine";
import { publishEvent } from "../events/bus";
import { applyTemplate } from "./templates/engine";
import { applyPack } from "./packs/engine";
import { deployUseCase } from "./deployment/engine";
import { enforceGovernance } from "./governance/engine";
import { getLatestVersion } from "./versioning/engine";
import { recordAnalytics } from "./analytics/engine";
import { getMarketplaceItem } from "./marketplace/engine";

export async function runUseCase(request: ExecutionRequest & { templateName?: string; templateConfig?: JsonRecord; packName?: string; packConfig?: JsonRecord; environment?: string; marketplaceItemId?: string } = {}) {
  const id = request.id ?? createId("usecase");
  const governance = enforceGovernance(request.input ?? {});
  const template = applyTemplate(request.templateName, request.templateConfig);
  const pack = applyPack(request.packName, request.packConfig);
  const version = getLatestVersion();
  const marketplace = request.marketplaceItemId ? getMarketplaceItem(request.marketplaceItemId) : null;
  const workflow = await runWorkflow({ ...request, id: `${id}.workflow` });
  const deployment = request.environment ? deployUseCase({ usecaseId: id, environment: request.environment }) : null;
  const analytics = recordAnalytics({ usecaseId: id, status: workflow.status });
  publishEvent("usecase.executed", { id, workflowId: workflow.id }, request.domain);
  return { id, namespace: "usecases.engine", status: "completed", workflow, metadata: { governance, template, pack, deployment, version, analytics, marketplace } };
}
