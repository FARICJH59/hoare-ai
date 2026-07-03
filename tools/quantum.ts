export async function quantum(payload: any) {
  return {
    agent: "quantum",
    action: "circuit",
    output: `Quantum circuit generated using algorithm: ${payload?.algorithm}`,
    payload,
  };
}
