/**
 * Provider-neutral identity contract for the HOARE Identity & Trust Plane.
 *
 * Phase 1 deliberately contains no Login.gov-specific fields or behavior.
 * Upstream providers normalize into this contract before authorization.
 */
export type IdentityType = "human" | "workload" | "agent" | "device" | "service";

export interface HoareIdentity {
  subject: string;
  tenantId?: string;
  provider: string;
  providerSubject?: string;
  identityType: IdentityType;
  roles: string[];
  attributes: Record<string, string | number | boolean | string[]>;
  entitlements: string[];
  authenticationContext?: {
    method?: string;
    authenticatedAt?: string;
    assuranceLevel?: string;
  };
  auditContext?: {
    correlationId?: string;
    source?: string;
  };
}

export interface IdentityResolutionContext {
  tenantId?: string;
  correlationId?: string;
  source?: string;
}

export interface IdentityProvider {
  readonly id: string;
  readonly type: IdentityType | "federated";
  resolve(input: unknown, context?: IdentityResolutionContext): Promise<HoareIdentity | null>;
}
