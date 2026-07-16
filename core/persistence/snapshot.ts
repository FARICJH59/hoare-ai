
import { createId, type JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
const snapshots: JsonRecord[] = [];
export function createSnapshot(data: JsonRecord = {}) { const snapshot = { id: createId("snapshot"), namespace: "persistence.snapshot", data, createdAt: new Date().toISOString() }; snapshots.push(snapshot); publishEvent("persistence.snapshot.created", { id: snapshot.id }); return snapshot; }
export function restoreSnapshot(id: string) { const snapshot = snapshots.find((item) => item.id === id) ?? null; publishEvent("persistence.snapshot.restored", { id }); return { namespace: "persistence.snapshot", snapshot }; }
export function listSnapshots() { return { namespace: "persistence.snapshot", count: snapshots.length, items: snapshots }; }
