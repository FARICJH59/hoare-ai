export const usecasesWebhookEvents = ["usecase.executed", "usecase.failed"] as const;
export function handleUsecasesWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.usecases", accepted: (usecasesWebhookEvents as readonly string[]).includes(event), event, payload };
}
