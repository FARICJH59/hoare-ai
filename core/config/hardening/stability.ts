export const stabilityHardening = {
  agents: { maxConcurrency: 8, timeoutMs: 8_000, retries: 2, retryDelayMs: 80 },
  workflows: { maxConcurrency: 4, timeoutMs: 12_000, retries: 2, retryDelayMs: 120 },
  tools: { timeoutMs: 4_000, retries: 1, circuitBreakerFailures: 3, circuitBreakerResetMs: 30_000 },
  malformedInputFallback: true,
} as const;
