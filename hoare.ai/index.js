'use strict';

/**
 * HOARE.ai Project Factory Runtime — Main Orchestrator
 *
 * Wires all agents and services together into a single, reusable runtime.
 * Designed for multi-tenant, enterprise deployment.
 *
 * Pipeline:
 *   PromptReceiverAgent → IntentAgent → PlannerAgent → ProjectFactoryAgent
 *                                                          ↓
 *                                                   VerificationAgent
 *                                                          ↓
 *                                                     QGPSGateway
 */

const { PromptReceiverAgent }  = require('./agents/prompt-receiver');
const { IntentAgent }          = require('./agents/intent-agent');
const { PlannerAgent }         = require('./agents/planner-agent');
const { ProjectFactoryAgent }  = require('./agents/project-factory');
const { VerificationAgent }    = require('./agents/verification-agent');
const { QGPSGateway }          = require('./gateway/qgps-gateway');
const { ProjectMemory }        = require('./memory/project-memory');
const { WorkflowVersioning }   = require('./versioning/workflow-versioning');
const { AuditLog }             = require('./audit/audit-log');
const logger                   = require('./utils/logger');

// ── Extended services (additive — do not break existing pipeline) ─────────────
const { AgentRegistry }          = require('./registries/agent-registry');
const { SkillRegistry }          = require('./registries/skill-registry');
const { CapabilityMarketplace }  = require('./marketplace/capability-marketplace');
const { UserMemory }             = require('./memory/user-memory');
const { SessionMemory }          = require('./memory/session-memory');
const { VectorInterface }        = require('./memory/vector-interface');
const { Organizations }          = require('./enterprise/organizations');
const { RBAC }                   = require('./enterprise/rbac');
const { ApiKeys }                = require('./enterprise/api-keys');
const { UsageMetering }          = require('./enterprise/usage-metering');
const { MultiTenancy }           = require('./enterprise/multi-tenancy');
const { WorkflowTracer }         = require('./observability/workflow-tracer');
const { AgentTracer }            = require('./observability/agent-tracer');
const { Metrics }                = require('./observability/metrics');
const { CostTracker }            = require('./observability/cost-tracker');
const { HealthDashboard }        = require('./observability/health-dashboard');
const { PluginFramework }        = require('./plugins/plugin-framework');

class HoareRuntime {
  /**
   * @param {object} [options]
   * @param {string} [options.tenantId]          - Tenant identifier for multi-tenancy
   * @param {string} [options.qgpsBaseUrl]       - QGPS Control Plane URL
   * @param {string} [options.qgpsApiKey]        - QGPS API key
   * @param {number} [options.pollIntervalMs]    - Gateway poll interval
   * @param {string} [options.memoryStorePath]   - Path for persistent project memory
   * @param {boolean} [options.persistMemory]    - Enable disk persistence (default: true)
   * @param {string} [options.logLevel]          - Log level: DEBUG|INFO|WARN|ERROR
   */
  constructor(options = {}) {
    if (options.logLevel) logger.setLevel(options.logLevel);

    // Shared infrastructure
    this.auditLog           = new AuditLog();
    this.projectMemory      = new ProjectMemory({
      storePath: options.memoryStorePath,
      persist: options.persistMemory !== false,
    });
    this.workflowVersioning = new WorkflowVersioning();

    // Agents (inject shared services)
    this.promptReceiver   = new PromptReceiverAgent({
      tenantId: options.tenantId || 'default',
      auditLog: this.auditLog,
    });
    this.intentAgent      = new IntentAgent({ auditLog: this.auditLog });
    this.plannerAgent     = new PlannerAgent({
      auditLog: this.auditLog,
      workflowVersioning: this.workflowVersioning,
    });
    this.projectFactory   = new ProjectFactoryAgent({
      auditLog: this.auditLog,
      projectMemory: this.projectMemory,
    });
    this.verificationAgent = new VerificationAgent({ auditLog: this.auditLog });

    // Gateway
    this.gateway = new QGPSGateway({
      baseUrl:       options.qgpsBaseUrl    || process.env.QGPS_BASE_URL,
      apiKey:        options.qgpsApiKey     || process.env.QGPS_API_KEY,
      pollIntervalMs: options.pollIntervalMs || 5000,
      auditLog: this.auditLog,
    });

    // Forward gateway events to runtime-level listeners
    this.gateway.on('workflow:succeeded',  e => this._onWorkflowSucceeded(e));
    this.gateway.on('workflow:failed',     e => this._onWorkflowFailed(e));
    this.gateway.on('workflow:remediating',e => this._onRemediation(e));

    // ── Extended services ──────────────────────────────────────────────────
    this.agentRegistry        = new AgentRegistry();
    this.skillRegistry        = new SkillRegistry();
    this.capabilityMarketplace = new CapabilityMarketplace();
    this.userMemory           = new UserMemory();
    this.sessionMemory        = new SessionMemory();
    this.vectorInterface      = new VectorInterface();
    this.organizations        = new Organizations();
    this.rbac                 = new RBAC();
    this.apiKeys              = new ApiKeys();
    this.usageMetering        = new UsageMetering();
    this.multiTenancy         = new MultiTenancy();
    this.workflowTracer       = new WorkflowTracer();
    this.agentTracer          = new AgentTracer();
    this.metrics              = new Metrics();
    this.costTracker          = new CostTracker();
    this.healthDashboard      = new HealthDashboard();
    this.pluginFramework      = new PluginFramework();

    // Register built-in health checks
    this.healthDashboard.register('runtime',  () => ({ healthy: true }),            { critical: true });
    this.healthDashboard.register('memory',   () => ({ healthy: true, details: this.projectMemory.stats() }));
    this.healthDashboard.register('gateway',  async () => {
      const status = this.gateway.listWorkflows();
      return { healthy: true, details: { trackedWorkflows: status.length } };
    });

    logger.info('HoareRuntime', 'Runtime initialized', {
      tenantId: options.tenantId || 'default',
    });
  }

