const deployments: Record<string, unknown>[] = [];
export function listDeployments() { return { namespace: "usecases.deployment.registry", count: deployments.length, items: deployments }; }
export function saveDeployment(item: Record<string, unknown>) { deployments.push(item); return item; }
