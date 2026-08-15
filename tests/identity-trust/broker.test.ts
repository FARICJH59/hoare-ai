import { IdentityBroker } from "../../packages/identity-trust/broker";
import { NativeHoareProvider } from "../../packages/identity-trust/providers/native";

describe("HOARE Identity & Trust Plane - Phase 1", () => {
  it("registers and resolves the native provider", async () => {
    const broker = new IdentityBroker();
    broker.register(new NativeHoareProvider());

    expect(broker.listProviders()).toEqual(["hoare-native"]);

    await expect(
      broker.resolve(
        "hoare-native",
        { subject: "user-123", roles: ["admin"] },
        { tenantId: "tenant-a", correlationId: "corr-1" }
      )
    ).resolves.toMatchObject({
      subject: "user-123",
      tenantId: "tenant-a",
      provider: "hoare-native",
      roles: ["admin"],
      identityType: "human",
    });
  });

  it("rejects duplicate provider registration", () => {
    const broker = new IdentityBroker();
    broker.register(new NativeHoareProvider());
    expect(() => broker.register(new NativeHoareProvider())).toThrow(
      "Identity provider already registered: hoare-native"
    );
  });

  it("fails closed for an unknown provider", async () => {
    const broker = new IdentityBroker();
    await expect(broker.resolve("missing", {})).rejects.toThrow(
      "Unknown identity provider: missing"
    );
  });

  it("returns null for malformed native identity input", async () => {
    const provider = new NativeHoareProvider();
    await expect(provider.resolve({ roles: ["admin"] })).resolves.toBeNull();
  });
});
