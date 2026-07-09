import type { ToolPayload } from "./types";

export async function code(payload: ToolPayload) {
  return {
    agent: "code",
    action: "generate",
    output: `Code scaffold generated for: ${payload?.task}`,
    payload,
  };
}
