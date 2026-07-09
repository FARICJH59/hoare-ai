export interface MemoryEntry {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export class AgentMemory {
  private agentId: string;
  private entries: MemoryEntry[];
  private readonly maxEntries: number;

  constructor(agentId: string, maxEntries = 1000) {
    this.agentId = agentId;
    this.entries = [];
    this.maxEntries = maxEntries;
  }

  get id(): string {
    return this.agentId;
  }

  addEntry(entry: MemoryEntry): void {
    const stamped: MemoryEntry = { ...entry, timestamp: entry.timestamp ?? Date.now() };
    this.entries.push(stamped);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getAll(): MemoryEntry[] {
    return [...this.entries];
  }

  getByRole(role: MemoryEntry["role"]): MemoryEntry[] {
    return this.entries.filter((e) => e.role === role);
  }

  getLast(n: number): MemoryEntry[] {
    return this.entries.slice(-n);
  }

  search(query: string, limit = 10): MemorySearchResult[] {
    const lower = query.toLowerCase();
    return this.entries
      .map((entry) => {
        const content = entry.content.toLowerCase();
        let score = 0;
        const words = lower.split(/\s+/);
        for (const word of words) {
          if (content.includes(word)) score++;
        }
        return { entry, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  clear(): void {
    this.entries = [];
  }

  size(): number {
    return this.entries.length;
  }

  toJSON(): object {
    return {
      agentId: this.agentId,
      entryCount: this.entries.length,
      entries: this.entries,
    };
  }
}
