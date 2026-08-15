import type { HoareApplicationTrustSpec } from "./control-plane";
import { projectIdentityTrustRuntime, type RuntimeIdentityTrust } from "./runtime";

export interface HoareApplicationManifest {
  version: 1;
  applicationId: string;
  tenantId: string;
  identityTrust: RuntimeIdentityTrust;
}

/**
 * Converts the builder's declarative trust specification into a safe
 * application manifest. This is generation only: no provider registration,
 * credential creation, deployment, or CI/CD mutation occurs here.
 */
export function generateApplicationManifest(
  spec: HoareApplicationTrustSpec,
): HoareApplicationManifest {
  const identityTrust = projectIdentityTrustRuntime(spec);

  return {
    version: 1,
    applicationId: spec.applicationId,
    tenantId: spec.tenantId,
    identityTrust,
  };
}
