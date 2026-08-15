import { createIdentityBuildArtifact } from "../../packages/identity-trust/build-artifact";

describe("Identity build artifact", () => {
  it("produces a portable artifact without provisioning side effects", () => {
    const artifact = createIdentityBuildArtifact({
      applicationId: "app-1",
      tenantId: "tenant-a",
      identity: {
        providers: [
          { id: "native", enabled: true, type: "native", displayName: "HOARE Native" },
          { id: "login-gov", enabled: false, type: "oidc", displayName: "Login.gov", environment: "sandbox" },
        ],
      },
    });

    expect(artifact.kind).toBe("hoare.identity-trust");
    expect(artifact.schemaVersion).toBe("1");
    expect(artifact.applicationId).toBe("app-1");
    expect(artifact.tenantId).toBe("tenant-a");
    expect(artifact.files).toHaveLength(1);
    expect(artifact.files[0].path).toBe(".hoare/identity-trust.json");
    expect(artifact.files[0].content).not.toMatch(/client_secret|private_key|access_token|refresh_token/i);
  });
});
