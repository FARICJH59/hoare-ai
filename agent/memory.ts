type MemoryEntry = Record<string, any>;

// Simple in-memory session store; data is lost when the process restarts.
const memoryStore: Record<string, MemoryEntry[]> = {};

export function getSessionMemory(sessionId: string) {
  return memoryStore[sessionId] ?? [];
}

export function appendSessionMemory(sessionId: string, entry: MemoryEntry) {
  if (!memoryStore[sessionId]) {
    memoryStore[sessionId] = [];
  }

  const sessionMemory = memoryStore[sessionId];
  sessionMemory.push(entry);
  return sessionMemory;
}

export function clearSessionMemory(sessionId: string) {
  delete memoryStore[sessionId];
}
