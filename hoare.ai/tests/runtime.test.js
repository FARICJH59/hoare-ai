'use strict';

/**
 * HOARE.ai Runtime Test Suite
 *
 * Tests all agents, services, and the full pipeline.
 * Uses Node.js built-in assert — no external test runner required.
 */

const assert = require('assert');

// Suppress log output during tests
const logger = require('../utils/logger');
logger.setLevel('ERROR');

// ─── Imports ──────────────────────────────────────────────────────────────────
const { generateRequestId, generateProjectId, generateWorkflowId } = require('../utils/id-generator');
const { normalizePrompt, PromptReceiverAgent, LIFECYCLE_STATES }    = require('../agents/prompt-receiver');
const { classifyIndustry, detectCapabilities, estimateComplexity, identifyInfrastructure, IntentAgent } = require('../agents/intent-agent');
const { selectCapabilityPacks, buildWorkflowGraph, generateDeploymentPlan, PlannerAgent } = require('../agents/planner-agent');
const { ProjectFactoryAgent, deriveProjectName }   = require('../agents/project-factory');
const { VerificationAgent }  = require('../agents/verification-agent');
const { QGPSGateway, WORKFLOW_STATUS, HEALTH_EVENTS } = require('../gateway/qgps-gateway');
const { ProjectMemory }      = require('../memory/project-memory');
const { WorkflowVersioning } = require('../versioning/workflow-versioning');
const { AuditLog }           = require('../audit/audit-log');
const { HoareRuntime }       = require('../index');

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`  ✓ ${name}\n`);
    passed++;
  } catch (err) {
    process.stderr.write(`  ✗ ${name}\n    ${err.message}\n`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    process.stdout.write(`  ✓ ${name}\n`);
    passed++;
  } catch (err) {
    process.stderr.write(`  ✗ ${name}\n    ${err.message}\n`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

process.stdout.write('\n=== HOARE.ai Runtime Tests ===\n\n');

// ── ID Generator ──────────────────────────────────────────────────────────────
process.stdout.write('[ ID Generator ]\n');

test('generates unique request IDs', () => {
  const a = generateRequestId();
  const b = generateRequestId();
  assert.notStrictEqual(a, b);
  assert.ok(a.startsWith('req-'));
});

test('generateProjectId has proj prefix', () => {
  assert.ok(generateProjectId().startsWith('proj-'));
});

test('generateWorkflowId has wf prefix', () => {
  assert.ok(generateWorkflowId().startsWith('wf-'));
});

// ── Prompt Normalizer ─────────────────────────────────────────────────────────
process.stdout.write('\n[ Prompt Normalizer ]\n');

test('trims and collapses whitespace', () => {
  assert.strictEqual(normalizePrompt('  hello   world  '), 'hello world');
});

test('strips zero-width characters', () => {
  const raw = 'hello\u200Bworld';
  assert.strictEqual(normalizePrompt(raw), 'helloworld');
});

test('normalizes curly quotes', () => {
  const raw = '\u201CHello\u201D';
  assert.strictEqual(normalizePrompt(raw), '"Hello"');
});

// ── Prompt Receiver Agent ─────────────────────────────────────────────────────
process.stdout.write('\n[ PromptReceiverAgent ]\n');

test('receives a valid prompt', () => {
  const agent = new PromptReceiverAgent({ tenantId: 'test-tenant' });
  const env   = agent.receive('Build a payment API with Stripe and auth');
  assert.ok(env.requestId.startsWith('req-'));
  assert.strictEqual(env.tenantId, 'test-tenant');
  assert.ok(env.normalizedPrompt.length > 0);
  assert.strictEqual(env.state, LIFECYCLE_STATES.NORMALIZED);
});

test('throws on empty prompt', () => {
  const agent = new PromptReceiverAgent();
  assert.throws(() => agent.receive(''), /non-empty string/);
});

test('throws on prompt that is too short', () => {
  const agent = new PromptReceiverAgent();
  assert.throws(() => agent.receive('hi'), /too short/);
});

test('throws on prompt exceeding max length', () => {
  const agent = new PromptReceiverAgent();
  assert.throws(() => agent.receive('x'.repeat(10001)), /too long/);
});

test('markForwarded transitions state', () => {
  const agent = new PromptReceiverAgent();
  const env   = agent.receive('Build a SaaS dashboard with analytics');
  const fwd   = agent.markForwarded(env);
  assert.strictEqual(fwd.state, LIFECYCLE_STATES.FORWARDED);
});

// ── Intent Agent ──────────────────────────────────────────────────────────────
process.stdout.write('\n[ IntentAgent ]\n');

test('classifies fintech industry', () => {
  const r = classifyIndustry('Build a payment gateway with wallet and ledger');
  assert.strictEqual(r.primary, 'fintech');
  assert.ok(r.confidence > 0);
});

test('classifies healthcare industry', () => {
  const r = classifyIndustry('FHIR-based patient medical records EHR system');
  assert.strictEqual(r.primary, 'healthcare');
});

test('returns general for unrecognized prompt', () => {
  const r = classifyIndustry('build something nice');
  assert.strictEqual(r.primary, 'general');
});

test('detects authentication capability', () => {
  const caps = detectCapabilities('user login with OAuth and JWT tokens');
  assert.ok(caps.includes('authentication'));
});

test('detects database capability', () => {
  const caps = detectCapabilities('store data in postgres database');
  assert.ok(caps.includes('database'));
});

test('always includes api_gateway', () => {
  const caps = detectCapabilities('minimal app');
  assert.ok(caps.includes('api_gateway'));
});

test('complexity: low for few capabilities', () => {
  const r = estimateComplexity(['api_gateway', 'database'], 'general');
  assert.strictEqual(r.level, 'low');
});

test('complexity: enterprise for many capabilities + enterprise industry', () => {
  const caps = ['api_gateway','database','caching','messaging','authentication','authorization','storage','monitoring','payments','multi_tenancy'];
  const r = estimateComplexity(caps, 'fintech');
  assert.strictEqual(r.level, 'enterprise');
});

test('identifies database infrastructure', () => {
  const infra = identifyInfrastructure(['database']);
  assert.ok(infra.some(i => i.type === 'database'));
});

test('IntentAgent.analyze returns full intent object', () => {
  const agent    = new IntentAgent();
  const receiver = new PromptReceiverAgent();
  const envelope = receiver.receive('Build a SaaS billing platform with subscriptions and postgres');
  const intent   = agent.analyze(envelope);
  assert.ok(intent.industry);
  assert.ok(Array.isArray(intent.capabilities));
  assert.ok(intent.complexity.level);
  assert.ok(Array.isArray(intent.infrastructure));
  assert.strictEqual(intent.requestId, envelope.requestId);
});

// ── Planner Agent ─────────────────────────────────────────────────────────────
process.stdout.write('\n[ PlannerAgent ]\n');

test('selectCapabilityPacks returns at least one pack', () => {
  const intent = { capabilities: ['api_gateway', 'database', 'authentication'] };
  const packs  = selectCapabilityPacks(intent);
  assert.ok(packs.length > 0);
});

test('buildWorkflowGraph creates nodes and edges', () => {
  const intent = {
    capabilities: ['api_gateway', 'database', 'authentication', 'caching'],
    infrastructure: [{ service: 'PostgreSQL' }, { service: 'Redis' }],
    complexity: { level: 'medium' },
  };
  const graph = buildWorkflowGraph(intent, ['web_api']);
  assert.ok(graph.nodes.length > 0);
  assert.ok(graph.edges.length >= 0);
  assert.ok(graph.metadata.totalTasks === graph.nodes.length);
});

test('generateDeploymentPlan for enterprise complexity', () => {
  const intent = {
    complexity: { level: 'enterprise' },
    infrastructure: [],
  };
  const plan = generateDeploymentPlan(intent);
  assert.strictEqual(plan.strategy, 'canary');
  assert.ok(plan.autoscale);
  assert.ok(plan.environments.includes('prod'));
  assert.ok(plan.environments.includes('uat'));
});

test('PlannerAgent.plan produces workflowId', () => {
  const agent    = new PlannerAgent();
  const receiver = new PromptReceiverAgent();
  const iaAgent  = new IntentAgent();
  const envelope = receiver.receive('Build an ecommerce platform with cart and checkout and stripe');
  const intent   = iaAgent.analyze(envelope);
  const plan     = agent.plan(intent);
  assert.ok(plan.workflowId.startsWith('wf-'));
  assert.ok(plan.workflowGraph.nodes.length > 0);
  assert.ok(Array.isArray(plan.selectedPacks));
});

// ── Project Factory Agent ─────────────────────────────────────────────────────
process.stdout.write('\n[ ProjectFactoryAgent ]\n');

test('deriveProjectName produces URL-safe name', () => {
  const name = deriveProjectName('Build a payment gateway platform for fintech', 'fintech');
  assert.ok(/^[a-z0-9-]+$/.test(name));
  assert.ok(name.length <= 40);
});

test('ProjectFactoryAgent generates all artifact keys', () => {
  const runtime  = new HoareRuntime({ persistMemory: false, logLevel: 'ERROR' });
  const receiver = new PromptReceiverAgent();
  const iaAgent  = new IntentAgent();
  const planner  = new PlannerAgent();
  const factory  = new ProjectFactoryAgent();

  const envelope  = receiver.receive('Build a logistics tracking API with database and redis cache');
  const intent    = iaAgent.analyze(envelope);
  const plan      = planner.plan(intent);
  const artifacts = factory.generate(plan, intent, envelope);

  assert.ok(artifacts.projectId.startsWith('proj-'));
  assert.ok(artifacts.projectName);
  assert.ok(artifacts.repoStructure);
  assert.ok(artifacts.architectureManifest);
  assert.ok(artifacts.cicd.ci.content.includes('npm test'));
  assert.ok(artifacts.containers.dockerfile.content.includes('FROM'));
  assert.ok(artifacts.kubernetes.deployment.content.includes('kind: Deployment'));
  void runtime; // suppress unused warning
});

// ── Verification Agent ────────────────────────────────────────────────────────
process.stdout.write('\n[ VerificationAgent ]\n');

test('VerificationAgent passes on valid artifacts', () => {
  const receiver = new PromptReceiverAgent();
  const iaAgent  = new IntentAgent();
  const planner  = new PlannerAgent();
  const factory  = new ProjectFactoryAgent();
  const verifier = new VerificationAgent();

  const envelope  = receiver.receive('Build a healthcare API with patient records and postgres');
  const intent    = iaAgent.analyze(envelope);
  const plan      = planner.plan(intent);
  const artifacts = factory.generate(plan, intent, envelope);
  const result    = verifier.verify(artifacts);

  assert.ok(result.passed, `Verification failed: ${JSON.stringify(result.checks.filter(c => !c.passed))}`);
  assert.strictEqual(result.score, 100);
});

test('VerificationAgent fails on empty artifacts', () => {
  const verifier = new VerificationAgent();
  const result   = verifier.verify({ requestId: 'x', tenantId: 't' });
  assert.ok(!result.passed);
  assert.ok(result.score < 100);
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
process.stdout.write('\n[ AuditLog ]\n');

test('records entries and queries by event', () => {
  const log = new AuditLog();
  log.record({ event: 'TEST_EVENT', requestId: 'r1', tenantId: 't1' });
  log.record({ event: 'OTHER_EVENT', requestId: 'r2', tenantId: 't1' });
  const results = log.query({ event: 'TEST_EVENT' });
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].event, 'TEST_EVENT');
});

test('queries by tenantId', () => {
  const log = new AuditLog();
  log.record({ event: 'EV', tenantId: 'tenant-a' });
  log.record({ event: 'EV', tenantId: 'tenant-b' });
  assert.strictEqual(log.query({ tenantId: 'tenant-a' }).length, 1);
});

test('tail returns last N entries', () => {
  const log = new AuditLog();
  for (let i = 0; i < 10; i++) log.record({ event: `EV_${i}` });
  assert.strictEqual(log.tail(3).length, 3);
});

test('export returns valid JSON', () => {
  const log = new AuditLog();
  log.record({ event: 'X' });
  const data = JSON.parse(log.export());
  assert.ok(Array.isArray(data));
  assert.strictEqual(data[0].event, 'X');
});

test('throws if event field missing', () => {
  const log = new AuditLog();
  assert.throws(() => log.record({ foo: 'bar' }), /event field/);
});

// ── Project Memory ────────────────────────────────────────────────────────────
process.stdout.write('\n[ ProjectMemory ]\n');

test('saves and retrieves a project', () => {
  const mem = new ProjectMemory({ persist: false });
  mem.save({ projectId: 'proj-1', tenantId: 'tenant-1', name: 'TestProj' });
  const r = mem.get('proj-1');
  assert.strictEqual(r.name, 'TestProj');
});

test('listByTenant returns correct projects', () => {
  const mem = new ProjectMemory({ persist: false });
  mem.save({ projectId: 'p1', tenantId: 'ta' });
  mem.save({ projectId: 'p2', tenantId: 'ta' });
  mem.save({ projectId: 'p3', tenantId: 'tb' });
  assert.strictEqual(mem.listByTenant('ta').length, 2);
  assert.strictEqual(mem.listByTenant('tb').length, 1);
});

test('deletes a project', () => {
  const mem = new ProjectMemory({ persist: false });
  mem.save({ projectId: 'del-1', tenantId: 'tx' });
  assert.ok(mem.delete('del-1'));
  assert.strictEqual(mem.get('del-1'), null);
});

test('stats returns correct counts', () => {
  const mem = new ProjectMemory({ persist: false });
  mem.save({ projectId: 'x1', tenantId: 'ta' });
  mem.save({ projectId: 'x2', tenantId: 'tb' });
  const s = mem.stats();
  assert.strictEqual(s.totalProjects, 2);
  assert.strictEqual(s.tenants, 2);
});

// ── Workflow Versioning ───────────────────────────────────────────────────────
process.stdout.write('\n[ WorkflowVersioning ]\n');

test('saves and retrieves latest version', () => {
  const wv = new WorkflowVersioning();
  wv.save('wf-1', { workflowGraph: { nodes: [{ id: 't1' }] } });
  const latest = wv.getLatest('wf-1');
  assert.strictEqual(latest.versionNumber, 1);
});

test('increments version number', () => {
  const wv = new WorkflowVersioning();
  wv.save('wf-2', { workflowGraph: { nodes: [] } });
  wv.save('wf-2', { workflowGraph: { nodes: [{ id: 't1' }] } });
  assert.strictEqual(wv.getLatest('wf-2').versionNumber, 2);
});

test('getHistory returns all versions', () => {
  const wv = new WorkflowVersioning();
  wv.save('wf-3', {}); wv.save('wf-3', {}); wv.save('wf-3', {});
  assert.strictEqual(wv.getHistory('wf-3').length, 3);
});

test('diff reports added tasks', () => {
  const wv = new WorkflowVersioning();
  wv.save('wf-d', { workflowGraph: { nodes: [{ id: 't1', label: 'Task A' }] } });
  wv.save('wf-d', { workflowGraph: { nodes: [{ id: 't1', label: 'Task A' }, { id: 't2', label: 'Task B' }] } });
  const d = wv.diff('wf-d', 1, 2);
  assert.ok(d.addedTasks.includes('Task B'));
  assert.strictEqual(d.taskCountDelta, 1);
});

// ── QGPS Gateway ─────────────────────────────────────────────────────────────
process.stdout.write('\n[ QGPSGateway ]\n');

testAsync('submits workflow and returns workflowId', async () => {
  const gateway = new QGPSGateway({ pollIntervalMs: 99999 });
  const plan     = { workflowId: 'wf-test-1', requestId: 'req-1', tenantId: 'ta', workflowGraph: { nodes: [] }, deploymentPlan: {} };
  const artifacts = { projectId: 'proj-1', projectName: 'test-proj' };
  const result = await gateway.submit(plan, artifacts);
  assert.strictEqual(result.workflowId, 'wf-test-1');
  assert.ok(result.accepted);
  gateway.stopMonitoring('wf-test-1');
});

test('WORKFLOW_STATUS constants are defined', () => {
  assert.ok(WORKFLOW_STATUS.PENDING);
  assert.ok(WORKFLOW_STATUS.SUCCEEDED);
  assert.ok(WORKFLOW_STATUS.FAILED);
});

test('HEALTH_EVENTS constants are defined', () => {
  assert.ok(HEALTH_EVENTS.HEALTHY);
  assert.ok(HEALTH_EVENTS.UNHEALTHY);
});

test('getWorkflowState returns null for unknown workflow', () => {
  const gateway = new QGPSGateway({ pollIntervalMs: 99999 });
  assert.strictEqual(gateway.getWorkflowState('wf-unknown'), null);
});

// ── Full Pipeline ─────────────────────────────────────────────────────────────
process.stdout.write('\n[ Full Pipeline (HoareRuntime) ]\n');

testAsync('run() completes full pipeline', async () => {
  const runtime = new HoareRuntime({ tenantId: 'test', persistMemory: false, logLevel: 'ERROR' });
  const result  = await runtime.run(
    'Build a fintech payment API with authentication, postgres database, redis cache, and stripe payments',
    { source: 'test' },
    { submit: false }
  );
  assert.ok(result.envelope.requestId);
  assert.strictEqual(result.intent.industry.primary, 'fintech');
  assert.ok(result.plan.workflowId);
  assert.ok(result.artifacts.projectId);
  assert.ok(result.verification.passed);
  assert.strictEqual(result.submission, null);
});

testAsync('run() with submit=true returns submission', async () => {
  const runtime = new HoareRuntime({ persistMemory: false, logLevel: 'ERROR' });
  const result  = await runtime.run(
    'Build an ecommerce platform with cart and order management',
    {},
    { submit: true, monitor: false }
  );
  assert.ok(result.submission);
  assert.ok(result.submission.accepted);
  runtime.gateway.stopMonitoring(result.plan.workflowId);
});

testAsync('status() returns correct structure', async () => {
  const runtime = new HoareRuntime({ persistMemory: false, logLevel: 'ERROR' });
  await runtime.run('Build a healthcare API with EHR and FHIR endpoints', {}, { submit: false });
  const s = runtime.status();
  assert.ok(s.memory);
  assert.ok(s.versioning);
  assert.ok(typeof s.audit.entries === 'number' && s.audit.entries > 0);
});

testAsync('multi-tenant isolation in memory', async () => {
  const runtime1 = new HoareRuntime({ tenantId: 'acme', persistMemory: false, logLevel: 'ERROR' });
  const runtime2 = new HoareRuntime({ tenantId: 'beta', persistMemory: false, logLevel: 'ERROR' });
  await runtime1.run('Build a SaaS billing system with subscriptions', {}, {});
  await runtime2.run('Build a gaming leaderboard platform with matchmaking', {}, {});
  // Each runtime has its own memory
  assert.strictEqual(runtime1.projectMemory.listByTenant('acme').length, 1);
  assert.strictEqual(runtime2.projectMemory.listByTenant('beta').length, 1);
  assert.strictEqual(runtime1.projectMemory.listByTenant('beta').length, 0);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
// Wait for all async tests
setImmediate(() => {
  // Small delay to let async tests complete
  setTimeout(() => {
    const total = passed + failed;
    process.stdout.write(`\n=== Results: ${passed}/${total} passed ===\n`);
    if (failures.length > 0) {
      process.stdout.write('\nFailed tests:\n');
      failures.forEach(f => process.stdout.write(`  - ${f.name}: ${f.error}\n`));
    }
    if (failed > 0) process.exit(1);
  }, 300);
});
