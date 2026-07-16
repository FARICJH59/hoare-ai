import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Agent } from "../agent/agent";
import { sessionRepository } from "./storage/repositories";

export interface UnifiedSession {
  id: string;
  name?: string;
  agent?: Agent;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/** @deprecated Use UnifiedSession instead */
export type Session = UnifiedSession;

export const sessionStore: Map<string, UnifiedSession> = new Map();

export const sessionRouter = Router();

async function persistSession(session: UnifiedSession): Promise<void> {
  try {
    await sessionRepository.upsert(session);
  } catch (err) {
    // Keep the API available with the in-memory store if persistence is temporarily unavailable.
    console.warn("session_persist_failed", err instanceof Error ? err.message : err);
  }
}

// POST /api/session — create a new session
sessionRouter.post("/", async (req: Request, res: Response) => {
  const { name, metadata } = req.body as { name?: string; metadata?: Record<string, unknown> };
  const id = uuidv4();
  const now = Date.now();
  const session: Session = {
    id,
    name: name ?? undefined,
    metadata: metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
  sessionStore.set(id, session);
  await persistSession(session);
  res.status(201).json(session);
});

// GET /api/session — list all sessions
sessionRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const persisted = await sessionRepository.list();
    const merged = new Map<string, UnifiedSession>();
    for (const session of persisted) merged.set(session.id, session);
    for (const session of sessionStore.values()) merged.set(session.id, session);
    res.json(Array.from(merged.values()));
  } catch {
    res.json(Array.from(sessionStore.values()));
  }
});

// GET /api/session/:id — get a specific session
sessionRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  let session = sessionStore.get(id);
  if (!session) {
    try {
      session = await sessionRepository.get(id);
    } catch {
      session = undefined;
    }
  }
  if (!session) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  res.json(session);
});

// PATCH /api/session/:id — update session metadata or name
sessionRouter.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  let session = sessionStore.get(id);
  if (!session) {
    try {
      session = await sessionRepository.get(id);
    } catch {
      session = undefined;
    }
  }
  if (!session) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  const { name, metadata } = req.body as { name?: string; metadata?: Record<string, unknown> };
  if (name !== undefined) session.name = name;
  if (metadata !== undefined) session.metadata = { ...session.metadata, ...metadata };
  session.updatedAt = Date.now();
  sessionStore.set(id, session);
  await persistSession(session);
  res.json(session);
});

// DELETE /api/session/:id — delete a session
sessionRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const existedInMemory = sessionStore.delete(id);
  let existedInPersistence = false;
  try {
    const persisted = await sessionRepository.get(id);
    existedInPersistence = Boolean(persisted);
    await sessionRepository.delete(id);
  } catch {
    existedInPersistence = false;
  }
  if (!existedInMemory && !existedInPersistence) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  res.json({ deleted: true, id });
});
