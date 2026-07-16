
import type { JsonRecord } from "../types";

const logs: JsonRecord[] = [];

export function log(namespace: string, message: string, metadata: JsonRecord = {}) {
  const entry = { namespace: "observability.logger", source: namespace, message, metadata, createdAt: new Date().toISOString() };
  logs.push(entry);
  return entry;
}

export function listLogs() { return { namespace: "observability.logger", count: logs.length, items: logs }; }
