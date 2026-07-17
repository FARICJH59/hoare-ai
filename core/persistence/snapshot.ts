import { createId, type JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import { HardeningError } from "../hardening/errors";

const snapshots: JsonRecord[] = [];

function checksum(value: JsonRecord) {
  return Buffer.from(JSON.stringify(value)).toString("base64url").slice(0, 24);
}

export function createSnapshot(data: JsonRecord = {}) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new HardeningError("snapshot.invalid", "Snapshot data must be an object");
  const snapshot = { id: createId("snapshot"), namespace: "persistence.snapshot", data, checksum: checksum(data), createdAt: new Date().toISOString() };
  snapshots.push(snapshot);
  publishEvent("persistence.snapshot.created", { id: snapshot.id, checksum: snapshot.checksum });
  return snapshot;
}

export function restoreSnapshot(id: string) {
  const snapshot = snapshots.find((item) => item.id === id) ?? null;
  if (!snapshot) return { namespace: "persistence.snapshot", status: "aborted", reason: "not-found", snapshot: null };
  const data = snapshot.data as JsonRecord;
  if (snapshot.checksum !== checksum(data)) return { namespace: "persistence.snapshot", status: "aborted", reason: "checksum-mismatch", snapshot: null };
  publishEvent("persistence.snapshot.restored", { id });
  return { namespace: "persistence.snapshot", status: "completed", snapshot };
}

export function listSnapshots() { return { namespace: "persistence.snapshot", count: snapshots.length, items: snapshots }; }
