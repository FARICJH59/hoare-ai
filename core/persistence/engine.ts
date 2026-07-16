
import type { JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import { inMemoryPersistenceAdapter } from "./adapters/inMemoryAdapter";

export function getRecord(key: string) { return { namespace: "persistence.engine", key, value: inMemoryPersistenceAdapter.get(key) ?? null }; }
export function setRecord(key: string, value: JsonRecord) { const saved = inMemoryPersistenceAdapter.set(key, value); publishEvent("persistence.saved", { key }); return { namespace: "persistence.engine", key, value: saved }; }
export function deleteRecord(key: string) { const deleted = inMemoryPersistenceAdapter.delete(key); publishEvent("persistence.deleted", { key }); return { namespace: "persistence.engine", key, deleted }; }
export function listRecords() { return { namespace: "persistence.engine", count: inMemoryPersistenceAdapter.list().length, items: inMemoryPersistenceAdapter.list() }; }
