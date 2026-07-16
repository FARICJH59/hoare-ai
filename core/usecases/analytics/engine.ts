
import type { JsonRecord } from "../../types";
import { publishEvent } from "../../events/bus";
import { recordTelemetry, listTelemetry } from "./telemetry";
import { getUseCaseMetrics } from "./metrics";
import { getUseCaseInsights } from "./insights";
export function recordAnalytics(input: JsonRecord) { const event = recordTelemetry(input); publishEvent("analytics.event.recorded", { event }); return event; }
export { listTelemetry, getUseCaseMetrics, getUseCaseInsights };
