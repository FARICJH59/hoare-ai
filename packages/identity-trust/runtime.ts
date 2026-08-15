import type { HoareApplicationTrustSpec } from "./control-plane";
import type { IdentityProvider } from "./types";

export interface IdentityRuntimeState {
  applicationId: string;
  tenantId: string;
  enabledProviders: string[];
}

/**
 * Runtime projection of a builder trust specification.
 * This does not contact providers or provision credentials. It only derives
 * the runtime provider allow-list from declarative control-plane state.
 */
export function materializeIdentityRuntime(
  spec: HoareApplicationTrustSpec,
  availableProviders: IdentityProvider[],
): IdentityRuntimeState {
  const available = new Set(availableProviders.map((provider) => provider.id));
  const enabled = spec.identity.providers
    .filter((provider) => provider.enabled)
    .map((provider) => provider.id);

  const unavailable = enabled.filter((id) => !available.has(id));
  if (unavailable.length > 0) {
    throw new Error(`Configured identity providers are unavailable: ${unavailable.join(", ")}`);
  }

  return {
    applicationId: spec.applicationId,
    tenantId: spec.tenantId,
    enabledProviders: enabled,
  };
}
