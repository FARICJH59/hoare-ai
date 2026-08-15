import { createIdentityAuditEvent, MemoryIdentityAuditSink } from "../../packages/identity-trust/audit";
import type { HoareIdentity } from "../../packages/identity-trust/types";

const identity: HoareIdentity = {
  subject: "agent-1",
  tenantId: "tenant-a",
  provider: "hoare-workload",
  identityType: "agent",
  roles: ["service"],
  attributes: {},
  entitlements: ["inventory.read"],
  auditContext: { correlationId: "corr-1", source: "runtime" },
};

describe("Identity audit", () => {
  it("creates a structured authorization event", () => {
    const event = createIdentityAuditEvent(identity, {
      eventType: "authorization.allowed",
      action: "inventory.read",
      resource: "shelf/42",
      decision: "allow",
    });

    expect(event.subject).toBe("agent-1");
    expect(event.tenantId).toBe("tenant-a");
    expect(event.identityType).toBe("agent");
    expect(event.correlationId).toBe("corr-1");
    expect(event.decision).toBe("allow");
    expect(event.timestamp).toBeTruthy();
  });

  it("stores immutable event snapshots in the memory sink", () => {
    const sink = new MemoryIdentityAuditSink();
    sink.write(createIdentityAuditEvent(identity, {
      eventType: "authorization.denied",
      action: "inventory.write",
      resource: "shelf/42",
      decision: "deny",
      reason: "Missing entitlement",
    }));

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0].reason).toBe("Missing entitlement");
  });
});
