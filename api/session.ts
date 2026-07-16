import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Agent } from "../agent/agent";
import { getOrgId, writeAuditLog, type TenantRequest } from "./platform";

export interface UnifiedSession {
  id: string;
  name?: string;
  agent?: Agent;
  orgId: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/** @deprecated Use UnifiedSession instead */
export type Session = UnifiedSession;

export const sessionStore: Map<string, UnifiedSession> = new Map();

export const sessionRouter = Router();

// POST /api/session — create a new session
sessionRouter.post("/", (req: Request, res: Response) => {
  const { name, metadata } = req.body as { name?: string; metadata?: Record<string, unknown> };
  const id = uuidv4();
  const now = Date.now();
  const orgId = getOrgId(req);
  const session: Session = {
    id,
    name: name ?? undefined,
    orgId,
    metadata: metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
  sessionStore.set(id, session);
  writeAuditLog({ orgId, actor: (req as TenantRequest).auth?.subject, action: "session.create", resource: id, metadata: {} });
  res.status(201).json(session);
});

// GET /api/session — list all sessions
sessionRouter.get("/", (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  res.json(Array.from(sessionStore.values()).filter((session) => session.orgId === orgId));
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
