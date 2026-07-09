import type { ToolPayload } from "./types";

export async function ml(payload: ToolPayload) {
  return {
    agent: "ml",
    action: "pipeline",
    output: `ML pipeline generated for dataset: ${payload?.dataset}`,
    payload,
  };
}
