export const usecasesAnalyticsWebhookEvents = ["analytics.event.recorded", "analytics.metrics.updated", "analytics.insights.generated"] as const;
export function handleUsecasesanalyticsWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.usecasesAnalytics", accepted: (usecasesAnalyticsWebhookEvents as readonly string[]).includes(event), event, payload };
}
