import type {
  HoareIdentity,
  IdentityProvider,
  IdentityResolutionContext,
} from "../types";

export interface NativeIdentityInput {
  subject: string;
  identityType?: HoareIdentity["identityType"];
  roles?: string[];
  attributes?: Record<string, string | number | boolean | string[]>;
  entitlements?: string[];
}

/**
 * Phase-1 native provider for existing HOARE JWT/API-key identities.
 * This adapter does not validate credentials; existing auth middleware remains
 * responsible for authentication. It only normalizes trusted auth context.
 */
export class NativeHoareProvider implements IdentityProvider {
  readonly id = "hoare-native";
  readonly type = "federated" as const;

  async resolve(
    input: unknown,
    context?: IdentityResolutionContext
  ): Promise<HoareIdentity | null> {
    if (!input || typeof input !== "object") return null;

    const value = input as Partial<NativeIdentityInput>;
    if (typeof value.subject !== "string" || value.subject.length === 0) {
      return null;
    }

    return {
      subject: value.subject,
      tenantId: context?.tenantId,
      provider: this.id,
      providerSubject: value.subject,
      identityType: value.identityType ?? "human",
      roles: value.roles ?? [],
      attributes: value.attributes ?? {},
      entitlements: value.entitlements ?? [],
      auditContext: {
        correlationId: context?.correlationId,
        source: context?.source ?? "hoare-native",
      },
    };
  }
}
