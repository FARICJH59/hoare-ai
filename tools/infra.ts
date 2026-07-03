import type { ToolPayload } from "./types";

export async function infra(payload: ToolPayload) {
  return {
    agent: "infra",
    action: "provision",
    output: `Infrastructure provisioned for: ${payload?.resource}`,
    payload,
  };
}
