
import type { JsonRecord } from "../types";

const mailboxes = new Map<string, JsonRecord[]>();

export function addMessage(agentId: string, message: JsonRecord) {
  const messages = mailboxes.get(agentId) ?? [];
  messages.push({ namespace: "messaging.mailbox", ...message, receivedAt: new Date().toISOString() });
  mailboxes.set(agentId, messages);
  return messages[messages.length - 1];
}

export function getMailbox(agentId = "agents.hoare-analyst") {
  const items = mailboxes.get(agentId) ?? [];
  return { namespace: "messaging.mailbox", count: items.length, items };
}
