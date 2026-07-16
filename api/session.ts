import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import type { Agent } from "../agent/agent";
import { getOrgId, persistRecord, writeAuditLog, type TenantRequest } from "./platform";

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
  persistRecord("agent_sessions", { id, org_id: orgId, name: session.name, state: {}, metadata: session.metadata, created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() });
  writeAuditLog({ org_id: orgId, actor_id: (req as TenantRequest).tenant?.actorId, action: "session.create", resource_type: "agent_session", resource_id: id, metadata: {} });
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
  if (!session || session.orgId !== getOrgId(req)) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  res.json(session);
});

// PATCH /api/session/:id — update session metadata or name
sessionRouter.patch("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);
  if (!session || session.orgId !== getOrgId(req)) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  const { name, metadata } = req.body as { name?: string; metadata?: Record<string, unknown> };
  if (name !== undefined) session.name = name;
  if (metadata !== undefined) session.metadata = { ...session.metadata, ...metadata };
  session.updatedAt = Date.now();
  persistRecord("agent_sessions", { id, org_id: session.orgId, name: session.name, metadata: session.metadata, updated_at: new Date(session.updatedAt).toISOString() });
  writeAuditLog({ org_id: session.orgId, actor_id: (req as TenantRequest).tenant?.actorId, action: "session.update", resource_type: "agent_session", resource_id: id, metadata: {} });
  res.json(session);
});

// DELETE /api/session/:id — delete a session
sessionRouter.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const session = sessionStore.get(id);
  if (!session || session.orgId !== getOrgId(req)) {
    res.status(404).json({ error: `Session "${id}" not found.` });
    return;
  }
  sessionStore.delete(id);
  writeAuditLog({ org_id: session.orgId, actor_id: (req as TenantRequest).tenant?.actorId, action: "session.delete", resource_type: "agent_session", resource_id: id, metadata: {} });
  res.json({ deleted: true, id });
});
