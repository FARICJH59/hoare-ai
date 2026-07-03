import type { ToolPayload } from "./types";

export async function finance(payload: ToolPayload) {
  return {
    agent: "finance",
    action: "ledger",
    output: `Financial model generated for: ${payload?.model}`,
    payload,
  };
}
