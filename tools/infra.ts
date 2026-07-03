export async function infra(payload: any) {
  return {
    agent: "infra",
    action: "provision",
    output: `Infrastructure provisioned for: ${payload?.resource}`,
    payload,
  };
}
