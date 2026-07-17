import type { ExecutionRequest, JsonRecord } from "../types";
import { createId } from "../types";
import { runWorkflow } from "../workflows/engine";
import { publishEvent } from "../events/bus";
import { incrementMetric } from "../observability/metrics";
import { startTrace } from "../observability/traces";
import { getHardenedContext, toSafeError, withTimeout } from "../hardening";
import { stabilityHardening } from "../config/hardening/stability";
import { applyTemplate } from "./templates/engine";
import { applyPack } from "./packs/engine";
import { deployUseCase } from "./deployment/engine";
import { enforceGovernance } from "./governance/engine";
import { getLatestVersion } from "./versioning/engine";
import { recordAnalytics } from "./analytics/engine";
import { getMarketplaceItem } from "./marketplace/engine";

export async function runUseCase(request: ExecutionRequest & { templateName?: string; templateConfig?: JsonRecord; packName?: string; packConfig?: JsonRecord; environment?: string; marketplaceItemId?: string } = {}) {
  const id = request.id ?? createId("usecase");
  const context = getHardenedContext({ ...request, id, metadata: { ...request.metadata, environment: request.environment ?? request.metadata?.environment } });
  const trace = startTrace("usecases.engine.run", { id, tenantId: context.tenantId, correlationId: context.correlationId, environment: context.environment, version: context.version });
  try {
    const governance = enforceGovernance({ ...(request.input ?? {}), environment: request.environment ?? context.environment, channel: context.channel, role: context.role, tenantId: context.tenantId, approvalId: request.metadata?.approvalId });
    if (!governance.allowed) {
      incrementMetric("usecases.blocked");
      return { id, namespace: "usecases.engine", status: "blocked", metadata: { governance, trace, context } };
    }
    const template = applyTemplate(request.templateName, request.templateConfig);
    const pack = applyPack(request.packName, request.packConfig);
    const version = getLatestVersion();
    const marketplace = request.marketplaceItemId ? getMarketplaceItem(request.marketplaceItemId) : null;
    const workflow = await withTimeout(runWorkflow({ ...request, id: `${id}.workflow`, metadata: { ...request.metadata, tenantId: context.tenantId, correlationId: context.correlationId } }), stabilityHardening.workflows.timeoutMs, "usecase.workflow.timeout");
    const deployment = request.environment ? deployUseCase({ usecaseId: id, environment: request.environment, tenantId: context.tenantId, role: context.role, approvalId: request.metadata?.approvalId }) : null;
    const analytics = recordAnalytics({ usecaseId: id, status: workflow.status, tenantId: context.tenantId, correlationId: context.correlationId });
    incrementMetric("usecases.runs");
    publishEvent("usecase.executed", { id, workflowId: workflow.id, tenantId: context.tenantId, correlationId: context.correlationId }, request.domain);
    return { id, namespace: "usecases.engine", status: "completed", workflow, metadata: { governance, template, pack, deployment, version, analytics, marketplace, trace, context } };
  } catch (error) {
    const safeError = toSafeError(error);
    publishEvent("usecase.failed", { id, error: safeError, tenantId: context.tenantId, correlationId: context.correlationId }, request.domain);
    return { id, namespace: "usecases.engine", status: "failed", metadata: { error: safeError, trace, context } };
  }
}
