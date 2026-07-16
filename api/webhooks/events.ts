export const eventsWebhookEvents = ["event.published", "event.stream.updated"] as const;
export function handleEventsWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.events", accepted: (eventsWebhookEvents as readonly string[]).includes(event), event, payload };
}
