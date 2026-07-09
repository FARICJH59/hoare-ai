"use strict";

const fs = require("fs");
const path = require("path");
const { createIntentAgent } = require("./agents/intent-agent");
const { createPromptReceiverAgent } = require("./agents/prompt-receiver");
const { createPlannerAgent } = require("./agents/planner-agent");
const { createQgpsClient } = require("./gateway/qgps-client");

function log(level, message, context) {
  const payload = {
    timestamp: new Date().toISOString(),
    component: "hoare-runtime",
    level,
    message,
    ...(context ? { context } : {}),
  };
  console.log(JSON.stringify(payload));
}

function loadCapabilityPack(industry) {
  const file = path.join(__dirname, "capabilities", `${industry}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function createRuntime() {
  const intentAgent = createIntentAgent();
  const promptReceiver = createPromptReceiverAgent({ intentAgent });
  const plannerAgent = createPlannerAgent();
  const qgpsClient = createQgpsClient();

  function start() {
    intentAgent.start();
    promptReceiver.start();
    plannerAgent.start();

    const runtimeStatus = {
      intentAgent: intentAgent.status(),
      promptReceiver: promptReceiver.status(),
      plannerAgent: plannerAgent.status(),
      qgpsClient: qgpsClient.status(),
    };

    log("info", "HOARE.ai runtime started", runtimeStatus);
    return runtimeStatus;
  }

  async function run(promptInput) {
    const projectRequest = await promptReceiver.handle(promptInput);
    const capabilityPack = loadCapabilityPack(projectRequest.industry);
    const workflow = await plannerAgent.handle(projectRequest);

    const submission = await qgpsClient.submitWorkflow({
      projectRequest,
      capabilityPack,
      workflow,
    });

    return {
      projectRequest,
      capabilityPack,
      workflow,
      submission,
    };
  }

  return {
    start,
    run,
    status() {
      return {
        intentAgent: intentAgent.status(),
        promptReceiver: promptReceiver.status(),
        plannerAgent: plannerAgent.status(),
        qgpsClient: qgpsClient.status(),
      };
    },
  };
}

module.exports = {
  createRuntime,
};

if (require.main === module) {
  (async () => {
    const runtime = createRuntime();
    runtime.start();

    const prompt = process.argv.slice(2).join(" ") || "Build an AI healthcare platform with patient analytics";
    const result = await runtime.run({ prompt, requestId: `req_${Date.now()}` });
    log("info", "Execution completed", result);
  })().catch((error) => {
    log("error", "Runtime execution failed", { error: error.message, stack: error.stack });
    process.exitCode = 1;
  });
}
