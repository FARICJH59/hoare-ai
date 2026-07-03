import type { ToolPayload } from "./types";

export async function quantum(payload: ToolPayload) {
  return {
    agent: "quantum",
    action: "circuit",
    output: `Quantum circuit generated using algorithm: ${payload?.algorithm}`,
    payload,
  };
}
