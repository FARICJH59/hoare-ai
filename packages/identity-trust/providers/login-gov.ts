import type { HoareIdentity, IdentityProvider, IdentityResolutionContext } from "../types";

export type LoginGovEnvironment = "sandbox" | "production";

export interface LoginGovConfig {
  id: "login-gov";
  enabled: boolean;
  environment: LoginGovEnvironment;
  issuer: string;
  clientId?: string;
  allowedTenantId?: string;
}

export interface LoginGovValidatedClaims {
  iss: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  verified_at?: number | null;
  acr?: string;
  amr?: string[];
}

/**
 * Optional Login.gov boundary. This adapter only consumes claims that the host
 * runtime has already validated. It never registers an application, obtains
 * credentials, performs token exchange, or enables production federation.
 */
export class LoginGovProvider implements IdentityProvider {
  readonly id = "login-gov" as const;
  readonly type = "federated" as const;

  constructor(private readonly config: LoginGovConfig) {}

  async resolve(input: unknown, context?: IdentityResolutionContext): Promise<HoareIdentity | null> {
    if (!this.config.enabled) return null;
    const claims = input as Partial<LoginGovValidatedClaims>;

    if (!claims.sub || claims.iss !== this.config.issuer) return null;
    if (this.config.allowedTenantId && context?.tenantId !== this.config.allowedTenantId) return null;

    return {
      subject: `login.gov:${claims.sub}`,
      tenantId: context?.tenantId,
      provider: this.id,
      providerSubject: claims.sub,
      identityType: "human",
      roles: ["viewer"],
      attributes: {
        ...(claims.email ? { email: claims.email } : {}),
        ...(typeof claims.email_verified === "boolean" ? { email_verified: claims.email_verified } : {}),
        ...(typeof claims.verified_at === "number" ? { verified_at: claims.verified_at } : {}),
        ...(claims.acr ? { acr: claims.acr } : {}),
        ...(claims.amr ? { amr: claims.amr } : {}),
      },
      entitlements: [],
      authenticationContext: {
        method: "login.gov",
        assuranceLevel: claims.acr,
      },
    };
  }
}

export function createLoginGovSandboxProvider(config: Omit<LoginGovConfig, "environment" | "issuer"> & { issuer?: string }): LoginGovProvider {
  return new LoginGovProvider({
    ...config,
    environment: "sandbox",
    issuer: config.issuer ?? "https://idp.int.identitysandbox.gov",
  });
}
