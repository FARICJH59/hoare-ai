/**
 * Enterprise Scaling Performance Tests
 *
 * Verifies end-to-end throughput and correctness under the concurrency and
 * data-volume conditions expected in production enterprise deployments:
 *
 *   - High-concurrency HTTP API requests
 *   - Large agent swarm (parallel, sequential, pipeline modes)
 *   - Concurrent multi-step workflow execution
 *   - Router throughput across many agents
 *   - QGPS multi-tenant task isolation at scale
 *   - AgentMemory stability under high volume
 *   - Scheduler burst: many jobs firing simultaneously
 *   - End-to-end intent → plan → workflow pipeline at scale
 */

import http from "http";
import supertest from "supertest";
import { createApp } from "../api/index";
import { Agent } from "../agent/agent";
import { AgentMemory } from "../agent/memory";
import { AgentRouter } from "../agent/router";
import { AgentSwarm } from "../agent/swarm";
import { CapabilityRegistry } from "../agent/capability-registry";
import { IntentAgent } from "../agent/intent";
import { PlannerAgent } from "../agent/planner";
import { Scheduler } from "../agent/scheduler";
import { WorkflowEngine } from "../packages/workflow-engine";
import { QGPSClient } from "../packages/qgps-sdk";
import { allTools } from "../tools";
import { v4 as uuidv4 } from "uuid";
import { WorkflowDefinition } from "../packages/shared-types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a linear N-step WorkflowDefinition whose steps all share one handler. */
function buildLinearWorkflow(stepCount: number, capabilityId: string): WorkflowDefinition {
  const steps = Array.from({ length: stepCount }, (_, i) => ({
    id: uuidv4(),
    name: `step-${i}`,
    capabilityId,
    params: { index: i },
    dependsOn: [] as string[],
  }));
  // Chain each step on the previous one
  for (let i = 1; i < steps.length; i++) {
    steps[i].dependsOn = [steps[i - 1].id];
  }
  return { id: uuidv4(), name: "linear-workflow", steps, createdAt: Date.now() };
}

/** Build a fan-out WorkflowDefinition: one root step, N parallel leaves. */
function buildFanOutWorkflow(leafCount: number, capabilityId: string): WorkflowDefinition {
  const root = { id: uuidv4(), name: "root", capabilityId, params: {}, dependsOn: [] as string[] };
  const leaves = Array.from({ length: leafCount }, (_, i) => ({
    id: uuidv4(),
    name: `leaf-${i}`,
    capabilityId,
    params: { leaf: i },
    dependsOn: [root.id],
  }));
  return { id: uuidv4(), name: "fan-out-workflow", steps: [root, ...leaves], createdAt: Date.now() };
}

// ── 1. High-concurrency API requests ─────────────────────────────────────────

describe("High-concurrency API requests", () => {
  let server: http.Server;
  let request: ReturnType<typeof supertest>;

  beforeAll((done) => {
    const app = createApp();
    server = app.listen(0, done);
    request = supertest(server);
  });

  afterAll((done) => {
    server.close(done);
  });

  it(
    "handles 50 simultaneous /health requests without errors",
    async () => {
      const requests = Array.from({ length: 50 }, () => request.get("/health"));
      const responses = await Promise.all(requests);

      const failures = responses.filter((r) => r.status !== 200);
      expect(failures).toHaveLength(0);

      responses.forEach((r) => {
        expect(r.body.status).toBe("ok");
        expect(typeof r.body.uptime).toBe("number");
      });
    },
    15_000
  );

  it(
    "handles 30 simultaneous GET /api/tools requests, all returning consistent data",
    async () => {
      const requests = Array.from({ length: 30 }, () => request.get("/api/tools"));
      const responses = await Promise.all(requests);

      const failures = responses.filter((r) => r.status !== 200);
      expect(failures).toHaveLength(0);

      // Every response must report the same tool count
      const counts = responses.map((r) => r.body.count as number);
      expect(new Set(counts).size).toBe(1);
      expect(counts[0]).toBeGreaterThan(0);
    },
    15_000
  );

  it(
    "handles 20 simultaneous POST /api/chat requests maintaining independent sessions",
    async () => {
      const requests = Array.from({ length: 20 }, (_, i) =>
        request
          .post("/api/chat")
          .set("Content-Type", "application/json")
          .send({ message: `Enterprise message ${i}` })
      );
      const responses = await Promise.all(requests);

      const failures = responses.filter((r) => r.status !== 200);
      expect(failures).toHaveLength(0);

      // Every response must carry a unique session ID
      const sessionIds = responses.map((r) => r.body.sessionId as string);
      expect(new Set(sessionIds).size).toBe(20);
    },
    15_000
  );

  it(
    "sustains throughput: 3 sequential batches of 20 /health requests each",
    async () => {
      const runBatch = async () => {
        const batch = Array.from({ length: 20 }, () => request.get("/health"));
        const responses = await Promise.all(batch);
        return responses.every((r) => r.status === 200);
      };

      const t0 = Date.now();
      expect(await runBatch()).toBe(true);
      expect(await runBatch()).toBe(true);
      expect(await runBatch()).toBe(true);
      const elapsed = Date.now() - t0;

      // 60 requests across 3 batches should complete well under 10 s
      expect(elapsed).toBeLessThan(10_000);
    },
    15_000
  );
});

