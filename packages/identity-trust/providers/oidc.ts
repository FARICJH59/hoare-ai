import type { IdentityProvider, IdentityResolutionContext, HoareIdentity } from "../types";

export interface OidcProviderConfig {
  id: string;
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  enabled?: boolean;
}

export interface OidcClaims {
  iss: string;
  sub: string;
  aud?: string | string[];
  email?: string;
  name?: string;
  roles?: string[];
  groups?: string[];
  tenant_id?: string;
  [claim: string]: unknown;
}

/**
 * Generic OIDC adapter boundary. Token acquisition/cryptographic validation
 * is intentionally supplied by the host runtime; this adapter only maps
 * already-validated claims into HoareIdentity.
 */
export class OidcIdentityProvider implements IdentityProvider {
  readonly type = "federated" as const;

  constructor(private readonly config: OidcProviderConfig) {}

  get id(): string {
    return this.config.id;
  }

  get authorizationUrl(): string {
    return `${this.config.issuer.replace(/\/$/, "")}/authorize`;
  }

  resolveClaims(claims: OidcClaims, context?: IdentityResolutionContext): HoareIdentity {
    if (!claims.iss || claims.iss !== this.config.issuer) {
      throw new Error("OIDC issuer mismatch");
    }
    if (!claims.sub) {
      throw new Error("OIDC subject is required");
    }

    const claimTenant = typeof claims.tenant_id === "string" ? claims.tenant_id : undefined;
    if (context?.tenantId && claimTenant && context.tenantId !== claimTenant) {
      throw new Error("OIDC identity is outside the requested tenant boundary");
    }

    const roles = Array.isArray(claims.roles) ? claims.roles.filter((r): r is string => typeof r === "string") : [];
    const groups = Array.isArray(claims.groups) ? claims.groups.filter((g): g is string => typeof g === "string") : [];

    return {
      subject: claims.sub,
      tenantId: claimTenant ?? context?.tenantId,
      provider: this.id,
      providerSubject: claims.sub,
      identityType: "human",
      roles,
      attributes: {
        ...(claims.email ? { email: claims.email } : {}),
        ...(claims.name ? { name: claims.name } : {}),
        groups,
      },
      entitlements: [],
      authenticationContext: { method: "oidc" },
      auditContext: {
        correlationId: context?.correlationId,
        source: context?.source ?? this.id,
      },
    };
  }

  async resolve(input: unknown, context?: IdentityResolutionContext): Promise<HoareIdentity | null> {
    if (!input || typeof input !== "object") return null;
    return this.resolveClaims(input as OidcClaims, context);
  }
}
