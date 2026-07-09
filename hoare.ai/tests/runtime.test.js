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

// ── Agent Registry ────────────────────────────────────────────────────────────
process.stdout.write('\n[ AgentRegistry ]\n');

const { AgentRegistry }    = require('../registries/agent-registry');
const { SkillRegistry }    = require('../registries/skill-registry');
const { CapabilityMarketplace } = require('../marketplace/capability-marketplace');
const { UserMemory }       = require('../memory/user-memory');
const { SessionMemory }    = require('../memory/session-memory');
const { VectorInterface, cosineSimilarity } = require('../memory/vector-interface');
const { Organizations }    = require('../enterprise/organizations');
const { RBAC, SYSTEM_ROLES } = require('../enterprise/rbac');
const { ApiKeys }          = require('../enterprise/api-keys');
const { UsageMetering }    = require('../enterprise/usage-metering');
const { MultiTenancy }     = require('../enterprise/multi-tenancy');
const { WorkflowTracer }   = require('../observability/workflow-tracer');
const { AgentTracer }      = require('../observability/agent-tracer');
const { Metrics }          = require('../observability/metrics');
const { CostTracker, DEFAULT_PRICING } = require('../observability/cost-tracker');
const { HealthDashboard }  = require('../observability/health-dashboard');
const { PluginFramework }  = require('../plugins/plugin-framework');

test('registers and retrieves an agent', () => {
  const reg = new AgentRegistry();
  const agent = reg.register({ id: 'test:a1', name: 'TestAgent', kind: 'custom', version: '1.0.0', handler: async () => 'ok' });
  assert.strictEqual(agent.id, 'test:a1');
  assert.strictEqual(reg.get('test:a1').kind, 'custom');
});

test('lists agents by kind', () => {
  const reg = new AgentRegistry();
  reg.register({ id: 'a:intent', name: 'I', kind: 'intent',  version: '1.0.0', handler: async () => {} });
  reg.register({ id: 'a:custom', name: 'C', kind: 'custom',  version: '1.0.0', handler: async () => {} });
  assert.strictEqual(reg.list('intent').length, 1);
  assert.strictEqual(reg.list('custom').length, 1);
  assert.strictEqual(reg.list().length, 2);
});

test('deregisters an agent', () => {
  const reg = new AgentRegistry();
  reg.register({ id: 'a:tmp', name: 'T', kind: 'custom', version: '1.0.0', handler: async () => {} });
  assert.ok(reg.deregister('a:tmp'));
  assert.strictEqual(reg.get('a:tmp'), null);
});

testAsync('invokes an agent handler', async () => {
  const reg = new AgentRegistry();
  reg.register({ id: 'a:echo', name: 'Echo', kind: 'tool', version: '1.0.0', handler: async (input) => ({ echo: input }) });
  const result = await reg.invoke('a:echo', 'hello');
  assert.strictEqual(result.echo, 'hello');
});

test('throws on invoke of unknown agent', () => {
  const reg = new AgentRegistry();
  assert.rejects(() => reg.invoke('nonexistent'));
});

test('agent registry stats', () => {
  const reg = new AgentRegistry();
  reg.register({ id: 'sa:1', name: 'A', kind: 'intent', version: '1.0.0', handler: async () => {} });
  const s = reg.stats();
  assert.strictEqual(s.total, 1);
  assert.strictEqual(s.kinds.intent, 1);
});

// ── Skill Registry ────────────────────────────────────────────────────────────
process.stdout.write('\n[ SkillRegistry ]\n');

test('registers and executes a skill', async () => {
  const reg = new SkillRegistry();
  reg.register({ id: 'sk:greet', name: 'Greet', kind: 'tool', version: '1.0.0', execute: async ({ name }) => `Hello ${name}` });
  const r = await reg.execute('sk:greet', { name: 'World' });
  assert.strictEqual(r, 'Hello World');
});

test('loads skills from a plugin', () => {
  const reg = new SkillRegistry();
  const count = reg.loadPlugin({
    id: 'my-plugin',
    skills: [
      { id: 'p:sk1', name: 'S1', kind: 'ai',   version: '1.0.0', execute: async () => {} },
      { id: 'p:sk2', name: 'S2', kind: 'tool',  version: '1.0.0', execute: async () => {} },
    ],
  });
  assert.strictEqual(count, 2);
  assert.strictEqual(reg.list('ai').length, 1);
});

