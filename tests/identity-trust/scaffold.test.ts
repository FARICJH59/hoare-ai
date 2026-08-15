import { scaffoldIdentity } from "../../packages/identity-trust/scaffold";

describe("Identity application scaffold", () => {
  it("generates deterministic credential-free application configuration", () => {
    const result = scaffoldIdentity({
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

    expect(result.manifestPath).toBe(".hoare/identity-trust.json");
    expect(result.generatedFiles).toHaveLength(1);
    expect(result.generatedFiles[0].path).toBe(result.manifestPath);
    expect(result.generatedFiles[0].content).toContain('"applicationId": "app-1"');
    expect(result.generatedFiles[0].content).toContain('"tenantId": "tenant-a"');
    expect(result.generatedFiles[0].content).not.toContain("client_secret");
  });
});
