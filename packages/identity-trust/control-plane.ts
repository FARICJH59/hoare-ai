import type { IdentityType } from "./types";

export interface IdentityProviderConfig {
  id: string;
  enabled: boolean;
  type: "native" | "oidc" | "saml" | "federated";
  displayName: string;
  environment?: "development" | "sandbox" | "production";
}

export interface IdentityPolicyConfig {
  requiredRoles?: string[];
  requiredEntitlements?: string[];
  allowedIdentityTypes?: IdentityType[];
}

export interface IdentityTrustConfig {
  providers: IdentityProviderConfig[];
  policy?: IdentityPolicyConfig;
}

export interface HoareApplicationTrustSpec {
  applicationId: string;
  tenantId: string;
  identity: IdentityTrustConfig;
}

/**
 * Builder-facing identity configuration. This is declarative only: it does
 * not provision credentials, register external providers, or alter CI/CD.
 */
export function createIdentityTrustSpec(input: HoareApplicationTrustSpec): HoareApplicationTrustSpec {
  if (!input.applicationId || !input.tenantId) {
    throw new Error("Identity trust specs require applicationId and tenantId");
  }

  const enabled = input.identity.providers.filter((provider) => provider.enabled);
  if (enabled.length === 0) {
    throw new Error("Identity trust spec requires at least one enabled provider");
  }

  return structuredClone(input);
}
