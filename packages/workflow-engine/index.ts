import { v4 as uuidv4 } from "uuid";
import {
  WorkflowDefinition,
  WorkflowRun,
  WorkflowStepResult,
  WorkflowStatus,
} from "../shared-types";

export type { WorkflowDefinition, WorkflowRun, WorkflowStepResult, WorkflowStatus };

export type StepHandler = (
  params: Record<string, unknown>,
  context: WorkflowContext
) => Promise<unknown>;

export interface WorkflowContext {
  runId: string;
  workflowId: string;
  stepResults: Map<string, WorkflowStepResult>;
}

/**
 * WorkflowEngine executes WorkflowDefinitions by running each step in
 * dependency order. Steps with no dependsOn are executed concurrently.
 * Supports per-step retries, timeouts, and dependent-step skipping.
 */
export class WorkflowEngine {
  private handlers: Map<string, StepHandler>;
  private runs: Map<string, WorkflowRun>;

  constructor() {
    this.handlers = new Map();
    this.runs = new Map();
  }

  /** Register a capability handler by capability ID. */
  registerHandler(capabilityId: string, handler: StepHandler): void {
    this.handlers.set(capabilityId, handler);
  }

  /** Execute a workflow definition and return the completed WorkflowRun. */
  async execute(definition: WorkflowDefinition): Promise<WorkflowRun> {
    const runId = uuidv4();
    const run: WorkflowRun = {
      id: runId,
      workflowId: definition.id,
      status: "running",
      stepResults: definition.steps.map((s) => ({
        stepId: s.id,
        status: "pending",
      })),
      startedAt: Date.now(),
    };
    this.runs.set(runId, run);

    const context: WorkflowContext = {
      runId,
      workflowId: definition.id,
      stepResults: new Map(run.stepResults.map((r) => [r.stepId, r])),
    };

    try {
      await this.executeSteps(definition, context, run);
      const failedStep = Array.from(context.stepResults.values()).find((r) => r.status === "failed");
      if (failedStep) {
        run.status = "failed";
        run.error = failedStep.error;
      } else {
        run.status = "completed";
      }
    } catch (err) {
      run.status = "failed";
      run.error = err instanceof Error ? err.message : String(err);
    } finally {
      run.completedAt = Date.now();
    }

    return run;
  }

  private async executeSteps(
    definition: WorkflowDefinition,
    context: WorkflowContext,
    run: WorkflowRun
  ): Promise<void> {
    const completed = new Set<string>();
    const failed = new Set<string>();
    const pending = [...definition.steps];

    while (pending.length > 0) {
      const ready = pending.filter((s) => s.dependsOn.every((dep) => completed.has(dep) || failed.has(dep)));
      if (ready.length === 0 && pending.length > 0) {
        throw new Error("Workflow deadlock: circular or unresolvable dependencies.");
      }

      await Promise.all(
        ready.map(async (step) => {
          const resultRef = context.stepResults.get(step.id)!;

          // Skip if any dependency failed
          const depFailed = step.dependsOn.some((dep) => failed.has(dep));
          if (depFailed) {
            resultRef.status = "skipped";
            resultRef.error = "Skipped: upstream dependency failed.";
            failed.add(step.id);
            const idx = pending.indexOf(step);
            if (idx !== -1) pending.splice(idx, 1);
            return;
          }

          resultRef.status = "running";
          const maxRetries = step.retries ?? 0;
          const timeoutMs = step.timeoutMs ?? 0;
          const stepStart = Date.now();
          let lastError: string | undefined;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              const handler = this.handlers.get(step.capabilityId);
              if (!handler) {
                throw new Error(`No handler registered for capability "${step.capabilityId}".`);
              }
              const execution = handler(step.params, context);
              if (timeoutMs > 0) {
                resultRef.result = await Promise.race([
                  execution,
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Step "${step.id}" timed out after ${timeoutMs}ms.`)), timeoutMs)
                  ),
                ]);
              } else {
                resultRef.result = await execution;
              }
              resultRef.status = "completed";
              lastError = undefined;
              break;
            } catch (err) {
              lastError = err instanceof Error ? err.message : String(err);
              if (attempt < maxRetries) continue;
            }
          }

          resultRef.durationMs = Date.now() - stepStart;

          if (lastError) {
            resultRef.status = "failed";
            resultRef.error = lastError;
            failed.add(step.id);
          } else {
            completed.add(step.id);
          }

          const idx = pending.indexOf(step);
          if (idx !== -1) pending.splice(idx, 1);
        })
      );

      run.stepResults = Array.from(context.stepResults.values());
    }
  }

  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  listRuns(): WorkflowRun[] {
    return Array.from(this.runs.values());
  }
}
