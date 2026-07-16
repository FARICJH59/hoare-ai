import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Agent } from "../agent/agent";
import { AgentMemory } from "../agent/memory";
import { allTools } from "../tools";
import { sessionStore, type UnifiedSession } from "./session";
import { getOrgId, meterUsage, writeAuditLog, type TenantRequest } from "./platform";

function getOrCreateSession(sessionId: string, orgId: string): UnifiedSession {
  const existing = sessionStore.get(sessionId);
  if (existing && existing.orgId === orgId) {
    existing.updatedAt = Date.now();
    if (!existing.agent) {
      existing.agent = new Agent({
        name: `session-agent-${sessionId}`,
        description: "Auto-created agent for chat session.",
        tools: allTools,
      });
    }
    return existing;
  }
  const agent = new Agent({
    name: `session-agent-${sessionId}`,
    description: "Auto-created agent for chat session.",
    tools: allTools,
  });
  const now = Date.now();
  const session: UnifiedSession = {
    id: sessionId,
    agent,
    orgId,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
  sessionStore.set(sessionId, session);
  return session;
}

export const chatRouter = Router();

// POST /api/chat — send a message and get an agent response
chatRouter.post("/", async (req: Request, res: Response) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message || typeof message !== "string" || message.trim() === "") {
    res.status(400).json({ error: "message is required and must be a non-empty string." });
    return;
  }

  const orgId = getOrgId(req);
  const sid = sessionId && typeof sessionId === "string" ? sessionId : uuidv4();
  const session = getOrCreateSession(sid, orgId);

  try {
    const result = await session.agent!.run(message.trim());
    meterUsage(orgId, "agent_run", 1, { sessionId: sid, toolsUsed: result.toolsUsed.length });
    writeAuditLog({ orgId, actor: (req as TenantRequest).auth?.subject, action: "agent.run", resource: sid, metadata: { toolsUsed: result.toolsUsed } });
    res.json({
      sessionId: sid,
      agentId: result.agentId,
      response: result.response,
      toolsUsed: result.toolsUsed,
      iterations: result.iterations,
      timestamp: Date.now(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    res.status(500).json({ error: message });
  }
});

// GET /api/chat/:sessionId/history — retrieve conversation history
chatRouter.get("/:sessionId/history", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.get(sessionId);
  if (!session || !session.agent) {
    res.status(404).json({ error: `Session "${sessionId}" not found.` });
    return;
  }
  const memory: AgentMemory = session.agent.getMemory();
  res.json({ sessionId, entries: memory.getAll() });
});

// DELETE /api/chat/:sessionId — clear a session's conversation history
chatRouter.delete("/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessionStore.get(sessionId);
  if (!session || !session.agent) {
    res.status(404).json({ error: `Session "${sessionId}" not found.` });
    return;
  }
  session.agent.getMemory().clear();
  res.json({ sessionId, cleared: true });
});

// Re-export unified store under the old name for backward compatibility
export { sessionStore as sessions };
