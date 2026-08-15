import { createLoginGovSandboxProvider, LoginGovProvider } from "../../packages/identity-trust/providers/login-gov";

describe("Login.gov optional provider boundary", () => {
  it("maps validated sandbox claims into a human HoareIdentity", async () => {
    const provider = createLoginGovSandboxProvider({
      id: "login-gov",
      enabled: true,
      allowedTenantId: "tenant-a",
    });

    const identity = await provider.resolve({
      iss: "https://idp.int.identitysandbox.gov",
      sub: "sandbox-user-1",
      email: "user@example.gov",
      email_verified: true,
      acr: "urn:acr.login.gov:auth-only",
    }, { tenantId: "tenant-a", correlationId: "corr-1" });

    expect(identity?.provider).toBe("login-gov");
    expect(identity?.identityType).toBe("human");
    expect(identity?.tenantId).toBe("tenant-a");
    expect(identity?.providerSubject).toBe("sandbox-user-1");
  });

  it("is inert when disabled", async () => {
    const provider = createLoginGovSandboxProvider({ id: "login-gov", enabled: false });
    await expect(provider.resolve({ iss: "https://idp.int.identitysandbox.gov", sub: "x" })).resolves.toBeNull();
  });

  it("rejects a production issuer when configured for sandbox", async () => {
    const provider = createLoginGovSandboxProvider({ id: "login-gov", enabled: true });
    await expect(provider.resolve({
      iss: "https://secure.login.gov",
      sub: "production-user",
    })).resolves.toBeNull();
  });

  it("enforces the configured tenant boundary", async () => {
    const provider = new LoginGovProvider({
      id: "login-gov",
      enabled: true,
      environment: "sandbox",
      issuer: "https://idp.int.identitysandbox.gov",
      allowedTenantId: "tenant-a",
    });

    await expect(provider.resolve({
      iss: "https://idp.int.identitysandbox.gov",
      sub: "user-1",
    }, { tenantId: "tenant-b" })).resolves.toBeNull();
  });
});
