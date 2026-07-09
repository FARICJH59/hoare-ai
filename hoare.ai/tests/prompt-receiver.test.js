"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeInput } = require("../agents/prompt-receiver");

test("normalizeInput handles string prompt", () => {
  const normalized = normalizeInput("  Build healthcare app  ");
  assert.equal(normalized.prompt, "Build healthcare app");
});

test("normalizeInput handles object prompt metadata", () => {
  const normalized = normalizeInput({
    prompt: "Build fintech platform",
    requestId: "req-1",
    tenantId: "tenant-a",
    metadata: { source: "test" },
  });

  assert.equal(normalized.prompt, "Build fintech platform");
  assert.equal(normalized.requestId, "req-1");
  assert.equal(normalized.tenantId, "tenant-a");
  assert.deepEqual(normalized.metadata, { source: "test" });
});

test("normalizeInput rejects null input", () => {
  assert.throws(() => normalizeInput(null), /input must be an object or string prompt/);
});

test("normalizeInput returns empty prompt when object prompt missing", () => {
  const normalized = normalizeInput({});
  assert.equal(normalized.prompt, "");
});
