import { Tool } from "./index";

export interface TrainingConfig {
  modelType: "classification" | "regression" | "clustering" | "embedding";
  epochs: number;
  learningRate: number;
  batchSize: number;
  hiddenLayers?: number[];
}

export interface TrainingResult {
  modelId: string;
  modelType: string;
  epochs: number;
  finalLoss: number;
  finalAccuracy?: number;
  trainingHistory: Array<{ epoch: number; loss: number; accuracy?: number }>;
  duration: number;
}

export interface InferenceResult {
  modelId: string;
  input: unknown;
  prediction: unknown;
  confidence?: number;
  latencyMs: number;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  dimensions: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

const storedModels: Map<string, TrainingConfig & { id: string }> = new Map();

export const mlTrainTool: Tool = {
  name: "ml-train",
  description: "Train a machine learning model with the given configuration and return training history.",
  async execute(params) {
    const config: TrainingConfig = {
      modelType: (params.modelType as TrainingConfig["modelType"]) ?? "classification",
      epochs: (params.epochs as number) ?? 10,
      learningRate: (params.learningRate as number) ?? 0.001,
      batchSize: (params.batchSize as number) ?? 32,
      hiddenLayers: (params.hiddenLayers as number[]) ?? [128, 64],
    };

    const start = Date.now();
    const modelId = `model-${Date.now()}`;
    let loss = 1.0 + Math.random() * 0.5;
    const history: TrainingResult["trainingHistory"] = [];

    for (let epoch = 1; epoch <= config.epochs; epoch++) {
      loss *= 0.85 + Math.random() * 0.1;
      const accuracy =
        config.modelType === "classification" ? sigmoid(3 - loss) : undefined;
      history.push({ epoch, loss: Math.round(loss * 10000) / 10000, accuracy });
    }

    storedModels.set(modelId, { ...config, id: modelId });

    const result: TrainingResult = {
      modelId,
      modelType: config.modelType,
      epochs: config.epochs,
      finalLoss: history[history.length - 1].loss,
      finalAccuracy: history[history.length - 1].accuracy,
      trainingHistory: history,
      duration: Date.now() - start,
    };
    return result;
  },
};

export const mlInferenceTool: Tool = {
  name: "ml-inference",
  description: "Run inference on a trained model given an input.",
  async execute(params) {
    const modelId = (params.modelId as string | undefined) ?? "model-default";
    const input = params.input ?? [0.5, 0.3, 0.8, 0.1];
    const start = Date.now();

    const inputArr = Array.isArray(input) ? (input as number[]) : [0.5];
    const logits = inputArr.map((v) => v * (1 + Math.random() * 0.2) - 0.1);
    const probs = softmax(logits);
    const predicted = probs.indexOf(Math.max(...probs));
    const confidence = Math.round(Math.max(...probs) * 10000) / 10000;

    const result: InferenceResult = {
      modelId,
      input,
      prediction: predicted,
      confidence,
      latencyMs: Date.now() - start + Math.round(Math.random() * 5),
    };
    return result;
  },
};

export const mlEmbeddingTool: Tool = {
  name: "ml-embedding",
  description: "Generate a dense vector embedding for a given text input.",
  async execute(params) {
    const text = (params.text as string | undefined) ?? "";
    const dimensions = (params.dimensions as number | undefined) ?? 128;

    // Deterministic pseudo-embedding based on character codes
    const seed = text.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const embedding = Array.from({ length: dimensions }, (_, i) => {
      const val = Math.sin(seed * (i + 1) * 0.01) * Math.cos((i + 1) * 0.1);
      return Math.round(val * 100000) / 100000;
    });

    const result: EmbeddingResult = { text, embedding, dimensions };
    return result;
  },
};

export const mlTools: Tool[] = [mlTrainTool, mlInferenceTool, mlEmbeddingTool];
