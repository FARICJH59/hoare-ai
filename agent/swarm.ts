import { Agent, AgentResult } from "./agent";
import { AgentRouter } from "./router";

export type SwarmMode = "parallel" | "sequential" | "vote" | "pipeline";

export interface SwarmConfig {
  name?: string;
  mode?: SwarmMode;
  router?: AgentRouter;
}

export interface SwarmResult {
  swarmName: string;
  mode: SwarmMode;
  results: AgentResult[];
  consensus?: string;
  duration: number;
}

export class AgentSwarm {
  readonly name: string;
  readonly mode: SwarmMode;
  private agents: Agent[];
  private router: AgentRouter | undefined;

  constructor(config: SwarmConfig = {}) {
    this.name = config.name ?? "default-swarm";
    this.mode = config.mode ?? "parallel";
    this.agents = [];
    this.router = config.router;
  }

  addAgent(agent: Agent): void {
    this.agents.push(agent);
    if (this.router) {
      this.router.registerAgent(agent);
    }
  }

  removeAgent(agentId: string): void {
    this.agents = this.agents.filter((a) => a.id !== agentId);
    if (this.router) {
      this.router.removeAgent(agentId);
    }
  }

  listAgents(): Agent[] {
    return [...this.agents];
  }

  async run(message: string): Promise<SwarmResult> {
    const start = Date.now();

    if (this.agents.length === 0) {
      throw new Error("Swarm has no agents registered.");
    }

    let results: AgentResult[];

    switch (this.mode) {
      case "parallel":
        results = await this.runParallel(message);
        break;
      case "sequential":
        results = await this.runSequential(message);
        break;
      case "vote":
        results = await this.runVote(message);
        break;
      case "pipeline":
        results = await this.runPipeline(message);
        break;
      default:
        results = await this.runParallel(message);
    }

    const consensus = this.buildConsensus(results);
    const duration = Date.now() - start;

    return { swarmName: this.name, mode: this.mode, results, consensus, duration };
  }

  private async runParallel(message: string): Promise<AgentResult[]> {
    return Promise.all(this.agents.map((a) => a.run(message)));
  }

  private async runSequential(message: string): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let currentMessage = message;
    for (const agent of this.agents) {
      const result = await agent.run(currentMessage);
      results.push(result);
      currentMessage = result.response;
    }
    return results;
  }

  private async runVote(message: string): Promise<AgentResult[]> {
    const results = await this.runParallel(message);
    return results;
  }

  private async runPipeline(message: string): Promise<AgentResult[]> {
    return this.runSequential(message);
  }

  private buildConsensus(results: AgentResult[]): string {
    if (results.length === 0) return "";
    if (results.length === 1) return results[0].response;

    // For vote mode: pick the most common response; otherwise combine all
    if (this.mode === "vote") {
      const freq = new Map<string, number>();
      for (const r of results) {
        freq.set(r.response, (freq.get(r.response) ?? 0) + 1);
      }
      let best = "";
      let bestCount = 0;
      for (const [resp, count] of freq) {
        if (count > bestCount) {
          best = resp;
          bestCount = count;
        }
      }
      return best;
    }

    // For sequential / pipeline: last agent's response is final
    if (this.mode === "sequential" || this.mode === "pipeline") {
      return results[results.length - 1].response;
    }

    // Parallel: concatenate all responses
    return results.map((r, i) => `[Agent ${i + 1}] ${r.response}`).join("\n");
  }

  toJSON(): object {
    return {
      name: this.name,
      mode: this.mode,
      agents: this.agents.map((a) => a.toJSON()),
    };
  }
}
