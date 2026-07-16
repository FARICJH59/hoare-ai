export const usecasesMarketplaceWebhookEvents = ["marketplace.item.published", "marketplace.item.installed", "marketplace.item.rated", "marketplace.item.updated"] as const;
export function handleUsecasesmarketplaceWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.usecasesMarketplace", accepted: (usecasesMarketplaceWebhookEvents as readonly string[]).includes(event), event, payload };
}
