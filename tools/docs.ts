export async function docs(payload: any) {
  return {
    agent: "docs",
    action: "documentation",
    output: `Documentation generated for: ${payload?.component}`,
    payload,
  };
}