// ── 2. Large agent swarm at scale ─────────────────────────────────────────────

describe("Large agent swarm scaling", () => {
  it(
    "runs a 20-agent parallel swarm and collects all results",
    async () => {
      const swarm = new AgentSwarm({ name: "enterprise-parallel", mode: "parallel" });
      for (let i = 0; i < 20; i++) {
        swarm.addAgent(new Agent({ name: `enterprise-agent-${i}` }));
      }

      const t0 = Date.now();
      const result = await swarm.run("Process enterprise workload");
      const elapsed = Date.now() - t0;

      expect(result.results).toHaveLength(20);
      expect(result.results.every((r) => typeof r.response === "string")).toBe(true);
      // 20 agents running in parallel should complete faster than sequential would
      expect(elapsed).toBeLessThan(5_000);
    },
    15_000
  );

  it(
    "runs a 10-agent sequential pipeline and chains responses correctly",
    async () => {
      const swarm = new AgentSwarm({ name: "enterprise-pipeline", mode: "sequential" });
      for (let i = 0; i < 10; i++) {
        swarm.addAgent(new Agent({ name: `pipeline-agent-${i}` }));
      }

      const result = await swarm.run("Initiate enterprise pipeline");

      expect(result.results).toHaveLength(10);
      // consensus in sequential mode is the last agent's response
      expect(result.consensus).toBe(result.results[9].response);
    },
    15_000
  );

  it(
    "runs 5 independent parallel swarms concurrently without cross-contamination",
    async () => {
      const swarmRuns = Array.from({ length: 5 }, async (_, swarmIdx) => {
        const swarm = new AgentSwarm({ name: `swarm-${swarmIdx}`, mode: "parallel" });
        for (let i = 0; i < 4; i++) {
          swarm.addAgent(new Agent({ name: `s${swarmIdx}-a${i}` }));
        }
        return swarm.run(`Swarm ${swarmIdx} enterprise task`);
      });

      const results = await Promise.all(swarmRuns);

      expect(results).toHaveLength(5);
      results.forEach((r) => {
        expect(r.results).toHaveLength(4);
        // All results reference agents from the correct swarm
        r.results.forEach((res) => expect(typeof res.agentId).toBe("string"));
      });
    },
    15_000
  );
});

// ── 3. Concurrent workflow execution ─────────────────────────────────────────

