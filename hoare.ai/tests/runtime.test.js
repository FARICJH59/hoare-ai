"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createRuntime } = require("../index");

test("runtime processes prompt into workflow submission", async () => {
  const runtime = createRuntime();
  runtime.start();

  const result = await runtime.run({
    prompt: "Build an AI healthcare platform with patient analytics",
    requestId: "test-request",
  });

  assert.equal(result.projectRequest.intent, "CREATE_APPLICATION");
  assert.equal(result.projectRequest.industry, "healthcare");
  assert.ok(result.projectRequest.capabilities.includes("analytics"));
  assert.equal(result.workflow.workflow, "application-generation");
  assert.ok(Array.isArray(result.workflow.tasks));
  assert.equal(result.submission.status, "submitted");
});
