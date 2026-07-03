export async function code(payload: any) {
  return {
    agent: "code",
    action: "generate",
    output: `Code scaffold generated for: ${payload?.task}`,
    payload,
  };
}
