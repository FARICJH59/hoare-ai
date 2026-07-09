import { Tool } from "../tools";

export interface Capability {
  id: string;
  name: string;
  description: string;
  category: string;
  tool?: Tool;
  metadata?: Record<string, unknown>;
  registeredAt: number;
}

export interface CapabilityQuery {
  category?: string;
  namePattern?: string;
}

/**
 * CapabilityRegistry is a singleton registry that tracks all tools and skills
 * available within the HOARE.ai runtime. Agents and the planner use this to
 * discover capabilities at runtime.
 */
export class CapabilityRegistry {
  private static instance: CapabilityRegistry;
  private capabilities: Map<string, Capability>;

  private constructor() {
    this.capabilities = new Map();
  }

  static getInstance(): CapabilityRegistry {
    if (!CapabilityRegistry.instance) {
      CapabilityRegistry.instance = new CapabilityRegistry();
    }
    return CapabilityRegistry.instance;
  }

  /** Register a tool as a named capability. */
  registerTool(tool: Tool, category = "general"): Capability {
    const cap: Capability = {
      id: tool.name,
      name: tool.name,
      description: tool.description,
      category,
      tool,
      registeredAt: Date.now(),
    };
    this.capabilities.set(cap.id, cap);
    return cap;
  }

  /** Register a bare capability (no tool backing). */
  register(cap: Omit<Capability, "registeredAt">): Capability {
    const full: Capability = { ...cap, registeredAt: Date.now() };
    this.capabilities.set(full.id, full);
    return full;
  }

  unregister(id: string): boolean {
    return this.capabilities.delete(id);
  }

  get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  list(query?: CapabilityQuery): Capability[] {
    let results = Array.from(this.capabilities.values());
    if (query?.category) {
      results = results.filter((c) => c.category === query.category);
    }
    if (query?.namePattern) {
      const pattern = new RegExp(query.namePattern, "i");
      results = results.filter((c) => pattern.test(c.name) || pattern.test(c.description));
    }
    return results;
  }

  categories(): string[] {
    return [...new Set(Array.from(this.capabilities.values()).map((c) => c.category))];
  }

  size(): number {
    return this.capabilities.size;
  }

  toJSON(): object {
    return {
      count: this.capabilities.size,
      capabilities: Array.from(this.capabilities.values()).map(({ tool: _tool, ...rest }) => rest),
    };
  }
}
