"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_TASK_SEQUENCE = [
  "design_architecture",
  "build_backend",
  "build_frontend",
  "provision_database",
  "harden_security",
  "configure_deployment",
  "enable_monitoring",
  "verify",
];

function log(level, message, context) {
  const payload = {
    timestamp: new Date().toISOString(),
    component: "planner-agent",
    level,
    message,
    ...(context ? { context } : {}),
  };
  console.log(JSON.stringify(payload));
}

function loadWorkflowTemplate(workflowName) {
  const file = path.join(__dirname, "..", "workflows", `${workflowName}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function createPlannerAgent() {
  const state = {
    started: false,
    startedAt: null,
    handledCount: 0,
    lastError: null,
  };

  return {
    name: "planner-agent",

    start() {
      state.started = true;
      state.startedAt = new Date().toISOString();
      state.lastError = null;
      log("info", "Planner agent started", { startedAt: state.startedAt });
      return this.status();
    },

    async handle(input) {
      try {
        if (!state.started) {
          throw new Error("planner-agent is not started");
        }
        if (!input || typeof input !== "object") {
          throw new Error("planner input must be an object");
        }

        const workflowName =
          input.intent === "DEPLOY_INFRASTRUCTURE"
            ? "infrastructure-deployment"
            : "application-generation";

        const template = loadWorkflowTemplate(workflowName);

        const tasks = template && Array.isArray(template.tasks)
          ? template.tasks.slice()
          : DEFAULT_TASK_SEQUENCE;

        const response = {
          workflow: workflowName,
          tasks,
          context: {
            intent: input.intent || "CREATE_APPLICATION",
            industry: input.industry || "general",
            capabilities: Array.isArray(input.capabilities) ? input.capabilities : [],
            complexity: input.complexity || "MEDIUM",
          },
        };

        state.handledCount += 1;
        state.lastError = null;
        log("info", "Workflow plan generated", {
          workflow: response.workflow,
          taskCount: response.tasks.length,
        });
        return response;
      } catch (error) {
        state.lastError = error.message;
        log("error", "Workflow planning failed", { error: error.message });
        throw error;
      }
    },

    status() {
      return {
        name: "planner-agent",
        started: state.started,
        startedAt: state.startedAt,
        handledCount: state.handledCount,
        lastError: state.lastError,
      };
    },
  };
}

module.exports = {
  createPlannerAgent,
  DEFAULT_TASK_SEQUENCE,
};
