import * as Tools from "../tools";

export async function routeTask(kind: string, payload: any) {
  const tool = (Tools as Record<string, unknown>)[kind];

  if (typeof tool === "function") {
    return await (tool as (payload: any) => Promise<unknown>)(payload);
  }

  return { error: `Unknown task type: ${kind}` };
}
