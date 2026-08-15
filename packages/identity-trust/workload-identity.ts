import type { IdentityType, HoareIdentity } from "./types";

export interface WorkloadIdentityOptions {
  subject: string;
  tenantId: string;
  type: Extract<IdentityType, "workload" | "agent" | "device" | "service">;
  provider?: string;
  attributes?: Record<string, string>;
  entitlements?: string[];
}

/** Creates a normalized non-human identity without issuing credentials. */
export function createWorkloadIdentity(options: WorkloadIdentityOptions): HoareIdentity {
  if (!options.subject || !options.tenantId) {
    throw new Error("Workload identity requires subject and tenantId");
  }

  return {
    subject: options.subject,
    tenantId: options.tenantId,
    provider: options.provider ?? "hoare-workload",
    providerSubject: options.subject,
    identityType: options.type,
    roles: ["service"],
    attributes: options.attributes ?? {},
    entitlements: options.entitlements ?? [],
  };
}