test('deregisters a skill', () => {
  const reg = new SkillRegistry();
  reg.register({ id: 'sk:del', name: 'D', kind: 'tool', version: '1.0.0', execute: async () => {} });
  assert.ok(reg.deregister('sk:del'));
  assert.strictEqual(reg.get('sk:del'), null);
});

// ── Capability Marketplace ────────────────────────────────────────────────────
process.stdout.write('\n[ CapabilityMarketplace ]\n');

test('loads a capability pack', () => {
  const mp = new CapabilityMarketplace();
  const pack = mp.load({ id: 'pack-auth', name: 'Auth Pack', version: '1.0.0' });
  assert.strictEqual(pack.id, 'pack-auth');
  assert.ok(mp.getPack('pack-auth'));
});

test('enables and disables a pack for a tenant', () => {
  const mp = new CapabilityMarketplace();
  mp.load({ id: 'pack-obs', name: 'Observability', version: '1.0.0' });
  mp.enable('tenant-x', 'pack-obs');
  assert.ok(mp.isEnabled('tenant-x', 'pack-obs'));
  mp.disable('tenant-x', 'pack-obs');
  assert.ok(!mp.isEnabled('tenant-x', 'pack-obs'));
});

test('unloads a pack and removes tenant enablements', () => {
  const mp = new CapabilityMarketplace();
  mp.load({ id: 'pack-rm', name: 'RemovePack', version: '1.0.0' });
  mp.enable('t1', 'pack-rm');
  assert.ok(mp.unload('pack-rm'));
  assert.ok(!mp.isEnabled('t1', 'pack-rm'));
});

// ── User Memory ───────────────────────────────────────────────────────────────
process.stdout.write('\n[ UserMemory ]\n');

test('sets and retrieves user profile', () => {
  const um = new UserMemory();
  um.setProfile('u1', { timezone: 'UTC', plan: 'pro' });
  const p = um.getProfile('u1');
  assert.strictEqual(p.timezone, 'UTC');
  assert.strictEqual(p.userId, 'u1');
});

test('appends user history', () => {
  const um = new UserMemory();
  um.addHistory('u2', { type: 'project_created', data: { name: 'My App' } });
  um.addHistory('u2', { type: 'project_created', data: { name: 'App 2' } });
  assert.strictEqual(um.getHistory('u2').length, 2);
});

test('forgets all user data', () => {
  const um = new UserMemory();
  um.setProfile('u3', { name: 'Alice' });
  um.addHistory('u3', { type: 'ping' });
  um.forget('u3');
  assert.strictEqual(um.getProfile('u3'), null);
  assert.strictEqual(um.getHistory('u3').length, 0);
});

// ── Session Memory ────────────────────────────────────────────────────────────
process.stdout.write('\n[ SessionMemory ]\n');

test('creates and retrieves a session', () => {
  const sm = new SessionMemory();
  const s  = sm.create({ userId: 'u1', tenantId: 't1' });
  assert.ok(s.sessionId.startsWith('sess-'));
  assert.strictEqual(sm.get(s.sessionId).userId, 'u1');
});

test('adds messages and auto-titles session', () => {
  const sm = new SessionMemory();
  const s  = sm.create({ userId: 'u2' });
  sm.addMessage(s.sessionId, { role: 'user', content: 'Build me a REST API' });
  const session = sm.get(s.sessionId);
  assert.strictEqual(session.messages.length, 1);
  assert.ok(session.title.length > 0);
});

testAsync('lists sessions by user newest first', async () => {
  const sm = new SessionMemory();
  const s1 = sm.create({ userId: 'u3' });
  // Small delay so timestamps differ
  await new Promise(r => setTimeout(r, 5));
  const s2 = sm.create({ userId: 'u3' });
  sm.addMessage(s2.sessionId, { role: 'user', content: 'Later session' });
  const list = sm.listByUser('u3');
  assert.strictEqual(list[0].sessionId, s2.sessionId);
});

