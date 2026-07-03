export async function finance(payload: any) {
  return {
    agent: "finance",
    action: "ledger",
    output: `Financial model generated for: ${payload?.model}`,
    payload,
  };
}