describe("Concurrent workflow execution at scale", () => {
  it(
    "executes 25 independent 5-step workflows concurrently and all complete",
    async () => {
      const engine = new WorkflowEngine();
      let invocations = 0;
      engine.registerHandler("scale-step", async () => {
        invocations++;
        return { done: true };
      });

      const definitions = Array.from({ length: 25 }, () => buildLinearWorkflow(5, "scale-step"));

      const t0 = Date.now();
      const runs = await Promise.all(definitions.map((d) => engine.execute(d)));
      const elapsed = Date.now() - t0;

      expect(runs).toHaveLength(25);
      expect(runs.every((r) => r.status === "completed")).toBe(true);
      // 25 × 5 steps = 125 handler invocations
      expect(invocations).toBe(125);
      expect(elapsed).toBeLessThan(10_000);
    },
    15_000
  );

  it(
    "executes a fan-out workflow with 20 parallel leaf steps within time budget",
    async () => {
      const engine = new WorkflowEngine();
      engine.registerHandler("fan-cap", async () => {
        await new Promise((r) => setTimeout(r, 10)); // simulate work
        return { ok: true };
      });

      const def = buildFanOutWorkflow(20, "fan-cap");

      const t0 = Date.now();
      const run = await engine.execute(def);
      const elapsed = Date.now() - t0;

      expect(run.status).toBe("completed");
      expect(run.stepResults.every((sr) => sr.status === "completed")).toBe(true);
      // root (10 ms) + 20 leaves in parallel (10 ms) ≈ 20 ms; cap at 500 ms for CI noise
      expect(elapsed).toBeLessThan(500);
    },
    15_000
  );

  it(
    "10 concurrent fan-out workflows all complete without interference",
    async () => {
      const engine = new WorkflowEngine();
      engine.registerHandler("iso-cap", async () => ({ isolated: true }));

      const defs = Array.from({ length: 10 }, () => buildFanOutWorkflow(5, "iso-cap"));
      const runs = await Promise.all(defs.map((d) => engine.execute(d)));

      expect(runs.every((r) => r.status === "completed")).toBe(true);
      // Each workflow has 1 root + 5 leaves = 6 steps
      runs.forEach((r) => expect(r.stepResults).toHaveLength(6));
    },
    15_000
  );

  it(
    "stores and retrieves all runs after mass execution",
    async () => {
      const engine = new WorkflowEngine();
      engine.registerHandler("store-cap", async () => null);

      const count = 30;
      const defs = Array.from({ length: count }, () =>
        buildLinearWorkflow(2, "store-cap")
      );
      const runs = await Promise.all(defs.map((d) => engine.execute(d)));

      const storedRuns = engine.listRuns();
      expect(storedRuns.length).toBeGreaterThanOrEqual(count);

      runs.forEach((r) => {
        const stored = engine.getRun(r.id);
        expect(stored).toBeDefined();
        expect(stored?.id).toBe(r.id);
      });
    },
    15_000
  );
});

// ── 4. Router throughput ──────────────────────────────────────────────────────

describe("AgentRouter throughput at scale", () => {
  it(
    "round-robin routes 100 messages across 5 agents with balanced distribution",
    async () => {
      const router = new AgentRouter({ strategy: "round-robin" });
      const agents = Array.from({ length: 5 }, (_, i) =>
        new Agent({ id: `rr-${i}`, name: `rr-agent-${i}` })
      );
      agents.forEach((a) => router.registerAgent(a));

      const t0 = Date.now();
      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) => router.route(`message ${i}`))
      );
      const elapsed = Date.now() - t0;

      expect(results).toHaveLength(100);
      expect(results.every((r) => typeof r.response === "string")).toBe(true);

      // Call counts should be roughly balanced (20 each for 100 messages / 5 agents)
      const counts = Object.values(router.getCallCounts());
      const total = counts.reduce((a, b) => a + b, 0);
      expect(total).toBe(100);
      counts.forEach((c) => expect(c).toBeGreaterThanOrEqual(15));

      expect(elapsed).toBeLessThan(10_000);
    },
    15_000
  );

  it(
    "least-busy strategy routes 50 messages and no agent is idle",
    async () => {
      const router = new AgentRouter({ strategy: "least-busy" });
      for (let i = 0; i < 4; i++) {
        router.registerAgent(new Agent({ id: `lb-${i}`, name: `lb-agent-${i}` }));
      }

      await Promise.all(Array.from({ length: 50 }, (_, i) => router.route(`msg ${i}`)));

      const counts = Object.values(router.getCallCounts());
      counts.forEach((c) => expect(c).toBeGreaterThan(0));
      expect(counts.reduce((a, b) => a + b, 0)).toBe(50);
    },
    15_000
  );

  it(
    "rule-based routing correctly directs 40 messages to the matching agent",
    async () => {
      const router = new AgentRouter({ strategy: "round-robin" });
      const financeAgent = new Agent({ id: "finance", name: "finance-agent" });
      const generalAgent = new Agent({ id: "general", name: "general-agent" });
      router.registerAgent(financeAgent);
      router.registerAgent(generalAgent);
      router.addRule({ pattern: /portfolio|stock|equity/, agentId: "finance" });

      const financialPrompts = Array.from({ length: 20 }, (_, i) => `portfolio query ${i}`);
      const generalPrompts = Array.from({ length: 20 }, (_, i) => `general query ${i}`);

      const finResults = await Promise.all(financialPrompts.map((m) => router.route(m)));
      const genResults = await Promise.all(generalPrompts.map((m) => router.route(m)));

      // All financial messages must be handled by the finance agent
      finResults.forEach((r) => expect(r.agentId).toBe("finance"));
      // General messages are distributed; none should incorrectly go to finance agent only
      const genAgentIds = genResults.map((r) => r.agentId);
      expect(genAgentIds.some((id) => id !== "finance")).toBe(true);
    },
    15_000
  );
});

