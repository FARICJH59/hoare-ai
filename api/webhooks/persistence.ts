export const persistenceWebhookEvents = ["persistence.saved", "persistence.deleted", "persistence.snapshot.created", "persistence.snapshot.restored"] as const;
export function handlePersistenceWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.persistence", accepted: (persistenceWebhookEvents as readonly string[]).includes(event), event, payload };
}
