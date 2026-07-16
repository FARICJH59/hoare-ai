import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { EnergyAgent } from "../agent/energy-agent";
import { metrics, structuredLogger } from "./observability";
import { enforceEntitlement, recordUsageEvent } from "./billing/entitlements";
import type { AuthenticatedRequest } from "./middleware/auth";
import {
  energyRepository,
  type EnergyActionRecord,
  type EnergyFacilityRecord,
  type EnergyGridRegionRecord,
  type EnergyStressLevel,
  type EnergyTelemetryRecord,
  type EnergyWorkflowRecord,
} from "./storage/repositories";

export const energyRouter = Router();

function resolveOrgId(req: AuthenticatedRequest): string {
  if (req.auth?.type === "jwt" && req.auth.subject) return req.auth.subject;
  const bodyOrg = typeof req.body?.orgId === "string" ? req.body.orgId : undefined;
  const queryOrg = typeof req.query.orgId === "string" ? req.query.orgId : undefined;
  const headerOrg = typeof req.headers["x-org-id"] === "string" ? req.headers["x-org-id"] : undefined;
  return bodyOrg ?? queryOrg ?? headerOrg ?? "default-org";
}

function stressRank(level: EnergyStressLevel): number {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[level];
}

function summarizeEnergy(
  regions: EnergyGridRegionRecord[],
  facilities: EnergyFacilityRecord[],
  workflows: EnergyWorkflowRecord[]
) {
  return {
    facilityCount: facilities.length,
    highStressRegions: regions.filter((region) => ["HIGH", "CRITICAL"].includes(region.stressLevel)).length,
    lastRunAt: workflows
      .map((workflow) => workflow.lastRunAt ?? 0)
      .filter(Boolean)
      .sort((a, b) => b - a)[0],
  };
}

async function listEnergyOverview(orgId: string, regionId?: string, facilityId?: string) {
  const [regions, allFacilities, workflows] = await Promise.all([
    energyRepository.listRegions(),
    energyRepository.listFacilities(orgId, regionId),
    energyRepository.listWorkflows(orgId),
  ]);
  const facilities = facilityId ? allFacilities.filter((facility) => facility.id === facilityId) : allFacilities;
  const facilityRegionIds = new Set(facilities.map((facility) => facility.regionId));
  const scopedRegions = regions.filter((region) =>
    regionId ? region.id === regionId : facilityRegionIds.size === 0 || facilityRegionIds.has(region.id)
  );
  const [latestTelemetry, recentActions] = await Promise.all([
    energyRepository.listLatestTelemetry(facilities.map((facility) => facility.id)),
    energyRepository.listActions(orgId, 50),
  ]);
  return {
    orgId,
    regions: scopedRegions,
    facilities,
    latestTelemetry,
    workflows,
    recentActions,
    summary: summarizeEnergy(scopedRegions, facilities, workflows),
  };
}

async function runEnergyWorkflow(req: AuthenticatedRequest) {
  const orgId = resolveOrgId(req);
  const regionId = typeof req.body?.regionId === "string" ? req.body.regionId : undefined;
  const dryRun = req.body?.mode !== "execute";
  const actorId = req.auth?.subject ?? (req.auth?.type === "apikey" ? "api-key" : "anonymous-dev");
  const entitlement = await enforceEntitlement(orgId, "ENERGY_OPT_RUN");
  if (!entitlement.allowed) {
    return { orgId, dryRun, decisions: [], persistedActions: 0, governanceDecision: entitlement.governanceDecision };
  }
  const overview = await listEnergyOverview(orgId, regionId);
  const agent = new EnergyAgent();
  const decisions = await agent.run({
    orgId,
    actorId,
    dryRun,
    regions: overview.regions,
    facilities: overview.facilities,
    latestTelemetry: overview.latestTelemetry,
    recentActions: overview.recentActions,
  });

  let persistedActions = 0;
  for (const decision of decisions) {
    for (const recommended of decision.recommendedActions) {
      const governanceEntitlement = await enforceEntitlement(orgId, "GOVERNANCE_CHECK");
      if (!governanceEntitlement.allowed) {
        recommended.governanceDecision = "REJECTED";
        recommended.status = "skipped";
        recommended.notes = [...recommended.notes, "Action blocked: plan limit reached for GOVERNANCE_CHECK."];
      }
      await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "GOVERNANCE_CHECK", eventContext: { facilityId: decision.facilityId, regionId: decision.regionId, decision: recommended.governanceDecision, riskScore: stressRank(decision.stressLevel) } });
      const action: EnergyActionRecord = {
        id: uuidv4(),
        facilityId: decision.facilityId,
        timestamp: Date.now(),
        actionType: recommended.actionType,
        actionPayload: {
          ...recommended.actionPayload,
          orgId,
          actorId,
          dryRun,
          notes: recommended.notes,
          externalContext: decision.externalContext,
        },
        governanceDecision: recommended.governanceDecision,
        status: recommended.status,
      };
      await energyRepository.insertAction(action);
      metrics.increment("energy_actions_total", {
        action_type: action.actionType,
        governance_decision: action.governanceDecision,
      });
      persistedActions += 1;
    }
  }

  for (const region of overview.regions) {
    const regionDecisions = decisions.filter((decision) => decision.regionId === region.id);
    const nextStress = regionDecisions
      .map((decision) => decision.stressLevel)
      .sort((a, b) => stressRank(b) - stressRank(a))[0] ?? region.stressLevel;
    const regionTelemetry = overview.latestTelemetry.filter((item) =>
      overview.facilities.some((facility) => facility.id === item.facilityId && facility.regionId === region.id)
    );
    await energyRepository.upsertRegion({
      ...region,
      currentLoad: regionTelemetry.reduce((sum, item) => sum + item.powerKw, 0) || region.currentLoad,
      stressLevel: nextStress,
      updatedAt: Date.now(),
    });
    metrics.gauge("energy_regions_stress_level", stressRank(nextStress), { level: nextStress });
  }

  const workflow: EnergyWorkflowRecord = overview.workflows[0] ?? {
    id: uuidv4(),
    orgId,
    name: "Default Energy Optimization",
    description: "Optimizes facility energy actions from telemetry and governance constraints.",
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  workflow.lastRunAt = Date.now();
  workflow.updatedAt = Date.now();
  await energyRepository.upsertWorkflow(workflow);
  await recordUsageEvent({ orgId, userId: req.auth?.subject, eventType: "ENERGY_OPT_RUN", eventContext: { regionId, facilityIds: overview.facilities.map((facility) => facility.id), stressLevels: decisions.map((decision) => decision.stressLevel) } });
  metrics.increment("energy_workflows_runs_total", { org_id: orgId });
  structuredLogger.info("energy_workflow_run", { orgId, dryRun, regionId, persistedActions });

  return { orgId, dryRun, decisions, persistedActions, workflow };
}

