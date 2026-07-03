export async function saas(payload: any) {
  return {
    agent: "saas",
    action: "dashboard",
    output: `SaaS CRUD dashboard generated for: ${payload?.entity}`,
    payload,
  };
}
