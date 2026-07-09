"use strict";

function log(level, message, context) {
  const payload = {
    timestamp: new Date().toISOString(),
    component: "prompt-receiver",
    level,
    message,
    ...(context ? { context } : {}),
  };
  console.log(JSON.stringify(payload));
}

function normalizeInput(input) {
  if (typeof input === "string") {
    return { prompt: input.trim() };
  }

  if (!input || typeof input !== "object") {
    throw new Error("input must be an object or string prompt");
  }

  return {
    prompt: String(input.prompt || "").trim(),
    requestId: input.requestId || null,
    tenantId: input.tenantId || null,
    metadata: input.metadata || {},
  };
}

function createPromptReceiverAgent(dependencies) {
  if (!dependencies || !dependencies.intentAgent || typeof dependencies.intentAgent.handle !== "function") {
    throw new Error("intentAgent dependency with handle(input) is required");
  }

  const { intentAgent } = dependencies;
  const state = {
    started: false,
    startedAt: null,
    handledCount: 0,
    lastError: null,
  };

  return {
    name: "prompt-receiver",

    start() {
      state.started = true;
      state.startedAt = new Date().toISOString();
      state.lastError = null;
      log("info", "Prompt receiver started", { startedAt: state.startedAt });
      return this.status();
    },

    async handle(input) {
      try {
        if (!state.started) {
          throw new Error("prompt-receiver is not started");
        }

        const normalized = normalizeInput(input);
        if (!normalized.prompt) {
          throw new Error("prompt is required");
        }

        const intentResult = await intentAgent.handle({ prompt: normalized.prompt });
        const projectRequest = {
          ...intentResult,
          prompt: normalized.prompt,
          requestId: normalized.requestId,
          tenantId: normalized.tenantId,
          metadata: normalized.metadata,
        };

        state.handledCount += 1;
        state.lastError = null;
        log("info", "Prompt normalized and classified", {
          requestId: projectRequest.requestId,
          industry: projectRequest.industry,
          intent: projectRequest.intent,
        });

        return projectRequest;
      } catch (error) {
        state.lastError = error.message;
        log("error", "Prompt handling failed", { error: error.message });
        throw error;
      }
    },

    status() {
      return {
        name: "prompt-receiver",
        started: state.started,
        startedAt: state.startedAt,
        handledCount: state.handledCount,
        lastError: state.lastError,
      };
    },
  };
}

module.exports = {
  createPromptReceiverAgent,
  normalizeInput,
};
