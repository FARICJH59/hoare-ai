import { Agent } from "../agent/agent";
import { AgentMemory } from "../agent/memory";
import { AgentRouter } from "../agent/router";
import { AgentSwarm } from "../agent/swarm";
import { CapabilityRegistry } from "../agent/capability-registry";
import { IntentAgent } from "../agent/intent";
import { PlannerAgent } from "../agent/planner";
import { Scheduler } from "../agent/scheduler";
import { allTools } from "../tools";

// ── Agent ─────────────────────────────────────────────────────────────────────

describe("Agent", () => {
  it("creates an agent with a generated ID when none is provided", () => {
    const agent = new Agent({ name: "test-agent" });
    expect(agent.id).toBeDefined();
    expect(agent.id.length).toBeGreaterThan(0);
  });

  it("uses the provided ID", () => {
    const agent = new Agent({ id: "custom-id", name: "test-agent" });
    expect(agent.id).toBe("custom-id");
  });

  it("registers and lists tools", () => {
    const agent = new Agent({ name: "tool-agent" });
    agent.registerTool(allTools[0]);
    expect(agent.listTools()).toHaveLength(1);
    expect(agent.listTools()[0].name).toBe(allTools[0].name);
  });

  it("removes a tool", () => {
    const agent = new Agent({ name: "tool-agent", tools: allTools.slice(0, 2) });
    const removed = agent.removeTool(allTools[0].name);
    expect(removed).toBe(true);
    expect(agent.listTools()).toHaveLength(1);
  });

  it("runs and returns an AgentResult", async () => {
    const agent = new Agent({ name: "runner" });
    const result = await agent.run("Hello");
    expect(result.agentId).toBe(agent.id);
    expect(typeof result.response).toBe("string");
    expect(result.iterations).toBeGreaterThan(0);
  });

  it("invokes a tool when use_tool syntax is detected", async () => {
    const mockTool = {
      name: "mock-tool",
      description: "A mock tool.",
      execute: jest.fn().mockResolvedValue({ ok: true }),
    };
    const agent = new Agent({ name: "tool-runner", tools: [mockTool] });
    const result = await agent.run("Please use_tool:mock-tool()");
    expect(mockTool.execute).toHaveBeenCalled();
    expect(result.toolsUsed).toContain("mock-tool");
  });

  it("serialises to JSON without circular references", () => {
    const agent = new Agent({ name: "json-agent", tools: allTools.slice(0, 1) });
    expect(() => JSON.stringify(agent.toJSON())).not.toThrow();
  });
});

// ── AgentMemory ───────────────────────────────────────────────────────────────

describe("AgentMemory", () => {
  it("stores and retrieves entries", () => {
    const mem = new AgentMemory("a1");
    mem.addEntry({ role: "user", content: "hello" });
    expect(mem.getAll()).toHaveLength(1);
  });

  it("enforces maxEntries limit", () => {
    const mem = new AgentMemory("a2", 3);
    for (let i = 0; i < 5; i++) mem.addEntry({ role: "user", content: `msg ${i}` });
    expect(mem.getAll()).toHaveLength(3);
  });

  it("searches by keyword", () => {
    const mem = new AgentMemory("a3");
    mem.addEntry({ role: "user", content: "quantum circuit" });
    mem.addEntry({ role: "user", content: "finance portfolio" });
    const results = mem.search("quantum");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.content).toContain("quantum");
  });

  it("clears all entries", () => {
    const mem = new AgentMemory("a4");
    mem.addEntry({ role: "user", content: "entry" });
    mem.clear();
    expect(mem.size()).toBe(0);
  });
});

// ── AgentRouter ───────────────────────────────────────────────────────────────

describe("AgentRouter", () => {
  it("throws when no agents are registered", async () => {
    const router = new AgentRouter();
    await expect(router.route("test")).rejects.toThrow();
  });

  it("round-robin routes across agents", async () => {
    const router = new AgentRouter({ strategy: "round-robin" });
    const a1 = new Agent({ id: "r1", name: "agent-1" });
    const a2 = new Agent({ id: "r2", name: "agent-2" });
    router.registerAgent(a1);
    router.registerAgent(a2);

    const r1 = await router.route("msg");
    const r2 = await router.route("msg");
    // Both agents should have been called
    const counts = Object.values(router.getCallCounts());
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2);
    expect(r1.agentId).not.toBe(r2.agentId); // different agents
  });

  it("respects routing rules", async () => {
    const router = new AgentRouter();
    const target = new Agent({ id: "target", name: "target-agent" });
    router.registerAgent(target);
    router.addRule({ pattern: /finance/, agentId: "target" });
    const result = await router.route("check finance data");
    expect(result.agentId).toBe("target");
  });
});

// ── AgentSwarm ────────────────────────────────────────────────────────────────

