import { Tool } from "./index";

function numberParam(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export const optimizeGridTool: Tool = {
  name: "energy.optimizeGrid",
  description: "Optimize grid dispatch across facilities, storage, and flexible load.",
  async execute(params) {
    const demandMw = numberParam(params.demandMw, 120);
    const renewableMw = numberParam(params.renewableMw, 64);
    const storageMw = Math.max(0, Math.round((demandMw - renewableMw) * 0.35));
    return {
      demandMw,
      renewableMw,
      storageDispatchMw: storageMw,
      gridImportMw: Math.max(0, demandMw - renewableMw - storageMw),
      carbonIntensityScore: Math.max(0, Math.round(100 - renewableMw / demandMw * 80)),
    };
  },
};

export const regionStressScoreTool: Tool = {
  name: "energy.regionStressScore",
  description: "Score regional grid stress from demand, temperature, reserve margin, and incidents.",
  async execute(params) {
    const reserveMargin = numberParam(params.reserveMargin, 0.16);
    const temperatureC = numberParam(params.temperatureC, 31);
    const incidents = numberParam(params.incidents, 1);
    const score = Math.min(100, Math.max(0, Math.round((1 - reserveMargin) * 45 + Math.max(0, temperatureC - 22) * 2 + incidents * 8)));
    return { score, status: score > 70 ? "critical" : score > 45 ? "elevated" : "normal" };
  },
};

export const facilityTelemetryTool: Tool = {
  name: "energy.facilityTelemetry",
  description: "Summarize facility power, thermal, and efficiency telemetry.",
  async execute(params) {
    const facilityId = String(params.facilityId ?? "facility-main");
    const loadMw = numberParam(params.loadMw, 18.4);
    const coolingMw = numberParam(params.coolingMw, 5.2);
    return { facilityId, loadMw, coolingMw, pue: Math.round(((loadMw + coolingMw) / loadMw) * 100) / 100, telemetryFresh: true };
  },
};

export const loadShiftTool: Tool = {
  name: "energy.loadShift",
  description: "Plan load shifting and cooling optimization windows.",
  async execute(params) {
    const flexibleLoadMw = numberParam(params.flexibleLoadMw, 12);
    const windowHours = numberParam(params.windowHours, 4);
    return {
      shiftedMwh: Math.round(flexibleLoadMw * windowHours * 0.62 * 100) / 100,
      recommendedWindow: "off-peak",
      coolingSetpointDeltaC: 1.5,
      risk: "low",
    };
  },
};

export const energyTools: Tool[] = [optimizeGridTool, regionStressScoreTool, facilityTelemetryTool, loadShiftTool];
