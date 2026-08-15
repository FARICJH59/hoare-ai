import type {
  HoareIdentity,
  IdentityProvider,
  IdentityResolutionContext,
} from "./types";

/**
 * Provider registry and normalization boundary for HOARE identities.
 * Providers are intentionally isolated from application authorization logic.
 */
export class IdentityBroker {
  private readonly providers = new Map<string, IdentityProvider>();

  register(provider: IdentityProvider): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`Identity provider already registered: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  listProviders(): string[] {
    return [...this.providers.keys()].sort();
  }

  async resolve(
    providerId: string,
    input: unknown,
    context?: IdentityResolutionContext
  ): Promise<HoareIdentity | null> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown identity provider: ${providerId}`);
    }
    return provider.resolve(input, context);
  }
}
