import { IntentAgent, IntentClassification } from "./intent";
import { CapabilityRegistry } from "./capability-registry";
import { v4 as uuidv4 } from "uuid";

export interface WorkflowStep {
  id: string;
  capabilityId: string;
  description: string;
  params: Record<string, unknown>;
  dependsOn: string[];
}

export interface ExecutionPlan {
  id: string;
  prompt: string;
  intent: IntentClassification;
  steps: WorkflowStep[];
  createdAt: number;
}

/**
 * PlannerAgent converts an IntentClassification into a concrete ExecutionPlan
 * composed of ordered WorkflowStep objects. Each step references a capability
 * from the CapabilityRegistry.
 */
export class PlannerAgent {
  private intentAgent: IntentAgent;
  private registry: CapabilityRegistry;

  constructor(registry?: CapabilityRegistry) {
    this.registry = registry ?? CapabilityRegistry.getInstance();
    this.intentAgent = new IntentAgent(this.registry);
  }

  /**
   * Produce an execution plan for the given prompt. Returns a plan even when
   * no capabilities are matched (empty steps array + fallback step).
   */
  plan(prompt: string): ExecutionPlan {
    const intent = this.intentAgent.classify(prompt);
    const steps: WorkflowStep[] = [];

    if (intent.suggestedCapabilities.length > 0) {
      for (let i = 0; i < intent.suggestedCapabilities.length; i++) {
        const capId = intent.suggestedCapabilities[i];
        const cap = this.registry.get(capId);
        if (!cap) continue;

        const step: WorkflowStep = {
          id: uuidv4(),
          capabilityId: capId,
          description: cap.description,
          params: this.deriveParams(intent, capId),
          dependsOn: i === 0 ? [] : [steps[i - 1]?.id ?? ""],
        };
        steps.push(step);
      }
    }

    if (steps.length === 0) {
      // Fallback: return a generic agent-run step
      steps.push({
        id: uuidv4(),
        capabilityId: "agent-run",
        description: "Run prompt through default agent",
        params: { prompt },
        dependsOn: [],
      });
    }

    return {
      id: uuidv4(),
      prompt,
      intent,
      steps,
      createdAt: Date.now(),
    };
  }

  private deriveParams(
    intent: IntentClassification,
    capId: string
  ): Record<string, unknown> {
    if (capId === "finance-market-data" && intent.entities.length > 0) {
      return { symbols: intent.entities };
    }
    if (capId === "ml-embedding" && intent.entities.length > 0) {
      return { text: intent.entities[0] };
    }
    return {};
  }
}
