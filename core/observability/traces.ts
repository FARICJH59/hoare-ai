
import { createId, type JsonRecord } from "../types";

const traces: JsonRecord[] = [];

export function startTrace(name: string, metadata: JsonRecord = {}) {
  const trace = { id: createId("trace"), namespace: "observability.traces", name, metadata, startedAt: new Date().toISOString() };
  traces.push(trace);
  return trace;
}

export function listTraces() { return { namespace: "observability.traces", count: traces.length, items: traces }; }
