export const usecasesDeploymentWebhookEvents = ["usecase.deployed", "usecase.activated", "usecase.deactivated", "usecase.version.changed"] as const;
export function handleUsecasesdeploymentWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.usecasesDeployment", accepted: (usecasesDeploymentWebhookEvents as readonly string[]).includes(event), event, payload };
}
