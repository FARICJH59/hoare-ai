import { webSearchTool, type WebSearchResult } from "../tools";
import type {
  EnergyActionRecord,
  EnergyActionType,
  EnergyFacilityRecord,
  EnergyGovernanceDecision,
  EnergyGridRegionRecord,
  EnergyStressLevel,
  EnergyTelemetryRecord,
} from "../api/storage/repositories";

export interface EnergyRecommendedAction {
  actionType: EnergyActionType;
  actionPayload: Record<string, unknown>;
  governanceDecision: EnergyGovernanceDecision;
  status: EnergyActionRecord["status"];
  notes: string[];
}

export interface EnergyDecision {
  regionId: string;
  facilityId: string;
  stressLevel: EnergyStressLevel;
  recommendedActions: EnergyRecommendedAction[];
  governanceDecision: EnergyGovernanceDecision;
  notes: string[];
  externalContext: WebSearchResult[];
}

export interface EnergyAgentInput {
  orgId: string;
  actorId?: string;
  dryRun: boolean;
  regions: EnergyGridRegionRecord[];
  facilities: EnergyFacilityRecord[];
  latestTelemetry: EnergyTelemetryRecord[];
  recentActions: EnergyActionRecord[];
}

class EnergyDependencySolver {
  order(actions: EnergyRecommendedAction[]): EnergyRecommendedAction[] {
    const priority: Record<EnergyActionType, number> = {
      LOAD_SHIFT: 1,
      COOLING_OPTIMIZE: 2,
      BATTERY_DISPATCH: 3,
      LOAD_SHED: 4,
    };
    return [...actions].sort((a, b) => priority[a.actionType] - priority[b.actionType]);
  }
}

class EnergyQuotaManager {
  private readonly hourlyLimit = Number(process.env.ENERGY_ACTIONS_HOURLY_LIMIT ?? 20);
  private readonly dailyLimit = Number(process.env.ENERGY_ACTIONS_DAILY_LIMIT ?? 100);

  withinQuota(recentActions: EnergyActionRecord[], now = Date.now()): boolean {
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const hourly = recentActions.filter((action) => action.timestamp >= hourAgo).length;
    const daily = recentActions.filter((action) => action.timestamp >= dayAgo).length;
    return hourly < this.hourlyLimit && daily < this.dailyLimit;
  }
}

class EnergyGovernanceAggregator {
  decide(
    action: EnergyRecommendedAction,
    facility: EnergyFacilityRecord,
    hasLoadShiftAlternative: boolean,
    withinQuota: boolean,
    dryRun: boolean
  ): EnergyRecommendedAction {
    const notes = [...action.notes];
    if (dryRun) {
      return { ...action, governanceDecision: "DRY_RUN", status: "proposed", notes: [...notes, "Dry-run mode: no action executed."] };
    }
    if (!withinQuota) {
      return { ...action, governanceDecision: "REJECTED", status: "skipped", notes: [...notes, "Rejected by quota manager."] };
    }
    if (action.actionType === "LOAD_SHED" && facility.criticalityLevel === "CRITICAL") {
      return {
        ...action,
        governanceDecision: "REJECTED",
        status: "skipped",
        notes: [...notes, "Critical facility load shedding requires explicit override."],
      };
    }
    if (action.actionType === "LOAD_SHED" && hasLoadShiftAlternative) {
      return {
        ...action,
        governanceDecision: "DOWNGRADED",
        status: "skipped",
        notes: [...notes, "Downgraded because load shifting is available and preferred."],
      };
    }
    return { ...action, governanceDecision: "APPROVED", status: "executed", notes };
  }
}

function computeStress(region: EnergyGridRegionRecord, telemetry: EnergyTelemetryRecord[]): EnergyStressLevel {
  const totalTelemetryLoad = telemetry.reduce((sum, item) => sum + item.powerKw, 0);
  const load = totalTelemetryLoad > 0 ? totalTelemetryLoad : region.currentLoad;
  const loadRatio = region.maxCapacity > 0 ? load / region.maxCapacity : 0;
  const maxCarbon = Math.max(region.carbonIntensity, ...telemetry.map((item) => item.carbonIntensity));
  const maxTemperature = Math.max(0, ...telemetry.map((item) => item.temperature ?? 0));

  if (loadRatio >= 0.95 || maxCarbon >= 600 || maxTemperature >= 42) return "CRITICAL";
  if (loadRatio >= 0.85 || maxCarbon >= 450 || maxTemperature >= 35) return "HIGH";
  if (loadRatio >= 0.7 || maxCarbon >= 300 || maxTemperature >= 30) return "MEDIUM";
  return "LOW";
}

function highestDecision(actions: EnergyRecommendedAction[]): EnergyGovernanceDecision {
  if (actions.some((action) => action.governanceDecision === "APPROVED")) return "APPROVED";
  if (actions.some((action) => action.governanceDecision === "DRY_RUN")) return "DRY_RUN";
  if (actions.some((action) => action.governanceDecision === "DOWNGRADED")) return "DOWNGRADED";
  return "REJECTED";
}

