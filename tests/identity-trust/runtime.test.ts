import { materializeIdentityRuntime } from "../../packages/identity-trust/runtime";
import type { HoareApplicationTrustSpec } from "../../packages/identity-trust/control-plane";
import type { IdentityProvider } from "../../packages/identity-trust/types";

const spec: HoareApplicationTrustSpec = {
  applicationId: "app-1",
  tenantId: "tenant-a",
  identity: {
    providers: [
      { id: "native", enabled: true, type: "native", displayName: "HOARE Native" },
      { id: "login-gov", enabled: false, type: "oidc", displayName: "Login.gov", environment: "sandbox" },
    ],
  },
};

const native: IdentityProvider = {
  id: "native",
  type: "human",
  resolve: async () => null,
};

describe("Identity runtime projection", () => {
  it("materializes only enabled and available providers", () => {
    expect(materializeIdentityRuntime(spec, [native])).toEqual({
      applicationId: "app-1",
      tenantId: "tenant-a",
      enabledProviders: ["native"],
    });
  });

  it("fails closed when an enabled provider is unavailable", () => {
    const enabledLoginGov = {
      ...spec,
      identity: {
        providers: [
          { id: "login-gov", enabled: true, type: "oidc" as const, displayName: "Login.gov", environment: "sandbox" as const },
        ],
      },
    };

    expect(() => materializeIdentityRuntime(enabledLoginGov, [native])).toThrow("unavailable");
  });
});
