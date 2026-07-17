export const usecasesVersioningWebhookEvents = ["usecase.version.created", "usecase.version.rolledback", "usecase.version.channel.updated", "usecase.version.diff.generated"] as const;
export function handleUsecasesversioningWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.usecasesVersioning", accepted: (usecasesVersioningWebhookEvents as readonly string[]).includes(event), event, payload };
}
