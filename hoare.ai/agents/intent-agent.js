"use strict";

const DEFAULT_RULES = {
  intentMap: [
    { match: /(build|create|generate|launch|develop)/i, intent: "CREATE_APPLICATION" },
    { match: /(deploy|provision|infrastructure|kubernetes|terraform)/i, intent: "DEPLOY_INFRASTRUCTURE" },
  ],
  industryMap: {
    healthcare: /(healthcare|hospital|patient|clinical|ehr|telemedicine)/i,
    fintech: /(fintech|bank|payment|trading|insurance|ledger|finance)/i,
    energy: /(energy|utility|grid|power|renewable|solar|wind)/i,
    retail: /(retail|ecommerce|store|inventory|pos|merchandising)/i,
    manufacturing: /(manufacturing|factory|supply chain|production|industrial|iot)/i,
  },
  capabilityMap: {
    api: /(api|integration|service|gateway)/i,
    database: /(database|storage|postgres|mysql|mongodb|data)/i,
    dashboard: /(dashboard|portal|admin|ui|frontend)/i,
    analytics: /(analytics|insights|reporting|ml|ai|prediction)/i,
    security: /(security|auth|iam|zero trust|encryption|compliance)/i,
    monitoring: /(monitoring|observability|alerting|tracing|logging)/i,
    deployment: /(deploy|devops|ci\/cd|infrastructure|kubernetes|docker)/i,
  },
};

function log(level, message, context) {
  const payload = {
    timestamp: new Date().toISOString(),
    component: "intent-agent",
    level,
    message,
    ...(context ? { context } : {}),
  };
  console.log(JSON.stringify(payload));
}

function detectComplexity(prompt, capabilityCount) {
  const text = String(prompt || "");
  if (capabilityCount >= 6 || /(multi-tenant|autonomous|distributed|global scale|enterprise)/i.test(text)) {
    return "HIGH";
  }
  if (capabilityCount >= 4 || /(platform|analytics|compliance|integration)/i.test(text)) {
    return "MEDIUM";
  }
  return "LOW";
}

function createIntentAgent(options = {}) {
  const rules = options.rules || DEFAULT_RULES;
  const llmAdapter = options.llmAdapter || null;
  const state = {
    started: false,
    startedAt: null,
    handledCount: 0,
    lastError: null,
  };

  return {
    name: "intent-agent",

    start() {
      state.started = true;
      state.startedAt = new Date().toISOString();
      state.lastError = null;
      log("info", "Intent agent started", { startedAt: state.startedAt });
      return this.status();
    },

    async handle(input) {
      try {
        if (!state.started) {
          throw new Error("intent-agent is not started");
        }

        const prompt = String((input && input.prompt) || "").trim();
        if (!prompt) {
          throw new Error("prompt is required");
        }

        const intentRule = rules.intentMap.find((rule) => rule.match.test(prompt));
        const intent = intentRule ? intentRule.intent : "CREATE_APPLICATION";

        const industryEntry = Object.entries(rules.industryMap).find(([, regex]) => regex.test(prompt));
        const industry = industryEntry ? industryEntry[0] : "general";

        const capabilities = Object.entries(rules.capabilityMap)
          .filter(([, regex]) => regex.test(prompt))
          .map(([capability]) => capability);

        const normalizedCapabilities = capabilities.length
          ? capabilities
          : ["api", "database", "dashboard", "analytics"];

        const response = {
          intent,
          industry,
          capabilities: [...new Set(normalizedCapabilities)],
          complexity: detectComplexity(prompt, normalizedCapabilities.length),
          metadata: {
            source: "rule-engine",
            llmReady: Boolean(llmAdapter),
          },
        };

        state.handledCount += 1;
        state.lastError = null;
        log("info", "Intent detected", { intent: response.intent, industry: response.industry });
        return response;
      } catch (error) {
        state.lastError = error.message;
        log("error", "Intent detection failed", { error: error.message });
        throw error;
      }
    },

    status() {
      return {
        name: "intent-agent",
        started: state.started,
        startedAt: state.startedAt,
        handledCount: state.handledCount,
        lastError: state.lastError,
        extensions: {
          llmAdapter: llmAdapter ? "configured" : "not-configured",
        },
      };
    },
  };
}

module.exports = {
  createIntentAgent,
  DEFAULT_RULES,
};
