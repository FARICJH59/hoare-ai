import type { ToolPayload } from "./types";

export async function repair(payload: ToolPayload) {
  return {
    agent: "repair",
    action: "fix",
    output: `Repair applied to: ${payload?.issue}`,
    payload,
  };
}
