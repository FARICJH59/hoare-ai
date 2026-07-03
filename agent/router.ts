import * as Tools from "../tools";
import type { ToolHandler, ToolPayload } from "../tools/types";

export async function routeTask(kind: string, payload: ToolPayload) {
  const normalizedKind = kind.toLowerCase();
  const tool = (Tools as Record<string, ToolHandler | unknown>)[normalizedKind];

  if (typeof tool === "function") {
    return await tool(payload);
  }

  return { error: `Unknown task type: ${kind}` };
}
