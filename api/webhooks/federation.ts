export const federationWebhookEvents = ["federation.created", "federation.executed", "federation.state.updated", "federation.strategy.applied"] as const;
export function handleFederationWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.federation", accepted: (federationWebhookEvents as readonly string[]).includes(event), event, payload };
}
