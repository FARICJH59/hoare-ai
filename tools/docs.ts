import type { ToolPayload } from "./types";

export async function docs(payload: ToolPayload) {
  return {
    agent: "docs",
    action: "documentation",
    output: `Documentation generated for: ${payload?.component}`,
    payload,
  };
}
