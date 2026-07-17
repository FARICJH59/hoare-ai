import type { JsonRecord } from "../types";
import { publishDeadLetter, publishEvent } from "../events/bus";
import { getHardenedContext, withRetry } from "../hardening";
import { addMessage, getMailbox } from "./mailbox";

export async function sendMessage(to: string, message: JsonRecord) {
  const context = getHardenedContext({ metadata: message });
  try {
    const saved = await withRetry(async () => addMessage(to, { ...message, type: "direct", tenantId: context.tenantId, correlationId: context.correlationId }), 1, 25);
    publishEvent("messaging.sent", { to, message: saved, tenantId: context.tenantId, correlationId: context.correlationId });
    return { namespace: "messaging.engine", status: "completed", message: saved };
  } catch (error) {
    publishDeadLetter("messaging.sent.failed", { to, error: error instanceof Error ? error.message : "unknown" });
    return { namespace: "messaging.engine", status: "failed", safeDefault: true };
  }
}

export async function broadcastMessage(recipients: string[], message: JsonRecord) {
  const items = await Promise.all(recipients.map((to) => sendMessage(to, { ...message, type: "broadcast" })));
  publishEvent("messaging.broadcast", { recipients });
  return { namespace: "messaging.engine", status: "completed", items };
}

export { getMailbox };
