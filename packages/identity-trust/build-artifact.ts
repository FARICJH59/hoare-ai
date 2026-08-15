import type { HoareApplicationTrustSpec } from "./control-plane";
import { scaffoldIdentity, type IdentityScaffold } from "./scaffold";

export interface IdentityBuildArtifact {
  schemaVersion: "1";
  kind: "hoare.identity-trust";
  applicationId: string;
  tenantId: string;
  files: IdentityScaffold["generatedFiles"];
}

/**
 * Build-system adapter. It produces a portable artifact for an existing
 * application builder to consume; it does not write to disk, deploy, or
 * modify CI/CD.
 */
export function createIdentityBuildArtifact(
  spec: HoareApplicationTrustSpec,
): IdentityBuildArtifact {
  const scaffold = scaffoldIdentity(spec);

  return {
    schemaVersion: "1",
    kind: "hoare.identity-trust",
    applicationId: spec.applicationId,
    tenantId: spec.tenantId,
    files: scaffold.generatedFiles,
  };
}
