import { createIdentityTrustSpec } from "../../packages/identity-trust/control-plane";

describe("Builder identity trust specification", () => {
  it("creates a declarative tenant-scoped identity specification", () => {
    const spec = createIdentityTrustSpec({
      applicationId: "app-1",
      tenantId: "tenant-a",
      identity: {
        providers: [
          {
            id: "native",
            enabled: true,
            type: "native",
            displayName: "HOARE Native",
          },
          {
            id: "login-gov",
            enabled: false,
            type: "oidc",
            displayName: "Login.gov",
            environment: "sandbox",
          },
        ],
        policy: {
          allowedIdentityTypes: ["human", "agent", "service"],
          requiredEntitlements: ["app.read"],
        },
      },
    });

    expect(spec.tenantId).toBe("tenant-a");
    expect(spec.identity.providers.find((p) => p.id === "login-gov")?.enabled).toBe(false);
    expect(spec.identity.policy?.allowedIdentityTypes).toContain("agent");
  });

  it("rejects a spec with no enabled provider", () => {
    expect(() => createIdentityTrustSpec({
      applicationId: "app-1",
      tenantId: "tenant-a",
      identity: { providers: [] },
    })).toThrow("at least one enabled provider");
  });
});
