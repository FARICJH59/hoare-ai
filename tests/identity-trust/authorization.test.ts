import { authorize } from "../../packages/identity-trust/authorization";
import type { HoareIdentity } from "../../packages/identity-trust/types";

const identity: HoareIdentity = {
  subject: "user-1",
  tenantId: "tenant-a",
  provider: "native",
  providerSubject: "user-1",
  identityType: "human",
  roles: ["operator"],
  attributes: {},
  entitlements: [],
};

describe("Identity Trust authorization", () => {
  it("uses existing RBAC permissions", () => {
    expect(authorize({ identity, requiredPermission: "execute", tenantId: "tenant-a" }).allowed).toBe(true);
    expect(authorize({ identity, requiredPermission: "admin", tenantId: "tenant-a" }).allowed).toBe(false);
  });

  it("rejects a cross-tenant authorization request", () => {
    const decision = authorize({ identity, requiredPermission: "read", tenantId: "tenant-b" });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("tenant boundary");
  });

  it("allows a tenant-neutral request when the identity has permission", () => {
    expect(authorize({ identity, requiredPermission: "read" }).allowed).toBe(true);
  });
});
