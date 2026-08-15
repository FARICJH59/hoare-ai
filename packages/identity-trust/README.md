# HOARE Identity & Trust Plane

Phase 1 establishes a provider-agnostic identity boundary for HOARE. Phase 2 adds a tenant-aware authorization boundary that reuses the existing HOARE RBAC model.

## Design rules

- Upstream identity providers normalize into `HoareIdentity`.
- Application authorization depends on the HOARE identity contract, not on a specific provider.
- Existing JWT/API-key authentication remains unchanged while the new plane is introduced incrementally.
- Existing RBAC role-to-permission mappings remain authoritative; the identity plane consumes them rather than duplicating them.
- Tenant mismatch is denied at the identity-trust authorization boundary.
- Login.gov is not required, configured, or exposed by this phase.
- Provider registration is explicit so production connectors can be disabled without removing the identity architecture.
- Human, workload, agent, device, and service identities are represented separately.

## Phase 1 components

- `types.ts` — normalized identity and provider contracts.
- `broker.ts` — provider registry and resolution boundary.
- `providers/native.ts` — adapter for existing trusted HOARE auth context.
- `tests/identity-trust/broker.test.ts` — broker contract tests.

## Phase 2 components

- `authorization.ts` — tenant-aware authorization boundary backed by the existing HOARE RBAC implementation.
- `tests/identity-trust/authorization.test.ts` — authorization and tenant-isolation tests.

## Planned phases

1. Identity contract and broker — complete
2. Authorization/tenant policy integration — complete
3. Workload, agent, device, and service identity
4. Audit/provenance enrichment
5. Builder/control-plane integration
6. Optional OIDC/SAML providers
7. Optional Login.gov sandbox connector
8. Login.gov production connector only after required external approval

No existing CI/CD or deployment configuration is modified by the Identity & Trust phases completed so far.
