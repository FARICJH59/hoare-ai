export const messagingWebhookEvents = ["messaging.sent", "messaging.broadcast", "messaging.mailbox.updated"] as const;
export function handleMessagingWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.messaging", accepted: (messagingWebhookEvents as readonly string[]).includes(event), event, payload };
}
