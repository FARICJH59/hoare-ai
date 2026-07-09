import { Agent, AgentResult } from "./agent";

export type RoutingStrategy = "round-robin" | "least-busy" | "capability" | "first-match";

export interface RouteRule {
  pattern: RegExp | string;
  agentId?: string;
  capability?: string;
}

export interface RouterConfig {
  strategy?: RoutingStrategy;
  rules?: RouteRule[];
  fallbackAgentId?: string;
}

export class AgentRouter {
  private agents: Map<string, Agent>;
  private strategy: RoutingStrategy;
  private rules: RouteRule[];
  private fallbackAgentId: string | undefined;
  private roundRobinIndex: number;
  private callCounts: Map<string, number>;

  constructor(config: RouterConfig = {}) {
    this.agents = new Map();
    this.strategy = config.strategy ?? "round-robin";
    this.rules = config.rules ?? [];
    this.fallbackAgentId = config.fallbackAgentId;
    this.roundRobinIndex = 0;
    this.callCounts = new Map();
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.callCounts.set(agent.id, 0);
  }

  removeAgent(agentId: string): boolean {
    this.callCounts.delete(agentId);
    return this.agents.delete(agentId);
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  addRule(rule: RouteRule): void {
    this.rules.push(rule);
  }

  async route(message: string): Promise<AgentResult> {
    const agent = this.selectAgent(message);
    if (!agent) {
      throw new Error("No agent available to handle the request.");
    }
    const count = (this.callCounts.get(agent.id) ?? 0) + 1;
    this.callCounts.set(agent.id, count);
    return agent.run(message);
  }

  private selectAgent(message: string): Agent | undefined {
    if (this.agents.size === 0) return undefined;

    // Rule-based override (always checked first regardless of strategy)
    for (const rule of this.rules) {
      const pattern =
        typeof rule.pattern === "string" ? new RegExp(rule.pattern, "i") : rule.pattern;
      if (pattern.test(message)) {
        if (rule.agentId) {
          const byId = this.agents.get(rule.agentId);
          if (byId) return byId;
        }
        if (rule.capability) {
          const byCapability = this.findByCapability(rule.capability);
          if (byCapability) return byCapability;
        }
      }
    }

    const ids = Array.from(this.agents.keys());

    switch (this.strategy) {
      case "round-robin": {
        const idx = this.roundRobinIndex % ids.length;
        this.roundRobinIndex++;
        return this.agents.get(ids[idx]);
      }
      case "least-busy": {
        const leastBusy = ids.reduce((best, id) =>
          (this.callCounts.get(id) ?? 0) < (this.callCounts.get(best) ?? 0) ? id : best
        );
        return this.agents.get(leastBusy);
      }
      case "capability":
        return this.findByCapability(message);
      case "first-match":
      default:
        return this.agents.get(ids[0]);
    }
  }

  private findByCapability(capability: string): Agent | undefined {
    for (const agent of this.agents.values()) {
      const toolNames = agent.listTools().map((t) => t.name.toLowerCase());
      if (toolNames.some((n) => n.includes(capability.toLowerCase()))) {
        return agent;
      }
    }
    if (this.fallbackAgentId) {
      return this.agents.get(this.fallbackAgentId);
    }
    return Array.from(this.agents.values())[0];
  }

  getCallCounts(): Record<string, number> {
    return Object.fromEntries(this.callCounts);
  }
}
