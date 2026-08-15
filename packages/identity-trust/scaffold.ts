import type { HoareApplicationTrustSpec } from "./control-plane";
import { createIdentityTrustSpec } from "./control-plane";
import { projectIdentityRuntime } from "./runtime";
import { createApplicationManifest } from "./application-manifest";

export interface IdentityScaffold {
  manifestPath: string;
  manifest: ReturnType<typeof createApplicationManifest>;
  generatedFiles: Array<{ path: string; content: string }>;
}

/**
 * Converts a validated builder trust specification into deterministic,
 * credential-free application scaffolding. It never performs provisioning.
 */
export function scaffoldIdentity(spec: HoareApplicationTrustSpec): IdentityScaffold {
  const validated = createIdentityTrustSpec(spec);
  const runtime = projectIdentityRuntime(validated);
  const manifest = createApplicationManifest(validated, runtime);

  const manifestPath = ".hoare/identity-trust.json";
  const generatedFiles = [
    {
      path: manifestPath,
      content: `${JSON.stringify(manifest, null, 2)}\n`,
    },
  ];

  return { manifestPath, manifest, generatedFiles };
}
