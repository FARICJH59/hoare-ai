import type { JsonRecord } from "../types";
import { reliabilityHardening } from "../config/hardening/reliability";
import { publishDeadLetter } from "../events/bus";

const mailboxes = new Map<string, JsonRecord[]>();

export function addMessage(agentId: string, message: JsonRecord) {
  const messages = mailboxes.get(agentId) ?? [];
  const saved = { namespace: "messaging.mailbox", ...message, receivedAt: new Date().toISOString() };
  if (messages.length >= reliabilityHardening.mailboxMaxMessages) {
    const dropped = messages.shift();
    publishDeadLetter("messaging.mailbox.overflow", { agentId, dropped: dropped ?? null });
  }
  messages.push(saved);
  mailboxes.set(agentId, messages);
  return saved;
}

export function getMailbox(agentId = "agents.hoare-analyst") {
  const items = mailboxes.get(agentId) ?? [];
  return { namespace: "messaging.mailbox", count: items.length, items };
}
