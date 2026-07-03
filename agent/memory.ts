type MemoryEntry = Record<string, any>;

const memoryStore: Record<string, MemoryEntry[]> = {};

export function getSessionMemory(sessionId: string) {
  return memoryStore[sessionId] ?? [];
}

export function appendSessionMemory(sessionId: string, entry: MemoryEntry) {
  memoryStore[sessionId] = [...getSessionMemory(sessionId), entry];
  return memoryStore[sessionId];
}

export function clearSessionMemory(sessionId: string) {
  delete memoryStore[sessionId];
}
