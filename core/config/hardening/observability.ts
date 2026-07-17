export const observabilityHardening = {
  correlationHeader: "x-correlation-id",
  defaultEnvironment: "development",
  metricNames: {
    agentExecutions: "agents.executions",
    workflowRuns: "workflows.runs",
    toolCalls: "tools.calls",
    safetyDecisions: "safety.decisions",
    riskDecisions: "risk.decisions",
    usecaseRuns: "usecases.runs",
    holographicFrames: "ui.holographic.frames",
  },
} as const;
