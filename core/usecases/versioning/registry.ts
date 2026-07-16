const versions: Record<string, unknown>[] = [];
export function listVersions() { return { namespace: "usecases.versioning.registry", count: versions.length, items: versions }; }
export function saveVersion(version: Record<string, unknown>) { versions.push(version); return version; }
