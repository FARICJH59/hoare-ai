import { createWorkloadIdentity } from "../../packages/identity-trust/workload-identity";

describe("Workload identity", () => {
  it("creates an agent identity scoped to a tenant", () => {
    const identity = createWorkloadIdentity({
      subject: "agent/shelf-scouter",
      tenantId: "tenant-a",
      type: "agent",
      entitlements: ["inventory.read"],
    });

    expect(identity.identityType).toBe("agent");
    expect(identity.tenantId).toBe("tenant-a");
    expect(identity.entitlements).toContain("inventory.read");
    expect(identity.roles).toEqual(["service"]);
  });

  it("supports device and service identities", () => {
    expect(createWorkloadIdentity({ subject: "device/pi-01", tenantId: "tenant-a", type: "device" }).identityType).toBe("device");
    expect(createWorkloadIdentity({ subject: "svc/runtime", tenantId: "tenant-a", type: "service" }).identityType).toBe("service");
  });

  it("rejects unscoped workloads", () => {
    expect(() => createWorkloadIdentity({ subject: "agent/x", tenantId: "", type: "agent" })).toThrow();
  });
});
