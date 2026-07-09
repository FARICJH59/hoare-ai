'use strict';

/**
 * Planner Agent
 *
 * Responsibilities:
 *  - Convert intent into executable workflow graphs (DAGs)
 *  - Select capability packs
 *  - Generate deployment plans
 */

const { generateWorkflowId } = require('../utils/id-generator');
const logger = require('../utils/logger');

// ─── Capability Packs ─────────────────────────────────────────────────────────
// Each pack bundles a set of capabilities with recommended tech choices

const CAPABILITY_PACKS = {
  web_api: {
    name: 'Web API Pack',
    capabilities: ['api_gateway', 'authentication', 'authorization', 'database'],
    stack: { runtime: 'Node.js', framework: 'Express', orm: 'Prisma' },
  },
  realtime_web: {
    name: 'Real-Time Web Pack',
    capabilities: ['api_gateway', 'realtime', 'caching', 'authentication'],
    stack: { runtime: 'Node.js', framework: 'Fastify', broker: 'NATS' },
  },
  data_platform: {
    name: 'Data Platform Pack',
    capabilities: ['database', 'messaging', 'search', 'monitoring'],
    stack: { runtime: 'Node.js', db: 'PostgreSQL', queue: 'Kafka', search: 'Elasticsearch' },
  },
  ai_backend: {
    name: 'AI Backend Pack',
    capabilities: ['ai_ml', 'database', 'api_gateway', 'caching', 'storage'],
    stack: { runtime: 'Node.js', ai: 'HOARE-AI Engine', vector_db: 'pgvector' },
  },
  payment_platform: {
    name: 'Payment Platform Pack',
    capabilities: ['payments', 'authentication', 'database', 'messaging', 'monitoring'],
    stack: { runtime: 'Node.js', payments: 'Stripe', db: 'PostgreSQL' },
  },
  enterprise_saas: {
    name: 'Enterprise SaaS Pack',
    capabilities: ['multi_tenancy', 'authentication', 'authorization', 'database', 'messaging', 'monitoring', 'ci_cd'],
    stack: { runtime: 'Node.js', auth: 'Keycloak', db: 'PostgreSQL', queue: 'RabbitMQ' },
  },
  full_stack: {
    name: 'Full Stack Pack',
    capabilities: ['api_gateway', 'authentication', 'authorization', 'database', 'storage', 'caching', 'email', 'monitoring'],
    stack: { runtime: 'Node.js', framework: 'Express', db: 'PostgreSQL', cache: 'Redis' },
  },
};

/**
 * Selects the best-matching capability packs for the given intent.
 * @param {object} intent
 * @returns {string[]} Selected pack keys
 */
function selectCapabilityPacks(intent) {
  const needed = new Set(intent.capabilities);
  const packScores = [];

  for (const [key, pack] of Object.entries(CAPABILITY_PACKS)) {
    const matchCount = pack.capabilities.filter(c => needed.has(c)).length;
    const coverage = matchCount / needed.size;
    if (coverage > 0.3) {
      packScores.push({ key, pack, score: coverage * matchCount });
    }
  }

  packScores.sort((a, b) => b.score - a.score);

  // Return top 1-2 packs that together cover requirements well
  const selected = [];
  const covered = new Set();
  for (const { key, pack } of packScores) {
    if (selected.length >= 2) break;
    const newCaps = pack.capabilities.filter(c => !covered.has(c) && needed.has(c));
    if (newCaps.length > 0 || selected.length === 0) {
      selected.push(key);
      pack.capabilities.forEach(c => covered.add(c));
    }
  }

  return selected.length > 0 ? selected : ['full_stack'];
}

// ─── Workflow Graph Builder ───────────────────────────────────────────────────

/**
 * Builds a DAG (directed acyclic graph) of workflow tasks from intent.
 * Each node has: id, type, label, dependsOn[], config
 *
 * @param {object} intent
 * @param {string[]} selectedPacks
 * @returns {object} Workflow graph
 */
