/**
 * User & Project Memory Layer
 * In-memory stores with optional persistence hooks.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  tenantId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemoryEntry {
  projectId: string;
  projectName: string;
  industry: string;
  complexity: string;
  sessionId: string;
  artifacts: Record<string, unknown>;
  createdAt: string;
}

// Simple in-process store (replace with DB layer in production)
const sessionStore = new Map<string, Session>();
const projectStore = new Map<string, ProjectMemoryEntry>();

// ─── Session Memory ───────────────────────────────────────────────────────────

export const sessionMemory = {
  create(params: Omit<Session, 'messages' | 'createdAt' | 'updatedAt'>): Session {
    const now = new Date().toISOString();
    const session: Session = { ...params, messages: [], createdAt: now, updatedAt: now };
    sessionStore.set(session.sessionId, session);
    return session;
  },

  get(sessionId: string): Session | undefined {
    return sessionStore.get(sessionId);
  },

  addMessage(sessionId: string, message: Omit<Message, 'timestamp'>): void {
    const session = sessionStore.get(sessionId);
    if (!session) return;
    session.messages.push({ ...message, timestamp: new Date().toISOString() });
    session.updatedAt = new Date().toISOString();
    if (!session.title && message.role === 'user') {
      session.title = message.content.slice(0, 60);
    }
  },

  list(userId: string): Session[] {
    return Array.from(sessionStore.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  delete(sessionId: string): void {
    sessionStore.delete(sessionId);
  },

  stats(): { sessions: number; messages: number } {
    let messages = 0;
    sessionStore.forEach(s => { messages += s.messages.length; });
    return { sessions: sessionStore.size, messages };
  },
};

// ─── Project Memory ───────────────────────────────────────────────────────────

export const projectMemory = {
  save(entry: ProjectMemoryEntry): void {
    projectStore.set(entry.projectId, entry);
  },

  get(projectId: string): ProjectMemoryEntry | undefined {
    return projectStore.get(projectId);
  },

  listByUser(sessionId: string): ProjectMemoryEntry[] {
    return Array.from(projectStore.values()).filter(p => p.sessionId === sessionId);
  },

  stats(): { projects: number } {
    return { projects: projectStore.size };
  },
};
