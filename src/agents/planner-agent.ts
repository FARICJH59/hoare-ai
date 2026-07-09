/**
 * Planner Agent
 * Converts intent analysis into an executable DAG workflow plan.
 */

import type { IntentResult, Capability } from './intent-agent';

export interface WorkflowTask {
  id: string;
  name: string;
  type: string;
  capability?: string;
  depends_on: string[];
  config: Record<string, unknown>;
  timeout_seconds: number;
  retry_policy: { max_attempts: number; backoff_seconds: number };
}

export interface WorkflowPlan {
  workflowId: string;
  requestId: string;
  tenantId: string;
  version: string;
  selectedPacks: string[];
  techStack: Record<string, string>;
  deploymentStrategy: string;
  tasks: WorkflowTask[];
  estimatedDuration: string;
  createdAt: string;
}

// ─── Capability Packs ─────────────────────────────────────────────────────────

const CAPABILITY_PACKS: Record<string, { capabilities: Capability[]; stack: Record<string, string> }> = {
  web_api:         { capabilities: ['api_gateway', 'authentication', 'authorization', 'database'], stack: { runtime: 'Node.js', framework: 'Express', orm: 'Prisma' } },
  realtime_web:    { capabilities: ['api_gateway', 'realtime', 'caching', 'authentication'],        stack: { runtime: 'Node.js', framework: 'Fastify', broker: 'NATS' } },
  data_platform:   { capabilities: ['database', 'messaging', 'search', 'monitoring'],               stack: { db: 'PostgreSQL', queue: 'Kafka', search: 'Elasticsearch' } },
  ai_backend:      { capabilities: ['ai_ml', 'database', 'api_gateway', 'caching', 'storage'],      stack: { ai: 'HOARE-AI Engine', vector_db: 'pgvector' } },
  payment_platform:{ capabilities: ['payments', 'authentication', 'database', 'messaging', 'monitoring'], stack: { payments: 'Stripe', db: 'PostgreSQL' } },
  enterprise_saas: { capabilities: ['multi_tenancy', 'authentication', 'authorization', 'database', 'messaging', 'monitoring', 'ci_cd'], stack: { auth: 'Keycloak', db: 'PostgreSQL' } },
  full_stack:      { capabilities: ['api_gateway', 'authentication', 'authorization', 'database', 'storage', 'caching', 'email', 'monitoring'], stack: { framework: 'Express', db: 'PostgreSQL', cache: 'Redis' } },
};

function selectPacks(intent: IntentResult): { names: string[]; stack: Record<string, string> } {
  const detected = new Set(intent.capabilities);
  let bestPack = 'full_stack';
  let bestOverlap = 0;

  for (const [name, pack] of Object.entries(CAPABILITY_PACKS)) {
    const overlap = pack.capabilities.filter(c => detected.has(c)).length;
    if (overlap > bestOverlap) { bestOverlap = overlap; bestPack = name; }
  }

  // Always add enterprise_saas for enterprise-grade industries
  const names = [bestPack];
  if (['fintech', 'healthcare', 'enterprise'].includes(intent.industry.primary) && bestPack !== 'enterprise_saas') {
    names.push('enterprise_saas');
  }

  const stack: Record<string, string> = {};
  for (const n of names) Object.assign(stack, CAPABILITY_PACKS[n].stack);
  return { names, stack };
}

function buildTasks(intent: IntentResult): WorkflowTask[] {
  const tasks: WorkflowTask[] = [
    {
      id: 'task-init',
      name: 'Initialize Project',
      type: 'init',
      depends_on: [],
      config: { projectName: intent.requestId },
      timeout_seconds: 30,
      retry_policy: { max_attempts: 1, backoff_seconds: 0 },
    },
    {
      id: 'task-scaffold',
      name: 'Scaffold Repository',
      type: 'scaffold',
      depends_on: ['task-init'],
      config: { capabilities: intent.capabilities },
      timeout_seconds: 120,
      retry_policy: { max_attempts: 2, backoff_seconds: 5 },
    },
  ];

  for (const cap of intent.capabilities) {
    tasks.push({
      id: `task-${cap}`,
      name: `Configure ${cap.replace(/_/g, ' ')}`,
      type: 'configure',
      capability: cap,
      depends_on: ['task-scaffold'],
      config: {},
      timeout_seconds: 60,
      retry_policy: { max_attempts: 3, backoff_seconds: 10 },
    });
  }

  tasks.push({
    id: 'task-deploy',
    name: 'Generate Deployment Config',
    type: 'deploy',
    depends_on: intent.capabilities.map(c => `task-${c}`),
    config: { strategy: 'rolling' },
    timeout_seconds: 180,
    retry_policy: { max_attempts: 2, backoff_seconds: 15 },
  });

  return tasks;
}

// ─── Planner Agent ────────────────────────────────────────────────────────────

export class PlannerAgent {
  plan(intent: IntentResult): WorkflowPlan {
    const workflowId = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { names: selectedPacks, stack: techStack } = selectPacks(intent);

    return {
      workflowId,
      requestId: intent.requestId,
      tenantId: intent.tenantId,
      version: '1.0.0',
      selectedPacks,
      techStack,
      deploymentStrategy: intent.complexity.level === 'enterprise' ? 'blue-green' : 'rolling',
      tasks: buildTasks(intent),
      estimatedDuration: intent.complexity.estimatedWeeks,
      createdAt: new Date().toISOString(),
    };
  }
}
