import { WorkflowEngine } from "../packages/workflow-engine";
import { WorkflowDefinition } from "../packages/shared-types";
import { v4 as uuidv4 } from "uuid";

function makeDefinition(
  steps: Array<{
    name: string;
    capabilityId: string;
    dependsOn?: string[];
    params?: Record<string, unknown>;
  }>
): WorkflowDefinition {
  const stepDefs = steps.map((s) => ({
    id: uuidv4(),
    name: s.name,
    capabilityId: s.capabilityId,
    params: s.params ?? {},
    dependsOn: [] as string[],
  }));

  // Wire dependsOn by step name
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].dependsOn) {
      stepDefs[i].dependsOn = steps[i].dependsOn!.map((depName) => {
        const found = stepDefs.find((_, idx) => steps[idx].name === depName);
        return found?.id ?? "";
      });
    }
  }

  return { id: uuidv4(), name: "test-workflow", steps: stepDefs, createdAt: Date.now() };
}

describe("WorkflowEngine", () => {
  it("executes a single-step workflow", async () => {
    const engine = new WorkflowEngine();
    const executed: string[] = [];
    engine.registerHandler("step-a", async () => {
      executed.push("a");
      return { done: true };
    });

    const def = makeDefinition([{ name: "a", capabilityId: "step-a" }]);
    const run = await engine.execute(def);

    expect(run.status).toBe("completed");
    expect(executed).toContain("a");
    expect(run.stepResults[0].status).toBe("completed");
  });

  it("executes steps in dependency order", async () => {
    const engine = new WorkflowEngine();
    const order: string[] = [];

    engine.registerHandler("step-a", async () => {
      order.push("a");
    });
    engine.registerHandler("step-b", async () => {
      order.push("b");
    });

    const def = makeDefinition([
      { name: "a", capabilityId: "step-a" },
      { name: "b", capabilityId: "step-b", dependsOn: ["a"] },
    ]);
    await engine.execute(def);

    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
  });

  it("fails the run when a step handler throws", async () => {
    const engine = new WorkflowEngine();
    engine.registerHandler("bad-step", async () => {
      throw new Error("step failed");
    });

    const def = makeDefinition([{ name: "bad", capabilityId: "bad-step" }]);
    const run = await engine.execute(def);

    expect(run.status).toBe("failed");
    expect(run.error).toContain("step failed");
  });

  it("returns 'failed' for missing handler", async () => {
    const engine = new WorkflowEngine();
    const def = makeDefinition([{ name: "unregistered", capabilityId: "no-handler" }]);
    const run = await engine.execute(def);
    expect(run.status).toBe("failed");
  });

  it("retrieves a stored run by ID", async () => {
    const engine = new WorkflowEngine();
    engine.registerHandler("noop", async () => null);
    const def = makeDefinition([{ name: "n", capabilityId: "noop" }]);
    const run = await engine.execute(def);
    const stored = engine.getRun(run.id);
    expect(stored).toBeDefined();
    expect(stored?.id).toBe(run.id);
  });

  it("executes independent steps concurrently", async () => {
    const engine = new WorkflowEngine();
    const starts: number[] = [];

    engine.registerHandler("slow-a", async () => {
      starts.push(Date.now());
      await new Promise((r) => setTimeout(r, 50));
    });
    engine.registerHandler("slow-b", async () => {
      starts.push(Date.now());
      await new Promise((r) => setTimeout(r, 50));
    });

    const def = makeDefinition([
      { name: "a", capabilityId: "slow-a" },
      { name: "b", capabilityId: "slow-b" },
    ]);

    const t0 = Date.now();
    await engine.execute(def);
    const elapsed = Date.now() - t0;

    // If they ran sequentially this would be ~100ms; concurrent should be ~50ms
    expect(elapsed).toBeLessThan(90);
  });
});
