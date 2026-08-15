import type { HoareIdentity, IdentityResolutionContext } from "../types";

export interface ValidatedSamlClaims {
  issuer: string;
  subject: string;
  email?: string;
  name?: string;
  groups?: string[];
  tenantId?: string;
  authenticationMethod?: string;
  authenticatedAt?: string;
  assuranceLevel?: string;
}

export interface SamlProviderOptions {
  id: string;
  displayName: string;
  defaultTenantId?: string;
}

/** Maps already-validated SAML assertions into the HOARE identity contract. */
export class SamlIdentityProvider {
  readonly id: string;
  readonly type = "federated" as const;
  readonly displayName: string;
  private readonly defaultTenantId?: string;

  constructor(options: SamlProviderOptions) {
    this.id = options.id;
    this.displayName = options.displayName;
    this.defaultTenantId = options.defaultTenantId;
  }

  resolveClaims(claims: ValidatedSamlClaims, context?: IdentityResolutionContext): HoareIdentity {
    if (!claims.issuer || !claims.subject) {
      throw new Error("Validated SAML claims require issuer and subject");
    }

    const tenantId = claims.tenantId ?? context?.tenantId ?? this.defaultTenantId;
    if (!tenantId) {
      throw new Error("SAML identity requires an explicit tenant boundary");
    }

    return {
      subject: claims.subject,
      tenantId,
      provider: this.id,
      providerSubject: claims.subject,
      identityType: "human",
      roles: ["viewer"],
      attributes: {
        issuer: claims.issuer,
        ...(claims.email ? { email: claims.email } : {}),
        ...(claims.name ? { name: claims.name } : {}),
        ...(claims.groups ? { groups: claims.groups } : {}),
      },
      entitlements: [],
      authenticationContext: {
        method: claims.authenticationMethod ?? "saml",
        authenticatedAt: claims.authenticatedAt,
        assuranceLevel: claims.assuranceLevel,
      },
      auditContext: {
        correlationId: context?.correlationId,
        source: context?.source ?? "saml",
      },
    };
  }
}