describe("AgentSwarm", () => {
  it("throws when no agents are registered", async () => {
    const swarm = new AgentSwarm({ name: "empty" });
    await expect(swarm.run("test")).rejects.toThrow();
  });

  it("runs agents in parallel mode", async () => {
    const swarm = new AgentSwarm({ name: "parallel-swarm", mode: "parallel" });
    swarm.addAgent(new Agent({ name: "a1" }));
    swarm.addAgent(new Agent({ name: "a2" }));
    const result = await swarm.run("Hello");
    expect(result.results).toHaveLength(2);
    expect(result.mode).toBe("parallel");
  });

  it("runs agents in sequential mode and chains messages", async () => {
    const swarm = new AgentSwarm({ name: "seq-swarm", mode: "sequential" });
    swarm.addAgent(new Agent({ name: "s1" }));
    swarm.addAgent(new Agent({ name: "s2" }));
    const result = await swarm.run("Start");
    expect(result.results).toHaveLength(2);
    expect(result.consensus).toBe(result.results[1].response);
  });

  it("vote mode builds consensus from most common response", async () => {
    const swarm = new AgentSwarm({ name: "vote-swarm", mode: "vote" });
    // Add the same agent 3 times — they'll all return identical responses
    const agent = new Agent({ name: "voter" });
    swarm.addAgent(agent);
    swarm.addAgent(new Agent({ name: "voter-2" }));
    swarm.addAgent(new Agent({ name: "voter-3" }));
    const result = await swarm.run("Vote");
    expect(typeof result.consensus).toBe("string");
  });
});

// ── CapabilityRegistry ────────────────────────────────────────────────────────

describe("CapabilityRegistry", () => {
  beforeEach(() => {
    // Reset singleton for test isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CapabilityRegistry as any).instance = undefined;
  });

  it("returns a singleton", () => {
    const r1 = CapabilityRegistry.getInstance();
    const r2 = CapabilityRegistry.getInstance();
    expect(r1).toBe(r2);
  });

  it("registers tools and retrieves them", () => {
    const reg = CapabilityRegistry.getInstance();
    reg.registerTool(allTools[0], "quantum");
    const cap = reg.get(allTools[0].name);
    expect(cap).toBeDefined();
    expect(cap?.category).toBe("quantum");
  });

  it("lists capabilities by category", () => {
    const reg = CapabilityRegistry.getInstance();
    reg.registerTool(allTools[0], "quantum");
    reg.registerTool(allTools[1], "finance");
    const quantum = reg.list({ category: "quantum" });
    expect(quantum.every((c) => c.category === "quantum")).toBe(true);
  });

  it("unregisters capabilities", () => {
    const reg = CapabilityRegistry.getInstance();
    reg.registerTool(allTools[0]);
    const removed = reg.unregister(allTools[0].name);
    expect(removed).toBe(true);
    expect(reg.get(allTools[0].name)).toBeUndefined();
  });
});

// ── IntentAgent ───────────────────────────────────────────────────────────────

describe("IntentAgent", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CapabilityRegistry as any).instance = undefined;
    const reg = CapabilityRegistry.getInstance();
    allTools.forEach((t) => reg.registerTool(t));
  });

  it("classifies a quantum prompt correctly", () => {
    const agent = new IntentAgent();
    const result = agent.classify("Simulate a quantum circuit with H and CNOT gates");
    expect(result.category).toBe("quantum");
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("classifies a finance prompt correctly", () => {
    const agent = new IntentAgent();
    const result = agent.classify("Analyse my portfolio risk and Sharpe ratio");
    expect(result.category).toBe("finance");
  });

  it("extracts quoted entities", () => {
    const agent = new IntentAgent();
    const result = agent.classify('Get market data for "AAPL" and "GOOG"');
    expect(result.entities).toContain("AAPL");
    expect(result.entities).toContain("GOOG");
  });

  it("returns unknown for unrecognised prompts", () => {
    const agent = new IntentAgent();
    const result = agent.classify("zzz nonsense gibberish xxxxxxxxxxx");
    expect(result.category).toBe("unknown");
  });
});

// ── PlannerAgent ──────────────────────────────────────────────────────────────

describe("PlannerAgent", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CapabilityRegistry as any).instance = undefined;
    const reg = CapabilityRegistry.getInstance();
    allTools.forEach((t) => reg.registerTool(t));
  });

  it("produces an ExecutionPlan with at least one step", () => {
    const planner = new PlannerAgent();
    const plan = planner.plan("Run a quantum circuit simulation");
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.id).toBeDefined();
  });

  it("produces a fallback step for unknown intent", () => {
    const planner = new PlannerAgent();
    const plan = planner.plan("zzz nonsense gibberish");
    const fallback = plan.steps.find((s) => s.capabilityId === "agent-run");
    expect(fallback).toBeDefined();
  });
});

// ── Scheduler ─────────────────────────────────────────────────────────────────

describe("Scheduler", () => {
  it("schedules and executes a one-shot job", async () => {
    const scheduler = new Scheduler(50);
    const executed: boolean[] = [];
    scheduler.schedule({
      name: "one-shot",
      frequency: "once",
      runAt: Date.now(),
      handler: async () => {
        executed.push(true);
      },
    });
    scheduler.start();
    await new Promise((r) => setTimeout(r, 200));
    scheduler.stop();
    expect(executed.length).toBeGreaterThan(0);
  });

  it("cancels a scheduled job", () => {
    const scheduler = new Scheduler(50);
    const jobId = scheduler.schedule({
      name: "cancellable",
      frequency: "once",
      runAt: Date.now() + 10_000,
      handler: async () => undefined,
    });
    const cancelled = scheduler.cancel(jobId);
    expect(cancelled).toBe(true);
    expect(scheduler.getJob(jobId)?.status).toBe("cancelled");
  });
});
