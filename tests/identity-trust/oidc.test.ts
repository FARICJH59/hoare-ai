import { OidcIdentityProvider } from "../../packages/identity-trust/providers/oidc";

describe("Generic OIDC identity provider", () => {
  const provider = new OidcIdentityProvider({
    id: "enterprise-oidc",
    issuer: "https://id.example.test",
    clientId: "hoare-client",
    redirectUri: "https://app.example.test/auth/callback",
  });

  it("maps validated OIDC claims into HoareIdentity", async () => {
    const identity = await provider.resolve({
      iss: "https://id.example.test",
      sub: "user-123",
      email: "user@example.test",
      roles: ["operator"],
      groups: ["engineering"],
      tenant_id: "tenant-a",
    }, { source: "enterprise-oidc", correlationId: "corr-1" });

    expect(identity?.subject).toBe("user-123");
    expect(identity?.tenantId).toBe("tenant-a");
    expect(identity?.roles).toEqual(["operator"]);
    expect(identity?.attributes.groups).toEqual(["engineering"]);
  });

  it("rejects an issuer mismatch", () => {
    expect(() => provider.resolveClaims({
      iss: "https://evil.example.test",
      sub: "user-123",
    })).toThrow("issuer mismatch");
  });

  it("rejects a cross-tenant claim", () => {
    expect(() => provider.resolveClaims({
      iss: "https://id.example.test",
      sub: "user-123",
      tenant_id: "tenant-b",
    }, { tenantId: "tenant-a" })).toThrow("tenant boundary");
  });
});
