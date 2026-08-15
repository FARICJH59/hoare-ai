import { SamlIdentityProvider } from "../../packages/identity-trust/providers/saml";

describe("SAML identity provider", () => {
  it("maps validated SAML claims into a tenant-scoped human identity", () => {
    const provider = new SamlIdentityProvider({
      id: "enterprise-saml",
      displayName: "Enterprise SAML",
    });

    const identity = provider.resolveClaims({
      issuer: "https://idp.example.test",
      subject: "user-123",
      email: "user@example.test",
      groups: ["operators"],
      tenantId: "tenant-a",
      authenticationMethod: "saml",
      assuranceLevel: "high",
    }, { correlationId: "corr-1", source: "saml-test" });

    expect(identity.identityType).toBe("human");
    expect(identity.tenantId).toBe("tenant-a");
    expect(identity.provider).toBe("enterprise-saml");
    expect(identity.attributes.groups).toEqual(["operators"]);
    expect(identity.authenticationContext?.assuranceLevel).toBe("high");
  });

  it("rejects an unscoped SAML identity", () => {
    const provider = new SamlIdentityProvider({ id: "enterprise-saml", displayName: "Enterprise SAML" });
    expect(() => provider.resolveClaims({ issuer: "https://idp.example.test", subject: "user-123" }))
      .toThrow("explicit tenant boundary");
  });
});
