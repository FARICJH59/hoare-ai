export const usecasesGovernanceWebhookEvents = ["governance.policy.triggered", "governance.approval.requested", "governance.approval.approved", "governance.approval.rejected", "governance.audit.logged"] as const;
export function handleUsecasesgovernanceWebhook(event: string, payload: Record<string, unknown> = {}) {
  return { namespace: "webhooks.usecasesGovernance", accepted: (usecasesGovernanceWebhookEvents as readonly string[]).includes(event), event, payload };
}
