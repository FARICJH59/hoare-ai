
import type { JsonRecord } from "../../types";
const events: JsonRecord[] = [];
export function recordTelemetry(event: JsonRecord) { const saved = { namespace: "usecases.analytics.telemetry", at: new Date().toISOString(), ...event }; events.push(saved); return saved; }
export function listTelemetry() { return { namespace: "usecases.analytics.telemetry", count: events.length, items: events }; }
