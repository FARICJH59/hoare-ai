export const reliabilityHardening = {
  eventBusMaxSize: 1_000,
  deadLetterMaxSize: 250,
  mailboxMaxMessages: 200,
  missedTaskGraceMs: 60_000,
  circuitBreakerResetMs: 30_000,
} as const;
