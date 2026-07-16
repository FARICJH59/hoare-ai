export interface DurableStatus {
  sessions: string;
  jobs: string;
  rateLimits: string;
  workflowRuns: string;
  auditLogs: string;
}

function configured(name: string): string {
  return process.env[name] ? "external-store-configured" : "in-process-store-active";
}

export function durableStorageStatus(): DurableStatus {
  return {
    sessions: configured("DATABASE_URL"),
    jobs: configured("DATABASE_URL"),
    rateLimits: configured("REDIS_URL"),
    workflowRuns: configured("DATABASE_URL"),
    auditLogs: configured("DATABASE_URL"),
  };
}

export function durableStorageHealth(): "ok" | "degraded" {
  return process.env.NODE_ENV === "production" && !process.env.DATABASE_URL ? "degraded" : "ok";
}
