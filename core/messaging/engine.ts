
import type { JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import { addMessage, getMailbox } from "./mailbox";

export function sendMessage(to: string, message: JsonRecord) {
  const saved = addMessage(to, { ...message, type: "direct" });
  publishEvent("messaging.sent", { to, message: saved });
  return { namespace: "messaging.engine", status: "completed", message: saved };
}

export function broadcastMessage(recipients: string[], message: JsonRecord) {
  const items = recipients.map((to) => addMessage(to, { ...message, type: "broadcast" }));
  publishEvent("messaging.broadcast", { recipients });
  return { namespace: "messaging.engine", status: "completed", items };
}

export { getMailbox };
