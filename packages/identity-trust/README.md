# HOARE Identity & Trust Plane

Phase 1 establishes a provider-agnostic identity boundary for HOARE.

## Design rules

- Upstream identity providers normalize into `HoareIdentity`.
- Application authorization must depend on the HOARE identity contract, not on a specific provider.
- Existing JWT/API-key authentication remains unchanged in Phase 1.
- Login.gov is not required, configured, or exposed by this phase.
- Provider registration is explicit so production connectors can be disabled without removing the identity architecture.
- Human, workload, agent, device, and service identities are represented separately.

## Phase 1 components

- `types.ts` — normalized identity and provider contracts.
- `broker.ts` — provider registry and resolution boundary.
- `providers/native.ts` — adapter for existing trusted HOARE auth context.
- `tests/identity-trust/broker.test.ts` — contract tests.

## Planned phases

1. Identity contract and broker (current)
2. Authorization/tenant policy integration
3. Workload, agent, device, and service identity
4. Audit/provenance enrichment
5. Builder/control-plane integration
6. Optional OIDC/SAML providers
7. Optional Login.gov sandbox connector
8. Login.gov production connector only after required external approval

No existing CI/CD or deployment configuration is modified by Phase 1.