test('deletes a session', () => {
  const sm = new SessionMemory();
  const s  = sm.create({ userId: 'u4' });
  assert.ok(sm.delete(s.sessionId));
  assert.strictEqual(sm.get(s.sessionId), null);
});

// ── Vector Interface ──────────────────────────────────────────────────────────
process.stdout.write('\n[ VectorInterface ]\n');

test('cosineSimilarity: identical vectors = 1', () => {
  assert.strictEqual(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test('cosineSimilarity: orthogonal vectors = 0', () => {
  assert.strictEqual(cosineSimilarity([1, 0], [0, 1]), 0);
});

testAsync('upserts and queries vectors', async () => {
  const vi = new VectorInterface();
  await vi.upsert('v1', [1, 0, 0], 'concept A');
  await vi.upsert('v2', [0, 1, 0], 'concept B');
  await vi.upsert('v3', [1, 0.1, 0], 'concept C (similar to A)');
  const results = await vi.query([1, 0, 0], 2);
  assert.strictEqual(results[0].id, 'v1');
  assert.ok(results[0].score > results[1].score);
});

testAsync('deletes a vector', async () => {
  const vi = new VectorInterface();
  await vi.upsert('vd', [1, 1], 'to delete');
  assert.ok(await vi.delete('vd'));
  const r = await vi.query([1, 1], 5);
  assert.ok(!r.some(x => x.id === 'vd'));
});

// ── Organizations ─────────────────────────────────────────────────────────────
process.stdout.write('\n[ Organizations ]\n');

test('creates and retrieves an organization', () => {
  const orgs = new Organizations();
  const org  = orgs.create({ name: 'Acme Corp', plan: 'enterprise' });
  assert.ok(org.orgId.startsWith('org-'));
  assert.strictEqual(orgs.get(org.orgId).name, 'Acme Corp');
});

test('adds and lists tenants in an org', () => {
  const orgs = new Organizations();
  const org  = orgs.create({ name: 'Widgets Inc' });
  orgs.addTenant(org.orgId, 'tenant-1');
  orgs.addTenant(org.orgId, 'tenant-2');
  assert.strictEqual(orgs.listTenants(org.orgId).length, 2);
  assert.strictEqual(orgs.getByTenant('tenant-1').orgId, org.orgId);
});

// ── RBAC ──────────────────────────────────────────────────────────────────────
process.stdout.write('\n[ RBAC ]\n');

test('system roles are pre-defined', () => {
  const r = new RBAC();
  assert.ok(r.listRoles().some(role => role.name === 'admin'));
  assert.ok(r.listRoles().some(role => role.name === 'viewer'));
});

test('assigns role and checks permission', () => {
  const r = new RBAC();
  r.assign('t1', 'alice', 'admin');
  assert.ok(r.can('t1', 'alice', 'write'));
  assert.ok(r.can('t1', 'alice', 'delete'));
  assert.ok(!r.can('t1', 'alice', 'nonexistent_perm'));
});

test('owner has wildcard permission', () => {
  const r = new RBAC();
  r.assign('t1', 'bob', 'owner');
  assert.ok(r.can('t1', 'bob', 'any_arbitrary_perm'));
});

test('viewer cannot write', () => {
  const r = new RBAC();
  r.assign('t1', 'carol', 'viewer');
  assert.ok(!r.can('t1', 'carol', 'write'));
  assert.ok(r.can('t1', 'carol', 'read'));
});

test('defines a custom role with inheritance', () => {
  const r = new RBAC();
  r.defineRole({ name: 'editor', permissions: ['publish'], inherits: 'member' });
  r.assign('t1', 'dave', 'editor');
  assert.ok(r.can('t1', 'dave', 'read'));    // inherited from member
  assert.ok(r.can('t1', 'dave', 'publish')); // own permission
});

test('revokes a role', () => {
  const r = new RBAC();
  r.assign('t1', 'eve', 'admin');
  r.revoke('t1', 'eve', 'admin');
  assert.ok(!r.can('t1', 'eve', 'write'));
});

// ── API Keys ──────────────────────────────────────────────────────────────────
process.stdout.write('\n[ ApiKeys ]\n');

test('issues and validates an API key', () => {
  const ak = new ApiKeys();
  const { raw, record } = ak.issue({ tenantId: 't1', name: 'CI key' });
  assert.ok(raw.startsWith('hk_'));
  const validated = ak.validate(raw);
  assert.ok(validated);
  assert.strictEqual(validated.tenantId, 't1');
});

test('revoked key fails validation', () => {
  const ak = new ApiKeys();
  const { raw, record } = ak.issue({ tenantId: 't1', name: 'Temp key' });
  ak.revoke(record.hash);
  assert.strictEqual(ak.validate(raw), null);
});

test('expired key fails validation', () => {
  const ak = new ApiKeys();
  const past = new Date(Date.now() - 1000).toISOString();
  const { raw } = ak.issue({ tenantId: 't1', name: 'Old key', expiresAt: past });
  assert.strictEqual(ak.validate(raw), null);
});

test('lists keys by tenant', () => {
  const ak = new ApiKeys();
  ak.issue({ tenantId: 'ta', name: 'K1' });
  ak.issue({ tenantId: 'ta', name: 'K2' });
  ak.issue({ tenantId: 'tb', name: 'K3' });
  assert.strictEqual(ak.listByTenant('ta').length, 2);
  assert.strictEqual(ak.listByTenant('tb').length, 1);
});

// ── Usage Metering ────────────────────────────────────────────────────────────
process.stdout.write('\n[ UsageMetering ]\n');

test('records and retrieves usage', () => {
  const um = new UsageMetering();
  um.record('t1', { type: 'api_call', quantity: 1 });
  um.record('t1', { type: 'api_call', quantity: 5 });
  um.record('t1', { type: 'token_usage', quantity: 1000 });
  const usage = um.getUsage('t1');
  assert.strictEqual(usage.requests, 6);
  assert.strictEqual(usage.tokens, 1000);
});

test('within quota returns false when over limit', () => {
  const um = new UsageMetering();
  um.setQuota('t2', { requestsPerMonth: 3 });
  um.record('t2', { type: 'api_call', quantity: 5 });
  assert.ok(!um.withinQuota('t2', 'requests'));
});

test('within quota returns true when under limit', () => {
  const um = new UsageMetering();
  um.setQuota('t3', { requestsPerMonth: 100 });
  um.record('t3', { type: 'api_call', quantity: 10 });
  assert.ok(um.withinQuota('t3', 'requests'));
});

// ── Multi-tenancy ─────────────────────────────────────────────────────────────
process.stdout.write('\n[ MultiTenancy ]\n');

test('creates and retrieves a tenant', () => {
  const mt = new MultiTenancy();
  const t  = mt.create({ name: 'Acme', plan: 'growth' });
  assert.ok(t.tenantId.startsWith('tenant-'));
  assert.strictEqual(mt.get(t.tenantId).name, 'Acme');
});

test('suspends and activates a tenant', () => {
  const mt = new MultiTenancy();
  const t  = mt.create({ name: 'Beta Corp' });
  mt.suspend(t.tenantId);
  assert.ok(!mt.isActive(t.tenantId));
  mt.activate(t.tenantId);
  assert.ok(mt.isActive(t.tenantId));
});

// ── Workflow Tracer ───────────────────────────────────────────────────────────
process.stdout.write('\n[ WorkflowTracer ]\n');

test('starts and ends a trace', () => {
  const wt    = new WorkflowTracer();
  const trace = wt.startTrace({ workflowId: 'wf-trace-1' });
  assert.ok(trace.traceId.startsWith('trace-'));
  wt.endTrace(trace.traceId, { success: true });
  const finished = wt.get(trace.traceId);
  assert.strictEqual(finished.status, 'ok');
  assert.ok(finished.durationMs >= 0);
});

test('adds and ends spans within a trace', () => {
  const wt    = new WorkflowTracer();
  const trace = wt.startTrace({ workflowId: 'wf-trace-2' });
  const span  = wt.addSpan(trace.traceId, { name: 'intent-analysis', kind: 'internal' });
  assert.ok(span.spanId.startsWith('span-'));
  wt.endSpan(trace.traceId, span.spanId, { success: true });
  assert.strictEqual(wt.get(trace.traceId).spans[0].status, 'ok');
});

test('workflow tracer stats', () => {
  const wt = new WorkflowTracer();
  wt.startTrace({ workflowId: 'wf-s1' });
  const s = wt.stats();
  assert.strictEqual(s.running, 1);
});

// ── Agent Tracer ──────────────────────────────────────────────────────────────
process.stdout.write('\n[ AgentTracer ]\n');

test('starts and ends an agent span', () => {
  const at   = new AgentTracer();
  const span = at.startSpan({ agentId: 'intent-agent', agentName: 'IntentAgent', traceId: 'trace-1' });
  assert.ok(span.spanId.startsWith('aspan-'));
  at.endSpan(span.spanId, { output: { industry: 'fintech' }, success: true });
  const ended = at.get(span.spanId);
  assert.strictEqual(ended.status, 'ok');
  assert.ok(ended.output.industry === 'fintech');
});

test('lists spans by trace', () => {
  const at = new AgentTracer();
  at.startSpan({ agentId: 'a1', agentName: 'A1', traceId: 'tid-1' });
  at.startSpan({ agentId: 'a2', agentName: 'A2', traceId: 'tid-1' });
  at.startSpan({ agentId: 'a3', agentName: 'A3', traceId: 'tid-2' });
  assert.strictEqual(at.listByTrace('tid-1').length, 2);
  assert.strictEqual(at.listByTrace('tid-2').length, 1);
});

// ── Metrics ───────────────────────────────────────────────────────────────────
process.stdout.write('\n[ Metrics ]\n');

test('increments a counter', () => {
  const m = new Metrics();
  m.increment('requests');
  m.increment('requests', 5);
  assert.strictEqual(m.getCounter('requests'), 6);
});

test('sets a gauge', () => {
  const m = new Metrics();
  m.gauge('active_sessions', 42);
  assert.strictEqual(m.getGauge('active_sessions'), 42);
});

test('histogram summary has correct shape', () => {
  const m = new Metrics();
  for (let i = 1; i <= 100; i++) m.observe('latency_ms', i);
  const s = m.getSummary('latency_ms');
  assert.strictEqual(s.count, 100);
  assert.strictEqual(s.min,   1);
  assert.strictEqual(s.max,   100);
  assert.ok(s.p95 >= s.p50);
});

test('dump returns all metric types', () => {
  const m = new Metrics();
  m.increment('hits');
  m.gauge('workers', 4);
  m.observe('dur', 50);
  const d = m.dump();
  assert.ok('hits'    in d.counters);
  assert.ok('workers' in d.gauges);
  assert.ok('dur'     in d.histograms);
});

// ── Cost Tracker ──────────────────────────────────────────────────────────────
process.stdout.write('\n[ CostTracker ]\n');

test('records token cost', () => {
  const ct = new CostTracker();
  const e  = ct.recordTokens({ tenantId: 't1', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500 });
  assert.ok(e.totalCostUsd > 0);
  assert.ok(ct.getTotals('t1').totalCostUsd > 0);
});

test('uses default pricing for unknown model', () => {
  const ct = new CostTracker();
  const e  = ct.recordTokens({ tenantId: 't1', model: 'unknown-model', inputTokens: 1000, outputTokens: 0 });
  assert.ok(e.totalCostUsd > 0);
});

test('global summary aggregates across tenants', () => {
  const ct = new CostTracker();
  ct.recordTokens({ tenantId: 't1', model: 'gpt-4o-mini', inputTokens: 500, outputTokens: 200 });
  ct.recordTokens({ tenantId: 't2', model: 'gpt-4o-mini', inputTokens: 300, outputTokens: 100 });
  const s = ct.globalSummary();
  assert.strictEqual(s.tenants, 2);
  assert.ok(s.totalCostUsd > 0);
});

test('DEFAULT_PRICING contains gpt-4o', () => {
  assert.ok(DEFAULT_PRICING['gpt-4o']);
  assert.ok(DEFAULT_PRICING['gpt-4o'].input > 0);
});

// ── Health Dashboard ──────────────────────────────────────────────────────────
process.stdout.write('\n[ HealthDashboard ]\n');

testAsync('reports healthy when all checks pass', async () => {
  const hd = new HealthDashboard();
  hd.register('db',  async () => ({ healthy: true }),  { critical: true });
  hd.register('api', async () => ({ healthy: true }));
  const r = await hd.check(true);
  assert.strictEqual(r.status, 'healthy');
  assert.ok(r.services.db.healthy);
});

testAsync('reports unhealthy when critical check fails', async () => {
  const hd = new HealthDashboard();
  hd.register('db', async () => ({ healthy: false }), { critical: true });
  const r = await hd.check(true);
  assert.strictEqual(r.status, 'unhealthy');
});

testAsync('reports degraded when non-critical check fails', async () => {
  const hd = new HealthDashboard();
  hd.register('db',     async () => ({ healthy: true }),  { critical: true });
  hd.register('cache',  async () => ({ healthy: false }));
  const r = await hd.check(true);
  assert.strictEqual(r.status, 'degraded');
});

testAsync('handles check throwing an error gracefully', async () => {
  const hd = new HealthDashboard();
  hd.register('broken', async () => { throw new Error('connection refused'); });
  const r = await hd.check(true);
  assert.ok(r.services.broken.error);
  assert.ok(!r.services.broken.healthy);
});

// ── Plugin Framework ──────────────────────────────────────────────────────────
process.stdout.write('\n[ PluginFramework ]\n');

test('loads a plugin with agents, skills, and packs', () => {
  const pf = new PluginFramework();
  const manifest = pf.load({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    agents: [{ id: 'my-plugin:agent1', name: 'Agent1', kind: 'custom', version: '1.0.0', handler: async () => {} }],
    skills: [{ id: 'my-plugin:skill1', name: 'Skill1', kind: 'tool',   version: '1.0.0', execute: async () => {} }],
    packs:  [{ id: 'my-plugin:pack1',  name: 'Pack1',  version: '1.0.0' }],
    templates: [{ id: 'tpl1', name: 'CI Pipeline', description: 'Basic CI' }],
  });
  assert.strictEqual(manifest.summary.agents, 1);
  assert.strictEqual(manifest.summary.skills, 1);
  assert.strictEqual(manifest.summary.packs,  1);
  assert.strictEqual(manifest.summary.templates, 1);
});

test('lists and retrieves loaded plugins', () => {
  const pf = new PluginFramework();
  pf.load({ id: 'plug-a', name: 'A', version: '1.0.0' });
  pf.load({ id: 'plug-b', name: 'B', version: '2.0.0' });
  assert.strictEqual(pf.list().length, 2);
  assert.ok(pf.get('plug-a'));
});

test('lists workflow templates across plugins', () => {
  const pf = new PluginFramework();
  pf.load({ id: 'p1', name: 'P1', version: '1.0.0', templates: [{ id: 't1', name: 'CI' }, { id: 't2', name: 'CD' }] });
  pf.load({ id: 'p2', name: 'P2', version: '1.0.0', templates: [{ id: 't3', name: 'Release' }] });
  assert.strictEqual(pf.listTemplates().length, 3);
});

test('unloads a plugin', () => {
  const pf = new PluginFramework();
  pf.load({ id: 'tmp-plugin', name: 'Tmp', version: '1.0.0' });
  assert.ok(pf.unload('tmp-plugin'));
  assert.strictEqual(pf.get('tmp-plugin'), null);
});

test('reloading a plugin replaces the previous version', () => {
  const pf = new PluginFramework();
  pf.load({ id: 'ver-plugin', name: 'V1', version: '1.0.0' });
  pf.load({ id: 'ver-plugin', name: 'V2', version: '2.0.0' });
  assert.strictEqual(pf.get('ver-plugin').version, '2.0.0');
  assert.strictEqual(pf.list().length, 1);
});

// ── Extended HoareRuntime status() ────────────────────────────────────────────
process.stdout.write('\n[ Extended HoareRuntime status() ]\n');

testAsync('status() includes extended service stats', async () => {
  const runtime = new HoareRuntime({ persistMemory: false, logLevel: 'ERROR' });
  const s = runtime.status();
  assert.ok(s.agents);
  assert.ok(s.skills);
  assert.ok(s.marketplace);
  assert.ok(s.enterprise);
  assert.ok(s.observability);
  assert.ok(s.plugins);
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
