import { CapabilityRegistry } from "./capability-registry";

export type IntentCategory =
  | "quantum"
  | "finance"
  | "robotics"
  | "ml"
  | "query"
  | "system"
  | "unknown";

export interface IntentClassification {
  category: IntentCategory;
  confidence: number;
  entities: string[];
  suggestedCapabilities: string[];
}

/**
 * IntentAgent receives a raw user prompt, classifies the intent, extracts
 * entities, and maps the request to available capabilities. Its output is
 * consumed by the PlannerAgent to produce an execution plan.
 */
export class IntentAgent {
  private static readonly PATTERNS: Array<{
    pattern: RegExp;
    category: IntentCategory;
    keywords: string[];
  }> = [
    {
      pattern: /quantum|qubit|circuit|vqe|eigensolver|gate|superposition|entangl/i,
      category: "quantum",
      keywords: ["quantum-simulate", "quantum-optimize"],
    },
    {
      pattern: /stock|market|portfolio|risk|sharpe|var|finance|trading|invest/i,
      category: "finance",
      keywords: ["finance-market-data", "finance-portfolio-analysis", "finance-risk-analysis"],
    },
    {
      pattern: /robot|arm|trajectory|joint|gripper|actuator|move|grasp|navigate/i,
      category: "robotics",
      keywords: ["robotics-status", "robotics-command", "robotics-trajectory-plan"],
    },
    {
      pattern: /train|inference|model|embedding|classify|predict|neural|ml|machine learning/i,
      category: "ml",
      keywords: ["ml-train", "ml-inference", "ml-embedding"],
    },
    {
      pattern: /status|health|list|show|get|describe|what|how many/i,
      category: "query",
      keywords: [],
    },
    {
      pattern: /system|config|setting|restart|shutdown|deploy/i,
      category: "system",
      keywords: [],
    },
  ];

  private registry: CapabilityRegistry;

  constructor(registry?: CapabilityRegistry) {
    this.registry = registry ?? CapabilityRegistry.getInstance();
  }

  /**
   * Classify intent from a natural-language prompt.
   */
  classify(prompt: string): IntentClassification {
    const lower = prompt.toLowerCase();
    let bestCategory: IntentCategory = "unknown";
    let bestScore = 0;
    let suggestedKeywords: string[] = [];

    for (const { pattern, category, keywords } of IntentAgent.PATTERNS) {
      const matches = (lower.match(pattern) ?? []).length;
      if (matches > bestScore) {
        bestScore = matches;
        bestCategory = category;
        suggestedKeywords = keywords;
      }
    }

    const confidence = bestScore > 0 ? Math.min(0.4 + bestScore * 0.2, 1.0) : 0.1;

    // Resolve suggested capabilities against the registry
    const available = this.registry.list().map((c) => c.id);
    const suggestedCapabilities = [
      ...new Set([
        ...suggestedKeywords.filter((k) => available.includes(k)),
        ...available.filter((id) => lower.includes(id.split("-")[0])),
      ]),
    ];

    // Naive entity extraction: quoted terms and UPPERCASE words
    const entities = [
      ...(prompt.match(/"([^"]+)"/g) ?? []).map((m) => m.replace(/"/g, "")),
      ...(prompt.match(/\b[A-Z]{2,}\b/g) ?? []),
    ];

    return { category: bestCategory, confidence, entities, suggestedCapabilities };
  }
}
