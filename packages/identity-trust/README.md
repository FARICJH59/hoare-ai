# HOARE Identity & Trust Plane

The Identity & Trust Plane provides a provider-agnostic boundary between authentication sources and HOARE authorization, tenancy, workloads, agents, devices, services, audit, builder configuration, and application scaffolding.

## Design rules

- Upstream identity providers normalize into `HoareIdentity`.
- Application authorization depends on the HOARE identity contract, not on a specific provider.
- Existing JWT/API-key authentication remains unchanged while the new plane is introduced incrementally.
- Existing RBAC role-to-permission mappings remain authoritative; the identity plane consumes them rather than duplicating them.
- Tenant mismatch is denied at the identity-trust authorization boundary.
- Human, workload, agent, device, and service identities are represented separately.
- Non-human identities require an explicit tenant and do not imply credential issuance.
- Audit events contain identity, tenant, action/resource, decision, and correlation context while avoiding credential/token material.
- Builder trust specifications are declarative; they do not provision credentials, register external providers, or alter CI/CD.
- Generated application manifests contain only runtime trust configuration; secrets and private credentials are never generated.
- Scaffolding writes only deterministic, credential-free configuration artifacts.
- Generic OIDC and SAML adapters map already-validated claims; cryptographic validation, XML parsing/signature validation, replay protection, and credential handling remain host-runtime responsibilities.
- Login.gov is optional and remains disabled unless explicitly configured and externally authorized.
- Provider registration is explicit so production connectors can be disabled without removing the identity architecture.

## Current components

- `types.ts` — normalized identity and provider contracts, including `WorkloadIdentity`.
- `broker.ts` — provider registry and resolution boundary.
- `providers/native.ts` — adapter for existing trusted HOARE auth context.
- `providers/oidc.ts` — generic OIDC claims adapter.
- `providers/saml.ts` — SAML claims adapter.
- `providers/login-gov.ts` — optional Login.gov claims boundary.
- `authorization.ts` — tenant-aware authorization boundary backed by existing HOARE RBAC.
- `workload-identity.ts` — normalized agent/device/service/workload identity construction.
- `audit.ts` — structured identity and authorization audit events plus a test sink.
- `control-plane.ts` — builder-facing declarative identity trust specification.
- `runtime.ts` — runtime provider allow-list projection.
- `application-manifest.ts` — generated application trust manifest.
- `scaffold.ts` — credential-free application scaffold generation.

## Planned phases

1. Identity contract and broker — complete
2. Authorization/tenant policy integration — complete
3. Workload, agent, device, and service identity — complete
4. Audit/provenance enrichment — initial structured event layer complete
5. Builder/control-plane integration — complete
6. Generic OIDC provider — initial claims adapter complete
7. SAML provider — initial claims adapter complete
8. Login.gov sandbox boundary — complete
9. Application-generation integration — scaffold generation complete
10. Login.gov production connector only after required external approval

No existing CI/CD or deployment configuration is modified by the Identity & Trust phases completed so far.