export class EnergyAgent {
  private dependencySolver = new EnergyDependencySolver();
  private quotaManager = new EnergyQuotaManager();
  private governanceAggregator = new EnergyGovernanceAggregator();

  async run(input: EnergyAgentInput): Promise<EnergyDecision[]> {
    const telemetryByFacility = new Map(input.latestTelemetry.map((item) => [item.facilityId, item]));
    const facilitiesByRegion = new Map<string, EnergyFacilityRecord[]>();
    for (const facility of input.facilities) {
      facilitiesByRegion.set(facility.regionId, [...(facilitiesByRegion.get(facility.regionId) ?? []), facility]);
    }

    const decisions: EnergyDecision[] = [];
    for (const region of input.regions) {
      const regionFacilities = facilitiesByRegion.get(region.id) ?? [];
      const regionTelemetry = regionFacilities
        .map((facility) => telemetryByFacility.get(facility.id))
        .filter(Boolean) as EnergyTelemetryRecord[];
      const stressLevel = computeStress(region, regionTelemetry);
      const externalContext = await this.fetchExternalContext(region, input.orgId, input.actorId);

      for (const facility of regionFacilities) {
        const telemetry = telemetryByFacility.get(facility.id);
        const proposed = this.proposeActions(region, facility, telemetry, stressLevel, externalContext);
        const ordered = this.dependencySolver.order(proposed);
        const hasLoadShiftAlternative = ordered.some((action) => action.actionType === "LOAD_SHIFT");
        const withinQuota = this.quotaManager.withinQuota(input.recentActions);
        const recommendedActions = ordered.map((action) =>
          this.governanceAggregator.decide(action, facility, hasLoadShiftAlternative, withinQuota, input.dryRun)
        );
        decisions.push({
          regionId: region.id,
          facilityId: facility.id,
          stressLevel,
          recommendedActions,
          governanceDecision: recommendedActions.length > 0 ? highestDecision(recommendedActions) : "APPROVED",
          notes: recommendedActions.length > 0 ? ["Energy workflow evaluated facility telemetry and governance rules."] : ["No action required."],
          externalContext,
        });
      }
    }
    return decisions;
  }

  private async fetchExternalContext(region: EnergyGridRegionRecord, orgId: string, userId?: string): Promise<WebSearchResult[]> {
    const result = await webSearchTool.execute({
      query: `${region.name} ${region.gridOperator} grid status carbon intensity demand response`,
      orgId,
      userId,
    }) as { results?: WebSearchResult[] };
    return result.results ?? [];
  }

  private proposeActions(
    region: EnergyGridRegionRecord,
    facility: EnergyFacilityRecord,
    telemetry: EnergyTelemetryRecord | undefined,
    stressLevel: EnergyStressLevel,
    externalContext: WebSearchResult[]
  ): EnergyRecommendedAction[] {
    if (stressLevel === "LOW") return [];
    const basePayload = {
      regionId: region.id,
      facilityId: facility.id,
      stressLevel,
      currentPowerKw: telemetry?.powerKw ?? facility.baselineLoad,
      carbonIntensity: telemetry?.carbonIntensity ?? region.carbonIntensity,
      externalTrust: externalContext.some((item) => item.trust === "trusted") ? "trusted" : "unverified",
    };
    const actions: EnergyRecommendedAction[] = [
      {
        actionType: "LOAD_SHIFT",
        actionPayload: { ...basePayload, target: "lower-stress-region" },
        governanceDecision: "APPROVED",
        status: "proposed",
        notes: ["Move flexible compute to a lower-stress region before shedding load."],
      },
    ];

    if ((telemetry?.temperature ?? 0) >= 28 || stressLevel === "HIGH" || stressLevel === "CRITICAL") {
      actions.push({
        actionType: "COOLING_OPTIMIZE",
        actionPayload: { ...basePayload, targetTemperatureDeltaC: -2 },
        governanceDecision: "APPROVED",
        status: "proposed",
        notes: ["Optimize cooling setpoints before workload reduction."],
      });
    }

    if (stressLevel === "CRITICAL") {
      actions.push({
        actionType: "LOAD_SHED",
        actionPayload: { ...basePayload, shedPercent: facility.criticalityLevel === "LOW" ? 20 : 10 },
        governanceDecision: "APPROVED",
        status: "proposed",
        notes: ["Reduce non-critical workloads only after safer alternatives are evaluated."],
      });
    }

    if (telemetry?.metadata?.batteryAvailable === true) {
      actions.push({
        actionType: "BATTERY_DISPATCH",
        actionPayload: { ...basePayload, dispatchKw: Math.min(facility.baselineLoad * 0.25, 250) },
        governanceDecision: "APPROVED",
        status: "proposed",
        notes: ["Dispatch local battery capacity to reduce grid draw."],
      });
    }

    return actions;
  }
}
