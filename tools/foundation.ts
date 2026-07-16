import { Tool } from "./index";

function text(params: Record<string, unknown>): string {
  return String(params.prompt ?? params.input ?? "").trim();
}

function routeModel(task: string, params: Record<string, unknown>): string {
  if (params.model) return String(params.model);
  if (task.includes("code")) return "hoare-code-large";
  if (task.includes("embed")) return "hoare-embed-v1";
  return "hoare-reasoning-large";
}

function usage(input: string): { inputTokens: number; outputTokens: number } {
  return { inputTokens: Math.max(1, Math.ceil(input.length / 4)), outputTokens: 64 };
}

export const foundationGenerateTextTool: Tool = {
  name: "foundation.generateText",
  description: "Generate governed text through the foundational model orchestration layer.",
  async execute(params) {
    const input = text(params);
    return { model: routeModel("generateText", params), output: input ? `Generated: ${input}` : "Generated governed response", usage: usage(input) };
  },
};

export const foundationGenerateCodeTool: Tool = {
  name: "foundation.generateCode",
  description: "Generate governed code through model routing.",
  async execute(params) {
    const input = text(params);
    return { model: routeModel("generateCode", params), language: String(params.language ?? "typescript"), output: `// Generated code plan\n// ${input}`, usage: usage(input) };
  },
};

export const foundationEmbedTool: Tool = {
  name: "foundation.embed",
  description: "Generate governed embeddings through the foundation namespace.",
  async execute(params) {
    const input = text(params);
    return { model: routeModel("embed", params), dimensions: 16, embedding: Array.from({ length: 16 }, (_, index) => Math.sin((index + 1) * input.length)) };
  },
};

export const foundationTools: Tool[] = [foundationGenerateTextTool, foundationGenerateCodeTool, foundationEmbedTool];