energyRouter.get("/workflows", async (req: AuthenticatedRequest, res: Response) => {
  const orgId = resolveOrgId(req);
  const regionId = typeof req.query.regionId === "string" ? req.query.regionId : undefined;
  const facilityId = typeof req.query.facilityId === "string" ? req.query.facilityId : undefined;
  res.json(await listEnergyOverview(orgId, regionId, facilityId));
});

energyRouter.post("/workflows", async (req: AuthenticatedRequest, res: Response) => {
  const result = await runEnergyWorkflow(req);
  if ("governanceDecision" in result) {
    res.status(402).json({ error: "Action blocked: plan limit reached for ENERGY_OPT_RUN.", ...result });
    return;
  }
  res.status(result.dryRun ? 202 : 200).json(result);
});

energyRouter.post("/telemetry", async (req: AuthenticatedRequest, res: Response) => {
  const orgId = resolveOrgId(req);
  const region = req.body?.region as Partial<EnergyGridRegionRecord> | undefined;
  const facility = req.body?.facility as Partial<EnergyFacilityRecord> | undefined;

  if (region?.id && region.name && region.gridOperator) {
    await energyRepository.upsertRegion({
      id: region.id,
      name: region.name,
      gridOperator: region.gridOperator,
      timezone: region.timezone ?? "UTC",
      carbonIntensity: region.carbonIntensity ?? 0,
      maxCapacity: region.maxCapacity ?? 0,
      currentLoad: region.currentLoad ?? 0,
      stressLevel: region.stressLevel ?? "LOW",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  if (facility?.id && facility.regionId && facility.name) {
    await energyRepository.upsertFacility({
      id: facility.id,
      orgId,
      regionId: facility.regionId,
      name: facility.name,
      type: facility.type ?? "data-center",
      baselineLoad: facility.baselineLoad ?? 0,
      criticalityLevel: facility.criticalityLevel ?? "MEDIUM",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  const facilityId = typeof req.body?.facilityId === "string" ? req.body.facilityId : facility?.id;
  if (!facilityId || typeof req.body?.powerKw !== "number") {
    res.status(400).json({ error: "facilityId and numeric powerKw are required." });
    return;
  }
  const telemetry: EnergyTelemetryRecord = {
    id: uuidv4(),
    facilityId,
    timestamp: typeof req.body.timestamp === "number" ? req.body.timestamp : Date.now(),
    powerKw: req.body.powerKw,
    carbonIntensity: typeof req.body.carbonIntensity === "number" ? req.body.carbonIntensity : region?.carbonIntensity ?? 0,
    temperature: typeof req.body.temperature === "number" ? req.body.temperature : undefined,
    metadata: typeof req.body.metadata === "object" && req.body.metadata !== null ? req.body.metadata : {},
  };
  await energyRepository.insertTelemetry(telemetry);
  res.status(201).json({ orgId, telemetry });
});

export async function getEnergyHealth() {
  try {
    const regions = await energyRepository.listRegions();
    return {
      configured: energyRepository.enabled(),
      reachable: true,
      regions: regions.length,
      workflowsEnabled: true,
    };
  } catch (err) {
    return {
      configured: energyRepository.enabled(),
      reachable: false,
      regions: 0,
      workflowsEnabled: false,
      message: err instanceof Error ? err.message : "energy health check failed",
    };
  }
}