  /**
   * Main entry point: runs the full pipeline for a prompt.
   *
   * @param {string} prompt   - Natural language project description
   * @param {object} [meta]   - Optional metadata (userId, source, etc.)
   * @param {object} [opts]
   * @param {boolean} [opts.submit]   - Whether to submit to QGPS (default: false)
   * @param {boolean} [opts.monitor]  - Whether to start monitoring after submit (default: false)
   * @returns {Promise<{ envelope, intent, plan, artifacts, verification }>}
   */
  async run(prompt, meta = {}, opts = {}) {
    // Step 1: Receive & normalize prompt
    const envelope = this.promptReceiver.receive(prompt, meta);
    this.promptReceiver.markForwarded(envelope);

    // Step 2: Analyze intent
    const intent = this.intentAgent.analyze(envelope);

    // Step 3: Build execution plan
    const plan = this.plannerAgent.plan(intent);

    // Step 4: Generate project artifacts
    const artifacts = this.projectFactory.generate(plan, intent, envelope);

    // Step 5: Verify artifacts
    const verification = this.verificationAgent.verify(artifacts);

    if (!verification.passed) {
      logger.warn('HoareRuntime', 'Verification did not pass fully', {
        requestId: envelope.requestId,
        score: verification.score,
        failedChecks: verification.checks.filter(c => !c.passed).map(c => c.name),
      });
    }

    // Step 6 (optional): Submit to QGPS
    let submission = null;
    if (opts.submit) {
      submission = await this.gateway.submit(plan, artifacts);
      if (opts.monitor) {
        this.gateway.startMonitoring(plan.workflowId);
      }
    }

    const result = {
      envelope,
      intent,
      plan,
      artifacts,
      verification,
      submission,
    };

    this.auditLog.record({
      event: 'PIPELINE_COMPLETE',
      requestId: envelope.requestId,
      tenantId: envelope.tenantId,
      projectId: artifacts.projectId,
      projectName: artifacts.projectName,
      verificationScore: verification.score,
    });

    return result;
  }

  /**
   * Delivers a health event from the QGPS Control Plane to the gateway.
   * @param {object} event
   */
  receiveHealthEvent(event) {
    this.gateway.receiveHealthEvent(event);
  }

  /**
   * Returns a summary of the runtime state.
   * @returns {object}
   */
  status() {
    return {
      memory:       this.projectMemory.stats(),
      versioning:   this.workflowVersioning.stats(),
      audit:        { entries: this.auditLog.count() },
      workflows:    this.gateway.listWorkflows(),
      // Extended service stats
      agents:       this.agentRegistry.stats(),
      skills:       this.skillRegistry.stats(),
      marketplace:  this.capabilityMarketplace.stats(),
      userMemory:   this.userMemory.stats(),
      sessionMemory: this.sessionMemory.stats(),
      enterprise: {
        organizations: this.organizations.stats(),
        rbac:          this.rbac.stats(),
        apiKeys:       this.apiKeys.stats(),
        usageMetering: this.usageMetering.stats(),
        tenants:       this.multiTenancy.stats(),
      },
      observability: {
        traces:  this.workflowTracer.stats(),
        spans:   this.agentTracer.stats(),
        metrics: this.metrics.stats(),
        costs:   this.costTracker.stats(),
        health:  this.healthDashboard.stats(),
      },
      plugins: this.pluginFramework.stats(),
    };
  }

  // ── Private event handlers ───────────────────────────────────────────────────

  _onWorkflowSucceeded({ workflowId }) {
    logger.info('HoareRuntime', 'Workflow succeeded', { workflowId });
  }

  _onWorkflowFailed({ workflowId }) {
    logger.warn('HoareRuntime', 'Workflow failed', { workflowId });
  }

  _onRemediation({ workflowId, failedTask }) {
    logger.info('HoareRuntime', 'Remediation triggered', { workflowId, failedTask });
  }
}

module.exports = {
  HoareRuntime,
  // Registries
  AgentRegistry,
  SkillRegistry,
  // Marketplace
  CapabilityMarketplace,
  // Memory
  UserMemory,
  SessionMemory,
  VectorInterface,
  // Enterprise
  Organizations,
  RBAC,
  ApiKeys,
  UsageMetering,
  MultiTenancy,
  // Observability
  WorkflowTracer,
  AgentTracer,
  Metrics,
  CostTracker,
  HealthDashboard,
  // Plugin Framework
  PluginFramework,
};