function buildWorkflowGraph(intent, selectedPacks) {
  const nodes = [];
  const edges = [];
  let seq = 0;

  const node = (type, label, dependsOn = [], config = {}) => {
    const id = `task-${++seq}`;
    nodes.push({ id, type, label, dependsOn, config });
    dependsOn.forEach(dep => edges.push({ from: dep, to: id }));
    return id;
  };

  // Phase 1: Setup
  const repoSetup   = node('repo_scaffold',     'Scaffold Repository Structure');
  const envSetup    = node('env_config',         'Configure Environment', [repoSetup]);
  const infraSetup  = node('infra_provision',    'Provision Infrastructure',  [envSetup], {
    services: intent.infrastructure.map(i => i.service),
  });

  // Phase 2: Core Implementation
  const dbMigration  = node('db_migration',     'Run Database Migrations',   [infraSetup]);
  const apiScaffold  = node('api_scaffold',     'Scaffold API Layer',        [infraSetup]);
  const authSetup    = intent.capabilities.includes('authentication')
    ? node('auth_setup',  'Configure Authentication',  [apiScaffold])
    : null;

  // Phase 3: Capability-specific tasks
  const capTasks = [];
  for (const cap of intent.capabilities) {
    if (['authentication', 'api_gateway'].includes(cap)) continue;
    const depId = authSetup || apiScaffold;
    const id = node('capability_setup', `Configure ${cap}`, [depId], { capability: cap });
    capTasks.push(id);
  }

  // Phase 4: CI/CD + Containers
  const deps4 = capTasks.length > 0 ? capTasks : [dbMigration, apiScaffold];
  const cicdSetup = node('cicd_setup',         'Generate CI/CD Pipelines',  deps4);
  const dockerSetup = node('docker_setup',     'Generate Docker Templates', deps4);
  const k8sSetup   = node('k8s_setup',         'Generate Kubernetes Manifests', [dockerSetup]);

  // Phase 5: Verification
  const verify = node('verification',         'Verify Generated Artifacts', [cicdSetup, k8sSetup]);
  const archive = node('archive',             'Archive & Version Artifacts', [verify]);

  return {
    nodes,
    edges,
    metadata: {
      phases: 5,
      totalTasks: nodes.length,
      selectedPacks,
      entryNode: nodes[0].id,
      exitNode: archive,
    },
  };
}

// ─── Deployment Plan Generator ────────────────────────────────────────────────

const DEPLOYMENT_STRATEGIES = {
  low:        { strategy: 'single-node',    replicas: 1, autoscale: false, rollout: 'recreate' },
  medium:     { strategy: 'rolling-update', replicas: 2, autoscale: false, rollout: 'rolling'  },
  high:       { strategy: 'blue-green',     replicas: 3, autoscale: true,  rollout: 'blue-green' },
  enterprise: { strategy: 'canary',         replicas: 5, autoscale: true,  rollout: 'canary'   },
};

/**
 * Generates a deployment plan based on complexity and infrastructure.
 * @param {object} intent
 * @returns {object}
 */
function generateDeploymentPlan(intent) {
  const complexity = intent.complexity.level;
  const strategy = DEPLOYMENT_STRATEGIES[complexity] || DEPLOYMENT_STRATEGIES.medium;

  return {
    strategy: strategy.strategy,
    replicas: strategy.replicas,
    autoscale: strategy.autoscale,
    rolloutType: strategy.rollout,
    environments: complexity === 'enterprise'
      ? ['dev', 'staging', 'uat', 'prod']
      : complexity === 'high'
        ? ['dev', 'staging', 'prod']
        : ['dev', 'prod'],
    infrastructure: intent.infrastructure,
    resourceLimits: {
      cpu: complexity === 'enterprise' ? '2000m' : complexity === 'high' ? '1000m' : '500m',
      memory: complexity === 'enterprise' ? '2Gi' : complexity === 'high' ? '1Gi' : '512Mi',
    },
    healthCheck: {
      path: '/health',
      intervalSeconds: 30,
      timeoutSeconds: 5,
      failureThreshold: 3,
    },
  };
}

// ─── Planner Agent class ──────────────────────────────────────────────────────

class PlannerAgent {
  /**
   * @param {object} [options]
   * @param {object} [options.auditLog] - AuditLog instance
   * @param {object} [options.workflowVersioning] - WorkflowVersioning instance
   */
  constructor(options = {}) {
    this.auditLog = options.auditLog || null;
    this.workflowVersioning = options.workflowVersioning || null;
  }

  /**
   * Converts an intent analysis result into an execution plan.
   * @param {object} intent - Result from IntentAgent.analyze()
   * @returns {object} Plan
   */
  plan(intent) {
    const { requestId, tenantId } = intent;
    logger.info('PlannerAgent', 'Building execution plan', { requestId });

    const selectedPacks   = selectCapabilityPacks(intent);
    const workflowGraph   = buildWorkflowGraph(intent, selectedPacks);
    const deploymentPlan  = generateDeploymentPlan(intent);
    const workflowId      = generateWorkflowId();

    const plan = {
      workflowId,
      requestId,
      tenantId,
      selectedPacks: selectedPacks.map(k => ({ key: k, ...CAPABILITY_PACKS[k] })),
      workflowGraph,
      deploymentPlan,
      plannedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    // Version the workflow if versioning service is available
    if (this.workflowVersioning) {
      this.workflowVersioning.save(workflowId, plan);
    }

    logger.info('PlannerAgent', 'Plan ready', {
      requestId,
      workflowId,
      tasks: workflowGraph.metadata.totalTasks,
      deployStrategy: deploymentPlan.strategy,
    });

    if (this.auditLog) {
      this.auditLog.record({
        event: 'PLAN_CREATED',
        requestId,
        tenantId,
        workflowId,
        tasks: workflowGraph.metadata.totalTasks,
      });
    }

    return plan;
  }
}

module.exports = {
  PlannerAgent,
  selectCapabilityPacks,
  buildWorkflowGraph,
  generateDeploymentPlan,
  CAPABILITY_PACKS,
};
