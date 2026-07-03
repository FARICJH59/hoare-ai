import { v4 as uuidv4 } from "uuid";
import { AgentMemory } from "./memory";
import { Tool } from "../tools";

export interface AgentConfig {
  id?: string;
  name: string;
  description?: string;
  tools?: Tool[];
  systemPrompt?: string;
  maxIterations?: number;
}

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  toolResult?: unknown;
  timestamp: number;
}

export interface AgentResult {
  agentId: string;
  response: string;
  iterations: number;
  toolsUsed: string[];
  messages: AgentMessage[];
}

export class Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systemPrompt: string;
  readonly maxIterations: number;
  private tools: Map<string, Tool>;
  private memory: AgentMemory;

  constructor(config: AgentConfig) {
    this.id = config.id ?? uuidv4();
    this.name = config.name;
    this.description = config.description ?? "";
    this.systemPrompt = config.systemPrompt ?? "You are a helpful AI agent.";
    this.maxIterations = config.maxIterations ?? 10;
    this.tools = new Map((config.tools ?? []).map((t) => [t.name, t]));
    this.memory = new AgentMemory(this.id);
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getMemory(): AgentMemory {
    return this.memory;
  }

  async run(userMessage: string): Promise<AgentResult> {
    const messages: AgentMessage[] = [
      { role: "system", content: this.systemPrompt, timestamp: Date.now() },
      { role: "user", content: userMessage, timestamp: Date.now() },
    ];

    const toolsUsed: string[] = [];
    let iterations = 0;
    let response = "";

    this.memory.addEntry({ role: "user", content: userMessage });

    while (iterations < this.maxIterations) {
      iterations++;

      const toolCall = this.detectToolCall(userMessage);
      if (toolCall) {
        const tool = this.tools.get(toolCall.name);
        if (tool) {
          const toolResult = await tool.execute(toolCall.params);
          toolsUsed.push(toolCall.name);
          messages.push({
            role: "tool",
            content: JSON.stringify(toolResult),
            toolName: toolCall.name,
            toolResult,
            timestamp: Date.now(),
          });
          response = this.formatToolResponse(toolCall.name, toolResult);
        } else {
          response = `Tool "${toolCall.name}" is not registered on this agent.`;
        }
        break;
      }

      response = `Agent "${this.name}" processed: ${userMessage}`;
      break;
    }

    messages.push({ role: "assistant", content: response, timestamp: Date.now() });
    this.memory.addEntry({ role: "assistant", content: response });

    return { agentId: this.id, response, iterations, toolsUsed, messages };
  }

  private detectToolCall(message: string): { name: string; params: Record<string, unknown> } | null {
    const match = message.match(/use_tool:(\w[\w-]*)(?:\((\{.*?\})\))?/);
    if (!match) return null;
    const name = match[1];
    let params: Record<string, unknown> = {};
    if (match[2]) {
      try {
        params = JSON.parse(match[2]);
      } catch {
        params = {};
      }
    }
    return { name, params };
  }

  private formatToolResponse(toolName: string, result: unknown): string {
    return `Tool "${toolName}" returned: ${JSON.stringify(result)}`;
  }

  toJSON(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      tools: this.listTools().map((t) => t.name),
      maxIterations: this.maxIterations,
    };
  }
}
