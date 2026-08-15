import { generateApplicationManifest } from "../../packages/identity-trust/application-manifest";

describe("HOARE application manifest generation", () => {
  it("generates runtime identity configuration without enabling disabled providers", () => {
    const manifest = generateApplicationManifest({
      applicationId: "app-1",
      tenantId: "tenant-a",
      identity: {
        providers: [
          { id: "native", enabled: true, type: "native", displayName: "HOARE Native" },
          { id: "login-gov", enabled: false, type: "oidc", displayName: "Login.gov", environment: "sandbox" },
        ],
        policy: { allowedIdentityTypes: ["human", "agent"], requiredEntitlements: ["app.read"] },
      },
    });

    expect(manifest.version).toBe(1);
    expect(manifest.applicationId).toBe("app-1");
    expect(manifest.tenantId).toBe("tenant-a");
    expect(manifest.identityTrust.providers.map((p) => p.id)).toEqual(["native"]);
    expect(manifest.identityTrust.policy?.requiredEntitlements).toContain("app.read");
  });
});