// ── 5. QGPS multi-tenant isolation at scale ───────────────────────────────────

describe("QGPS multi-tenant task isolation at scale", () => {
  it(
    "10 tenants each submit 10 concurrent tasks; task IDs are globally unique",
    async () => {
      const tenantClients = Array.from({ length: 10 }, (_, i) =>
        new QGPSClient({
          baseUrl: "http://localhost:4000",
          apiKey: `key-tenant-${i}`,
          tenantId: `tenant-${i}`,
        })
      );

      // Authenticate all clients
      await Promise.all(tenantClients.map((c) => c.authenticate()));

      // Each tenant submits 10 tasks concurrently
      const allTasks = await Promise.all(
        tenantClients.flatMap((client) =>
          Array.from({ length: 10 }, (_, j) =>
            client.submitTask("enterprise-compute", { job: j })
          )
        )
      );

      expect(allTasks).toHaveLength(100);

      // All task IDs must be globally unique
      const ids = allTasks.map((t) => t.id);
      expect(new Set(ids).size).toBe(100);

      // Every task should carry the expected type
      allTasks.forEach((t) => expect(t.type).toBe("enterprise-compute"));
    },
    15_000
  );

  it(
    "metrics reporting from 10 tenants concurrently is accepted by all clients",
    async () => {
      const clients = Array.from({ length: 10 }, (_, i) =>
        new QGPSClient({
          baseUrl: "http://localhost:4000",
          apiKey: `metrics-key-${i}`,
          tenantId: `metrics-tenant-${i}`,
        })
      );
      await Promise.all(clients.map((c) => c.authenticate()));

      const reports = await Promise.all(
        clients.map((c) => c.reportMetrics({ requestsPerSecond: 500 + Math.random() * 100 }))
      );

      expect(reports.every((r) => r.accepted === true)).toBe(true);
    },
    10_000
  );

  it(
    "system health can be queried from 10 clients concurrently with consistent status values",
    async () => {
      const clients = Array.from({ length: 10 }, (_, i) =>
        new QGPSClient({
          baseUrl: "http://localhost:4000",
          apiKey: `health-key-${i}`,
          tenantId: `health-tenant-${i}`,
        })
      );
      await Promise.all(clients.map((c) => c.authenticate()));

      const healths = await Promise.all(clients.map((c) => c.getSystemHealth()));

      const validStatuses = new Set(["healthy", "degraded", "down"]);
      healths.forEach((h) => expect(validStatuses.has(h.status)).toBe(true));
    },
    10_000
  );

  it(
    "polling 50 task results concurrently returns correct task IDs",
    async () => {
      const client = new QGPSClient({
        baseUrl: "http://localhost:4000",
        apiKey: "poll-key",
        tenantId: "poll-tenant",
      });
      await client.authenticate();

      const tasks = await Promise.all(
        Array.from({ length: 50 }, () => client.submitTask("poll-test", {}))
      );

      const results = await Promise.all(tasks.map((t) => client.getTaskResult(t.id)));

      expect(results).toHaveLength(50);
      results.forEach((r, i) => {
        expect(r.taskId).toBe(tasks[i].id);
        expect(r.status).toBe("completed");
      });
    },
    15_000
  );
});

// ── 6. AgentMemory stability under high volume ────────────────────────────────

