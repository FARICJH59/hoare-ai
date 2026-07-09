import * as Tools from "../tools";
import type { ToolHandler, ToolPayload, ToolResult } from "../tools/types";

export type RouteError = {
  error: string;
  kind: string;
};

export type RouteResult = ToolResult | RouteError;

export async function routeTask(kind: string, payload: ToolPayload): Promise<RouteResult> {
  const normalizedKind = kind.toLowerCase();
  const tool = (Tools as Record<string, ToolHandler | unknown>)[normalizedKind];

  if (typeof tool === "function") {
    return await tool(payload);
  }

  return {
    error: `Unknown task type: ${kind}`,
    kind,
  };
}
