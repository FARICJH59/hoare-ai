import * as Tools from "../tools";

export async function routeTask(kind: string, payload: any) {
  const normalizedKind = kind.toLowerCase();
  const tool = (Tools as Record<string, unknown>)[normalizedKind];

  if (typeof tool === "function") {
    return await (tool as (payload: any) => Promise<unknown>)(payload);
  }

  return { error: `Unknown task type: ${kind}` };
}