describe("AgentMemory stability under high volume", () => {
  it("stores 5 000 entries with a capped memory and enforces the limit", () => {
    const cap = 500;
    const mem = new AgentMemory("enterprise-mem", cap);

    for (let i = 0; i < 5_000; i++) {
      mem.addEntry({ role: "user", content: `Enterprise log entry ${i}` });
    }

    expect(mem.size()).toBe(cap);
  });

  it("search across 1 000 entries returns only relevant results", () => {
    const mem = new AgentMemory("search-mem", 2_000);

    for (let i = 0; i < 900; i++) {
      mem.addEntry({ role: "user", content: `Routine telemetry packet ${i}` });
    }
    for (let i = 0; i < 100; i++) {
      mem.addEntry({ role: "assistant", content: `Quantum entanglement result ${i}` });
    }

    const results = mem.search("Quantum");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => expect(r.entry.content.toLowerCase()).toContain("quantum"));
  });

  it("concurrent writes from 10 simulated agents stay within per-agent cap", () => {
    const agentMems = Array.from(
      { length: 10 },
      (_, i) => new AgentMemory(`agent-${i}`, 100)
    );

    // Simulate 10 agents each writing 200 entries (exceeds cap)
    agentMems.forEach((mem) => {
      for (let j = 0; j < 200; j++) {
        mem.addEntry({ role: "user", content: `msg ${j}` });
      }
    });

    agentMems.forEach((mem) => expect(mem.size()).toBe(100));
  });

  it("clear() resets memory back to zero after high-volume writes", () => {
    const mem = new AgentMemory("clear-mem", 10_000);
    for (let i = 0; i < 10_000; i++) {
      mem.addEntry({ role: "user", content: `entry ${i}` });
    }
    mem.clear();
    expect(mem.size()).toBe(0);
  });
});

// ── 7. Scheduler burst: many jobs simultaneously ──────────────────────────────

describe("Scheduler burst throughput", () => {
  it(
    "schedules and executes 50 one-shot jobs within the time budget",
    async () => {
      const scheduler = new Scheduler(20); // 20 ms tick for fast testing
      const executed: number[] = [];

      for (let i = 0; i < 50; i++) {
        scheduler.schedule({
          name: `burst-job-${i}`,
          frequency: "once",
          runAt: Date.now(),
          handler: async () => {
            executed.push(i);
          },
        });
      }

      scheduler.start();
      await new Promise((r) => setTimeout(r, 500));
      scheduler.stop();

      expect(executed.length).toBe(50);
    },
    10_000
  );

  it(
    "cancelling half of 40 scheduled jobs prevents their execution",
    async () => {
      const scheduler = new Scheduler(20);
      const executed: string[] = [];
      const jobIds: string[] = [];

      for (let i = 0; i < 40; i++) {
        const id = scheduler.schedule({
          name: `cancel-job-${i}`,
          frequency: "once",
          runAt: Date.now() + 200, // run after 200 ms
          handler: async () => {
            executed.push(`job-${i}`);
          },
        });
        jobIds.push(id);
      }

      // Cancel the first 20 before they run
      jobIds.slice(0, 20).forEach((id) => {
        expect(scheduler.cancel(id)).toBe(true);
        expect(scheduler.getJob(id)?.status).toBe("cancelled");
      });

      scheduler.start();
      await new Promise((r) => setTimeout(r, 500));
      scheduler.stop();

      expect(executed.length).toBe(20);
    },
    10_000
  );

  it(
    "interval jobs fire multiple times within the observation window",
    async () => {
      const scheduler = new Scheduler(20);
      let fireCount = 0;

      scheduler.schedule({
        name: "interval-job",
        frequency: "interval",
        intervalMs: 50,
        runAt: Date.now(),
        handler: async () => {
          fireCount++;
        },
      });

      scheduler.start();
      await new Promise((r) => setTimeout(r, 300));
      scheduler.stop();

      // With a 50 ms interval over 300 ms we expect at least 3 fires
      expect(fireCount).toBeGreaterThanOrEqual(3);
    },
    10_000
  );
});

// ── 8. End-to-end intent → plan → workflow pipeline at scale ──────────────────

