export const schedulingWebhookEvents = ["scheduling.task.scheduled", "scheduling.task.executed", "scheduling.task.cancelled"] as const;
export function handleSchedulingWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.scheduling", accepted: (schedulingWebhookEvents as readonly string[]).includes(event), event, payload };
}
