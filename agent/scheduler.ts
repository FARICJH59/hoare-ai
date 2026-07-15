import { v4 as uuidv4 } from "uuid";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type JobFrequency = "once" | "interval" | "cron";

export interface ScheduledJob {
  id: string;
  name: string;
  status: JobStatus;
  frequency: JobFrequency;
  intervalMs?: number;
  cronExpression?: string;
  handler: () => Promise<unknown>;
  lastRunAt?: number;
  nextRunAt: number;
  runCount: number;
  errorCount: number;
  lastError?: string;
  createdAt: number;
}

export interface ScheduleOptions {
  name: string;
  frequency: JobFrequency;
  intervalMs?: number;
  runAt?: number;
  handler: () => Promise<unknown>;
}

/**
 * Scheduler manages background jobs with configurable frequencies.
 * It uses a polling loop rather than cron to stay dependency-free.
 */
export class Scheduler {
  private jobs: Map<string, ScheduledJob>;
  private timer: ReturnType<typeof setInterval> | null;
  private readonly tickMs: number;

  constructor(tickMs = 1000) {
    this.jobs = new Map();
    this.timer = null;
    this.tickMs = tickMs;
  }

  schedule(options: ScheduleOptions): string {
    const id = uuidv4();
    const now = Date.now();
    const job: ScheduledJob = {
      id,
      name: options.name,
      status: "pending",
      frequency: options.frequency,
      intervalMs: options.intervalMs,
      handler: options.handler,
      nextRunAt: options.runAt ?? now,
      runCount: 0,
      errorCount: 0,
      createdAt: now,
    };
    this.jobs.set(id, job);
    return id;
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    job.status = "cancelled";
    return true;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.tickMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (
        job.status === "cancelled" ||
        job.status === "running" ||
        job.status === "completed" ||
        job.status === "failed"
      )
        continue;
      if (now < job.nextRunAt) continue;

      job.status = "running";
      job.lastRunAt = now;

      try {
        await job.handler();
        job.runCount++;
        job.status = job.frequency === "once" ? "completed" : "pending";
        if (job.frequency === "interval" && job.intervalMs) {
          job.nextRunAt = Date.now() + job.intervalMs;
        }
      } catch (err) {
        job.errorCount++;
        job.lastError = err instanceof Error ? err.message : String(err);
        job.status = job.frequency === "once" ? "failed" : "pending";
        if (job.frequency === "interval" && job.intervalMs) {
          job.nextRunAt = Date.now() + job.intervalMs;
        }
      }
    }
  }

  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  listJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /** Remove all jobs in a terminal state (completed, failed, cancelled). */
  cleanup(): number {
    let removed = 0;
    for (const [id, job] of this.jobs) {
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        this.jobs.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /** Number of jobs currently tracked. */
  size(): number {
    return this.jobs.size;
  }

  isRunning(): boolean {
    return this.timer !== null;
  }
}