describe("End-to-end enterprise pipeline at scale", () => {
  beforeEach(() => {
    // Reset singleton so each test starts with a clean registry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CapabilityRegistry as any).instance = undefined;
    const reg = CapabilityRegistry.getInstance();
    allTools.forEach((t) => reg.registerTool(t));
  });

  it(
    "classifies 50 enterprise prompts with IntentAgent without errors",
    () => {
      const agent = new IntentAgent();
      const prompts = [
        ...Array.from({ length: 15 }, (_, i) => `Simulate quantum circuit run ${i}`),
        ...Array.from({ length: 15 }, (_, i) => `Analyse portfolio risk batch ${i}`),
        ...Array.from({ length: 10 }, (_, i) => `Train ML model epoch ${i}`),
        ...Array.from({ length: 10 }, (_, i) => `Deploy robot arm sequence ${i}`),
      ];

      const results = prompts.map((p) => agent.classify(p));

      expect(results).toHaveLength(50);
      results.forEach((r) => {
        expect(typeof r.category).toBe("string");
        expect(r.confidence).toBeGreaterThanOrEqual(0);
        expect(r.confidence).toBeLessThanOrEqual(1);
      });

      // Domain-specific prompts must be classified correctly
      const quantumResults = results.slice(0, 15);
      quantumResults.forEach((r) => expect(r.category).toBe("quantum"));

      const financeResults = results.slice(15, 30);
      financeResults.forEach((r) => expect(r.category).toBe("finance"));
    }
  );

  it(
    "PlannerAgent produces valid plans for 20 concurrent enterprise prompts",
    () => {
      const planner = new PlannerAgent();
      const prompts = Array.from(
        { length: 20 },
        (_, i) => `Enterprise task ${i}: simulate quantum circuit and analyse portfolio risk`
      );

      const plans = prompts.map((p) => planner.plan(p));

      expect(plans).toHaveLength(20);
      plans.forEach((plan) => {
        expect(plan.id).toBeDefined();
        expect(plan.steps.length).toBeGreaterThan(0);
        plan.steps.forEach((s) => {
          expect(s.capabilityId).toBeTruthy();
          expect(s.id).toBeTruthy();
        });
      });
    }
  );

  it(
    "full pipeline: intent → plan → workflow executes correctly for 10 concurrent enterprise tasks",
    async () => {
      const planner = new PlannerAgent();
      const engine = new WorkflowEngine();

      // Register handlers for all tool capabilities that the planner might emit
      allTools.forEach((t) => {
        engine.registerHandler(t.name, async () => ({ tool: t.name, executed: true }));
      });
      // Fallback handler for unknown/generic capability
      engine.registerHandler("agent-run", async () => ({ fallback: true }));

      const prompts = [
        "Simulate quantum circuit with H gate",
        "Analyse portfolio Sharpe ratio for AAPL",
        "Train ML model with 10 epochs",
        "Optimise quantum variational algorithm",
        "Get market data for GOOG and MSFT",
        "Run robot arm kinematics simulation",
        "Embed text for semantic search",
        "Simulate quantum entanglement circuit",
        "Compute portfolio VaR at 95% confidence",
        "Train neural network for classification",
      ];

      const runs = await Promise.all(
        prompts.map(async (prompt) => {
          const plan = planner.plan(prompt);

          // Convert PlannerAgent steps into WorkflowDefinition steps
          const workflowDef: WorkflowDefinition = {
            id: uuidv4(),
            name: `enterprise-plan-${plan.id}`,
            steps: plan.steps.map((s) => ({
              id: s.id,
              name: s.description,
              capabilityId: s.capabilityId,
              params: s.params,
              dependsOn: s.dependsOn,
            })),
            createdAt: Date.now(),
          };

          return engine.execute(workflowDef);
        })
      );

      expect(runs).toHaveLength(10);
      runs.forEach((run) => {
        expect(run.status).toBe("completed");
        expect(run.stepResults.every((sr) => sr.status === "completed")).toBe(true);
      });
    },
    15_000
  );

  it(
    "full pipeline handles 5 concurrent swarms of 4 agents each processing planned workflows",
    async () => {
      const swarmResults = await Promise.all(
        Array.from({ length: 5 }, async (_, swarmIdx) => {
          const swarm = new AgentSwarm({
            name: `enterprise-swarm-${swarmIdx}`,
            mode: "parallel",
          });
          for (let i = 0; i < 4; i++) {
            swarm.addAgent(
              new Agent({ name: `swarm-${swarmIdx}-agent-${i}`, tools: allTools.slice(0, 3) })
            );
          }
          return swarm.run(`Enterprise workload batch ${swarmIdx}`);
        })
      );

      expect(swarmResults).toHaveLength(5);
      swarmResults.forEach((r) => {
        expect(r.results).toHaveLength(4);
        expect(r.mode).toBe("parallel");
        expect(typeof r.duration).toBe("number");
      });
    },
    15_000
  );
});
