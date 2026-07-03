export async function ml(payload: any) {
  return {
    agent: "ml",
    action: "pipeline",
    output: `ML pipeline generated for dataset: ${payload?.dataset}`,
    payload,
  };
}
