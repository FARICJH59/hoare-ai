import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export interface Session {
  id: string;
  name?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

const sessionStore: Map<string, Session> = new Map();

export const sessionRouter = Router();

// POST /api/session — create a new session
sessionRouter.post("/", (req: Request, res: Response) => {
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
  res.status(201).json(session);
});

// GET /api/session — list all sessions
sessionRouter.get("/", (_req: Request, res: Response) => {
  res.json(Array.from(sessionStore.values()));
});

// GET /api/session/:id — get a specific session
sessionRouter.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);
  if (!session) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  res.json(session);
});

// PATCH /api/session/:id — update session metadata or name
sessionRouter.patch("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);
  if (!session) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  const { name, metadata } = req.body as { name?: string; metadata?: Record<string, unknown> };
  if (name !== undefined) session.name = name;
  if (metadata !== undefined) session.metadata = { ...session.metadata, ...metadata };
  session.updatedAt = Date.now();
  res.json(session);
});

// DELETE /api/session/:id — delete a session
sessionRouter.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!sessionStore.has(id)) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  sessionStore.delete(id);
  res.json({ deleted: true, id });
});
