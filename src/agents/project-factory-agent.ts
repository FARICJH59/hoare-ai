/**
 * Project Factory Agent
 * Generates repository structure, architecture manifest, CI/CD, and container configs.
 */

import type { IntentResult } from './intent-agent';
import type { WorkflowPlan } from './planner-agent';
import type { PromptEnvelope } from './prompt-receiver';

export interface RepoStructure {
  projectName: string;
  industry: string;
  root: string;
  directories: string[];
  files: { path: string; description: string }[];
  generatedAt: string;
}

export interface ArchitectureManifest {
  schemaVersion: string;
  project: { name: string; industry: string; complexity: string };
  capabilities: string[];
  infrastructure: unknown[];
  deployment: { strategy: string; environments: string[] };
  workflow: { id: string; tasks: number };
  security: { authEnabled: boolean; mfaRecommended: boolean; tlsRequired: boolean };
  observability: { logging: boolean; metrics: boolean; tracing: boolean };
}

export interface ProjectArtifacts {
  projectId: string;
  projectName: string;
  requestId: string;
  tenantId: string;
  repoStructure: RepoStructure;
  architectureManifest: ArchitectureManifest;
  cicd: { ci: string; cd: string };
  containers: { dockerfile: string; compose: string };
  kubernetes: { deployment: string; service: string };
  apiSpec: Record<string, unknown>;
  deploymentPlan: string;
  generatedAt: string;
}

function deriveProjectName(prompt: string, industry: string): string {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'which', 'have', 'been', 'will', 'build', 'create', 'make', 'want', 'need', 'using', 'use', 'platform', 'system']);
  const words = prompt.toLowerCase().split(/\s+/);
  const meaningful = words.filter(w => w.length > 3 && !stopWords.has(w));
  const parts = meaningful.slice(0, 2);
  if (parts.length === 0) parts.push(industry);
  return parts.join('-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || `${industry}-app`;
}

function generateRepoStructure(projectName: string, intent: IntentResult): RepoStructure {
  const caps = intent.capabilities;
  const dirs = ['src', 'src/api', 'src/middleware', 'src/config', 'src/utils', 'tests', 'docs', '.github/workflows'];

  if (caps.includes('database'))       dirs.push('src/models', 'src/repositories', 'src/migrations');
  if (caps.includes('messaging'))      dirs.push('src/events', 'src/consumers');
  if (caps.includes('storage'))        dirs.push('src/storage');
  if (caps.includes('authentication')) dirs.push('src/auth');
  if (caps.includes('ai_ml'))          dirs.push('src/ai', 'src/prompts', 'src/embeddings');
  if (caps.includes('realtime'))       dirs.push('src/websocket');

  return {
    projectName,
    industry: intent.industry.primary,
    root: `./${projectName}`,
    directories: dirs,
    files: [
      { path: 'package.json',           description: 'Node.js project manifest' },
      { path: '.env.example',           description: 'Environment variable template' },
      { path: 'README.md',              description: 'Project documentation' },
      { path: 'src/index.ts',           description: 'Application entry point' },
      { path: 'Dockerfile',             description: 'Container image definition' },
      { path: 'docker-compose.yml',     description: 'Local development stack' },
      { path: '.github/workflows/ci.yml', description: 'CI pipeline' },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function generateArchitectureManifest(projectName: string, intent: IntentResult, plan: WorkflowPlan): ArchitectureManifest {
  return {
    schemaVersion: '1.0',
    project:       { name: projectName, industry: intent.industry.primary, complexity: intent.complexity.level },
    capabilities:  intent.capabilities,
    infrastructure: intent.infrastructure,
    deployment:    { strategy: plan.deploymentStrategy, environments: ['dev', 'staging', 'prod'] },
    workflow:      { id: plan.workflowId, tasks: plan.tasks.length },
    security:      { authEnabled: intent.capabilities.includes('authentication'), mfaRecommended: intent.complexity.level === 'enterprise', tlsRequired: true },
    observability: { logging: true, metrics: intent.capabilities.includes('monitoring'), tracing: intent.capabilities.includes('monitoring') },
  };
}

function generateDockerfile(projectName: string): string {
  return `FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
`;
}

function generateDockerCompose(projectName: string, caps: string[]): string {
  const services: string[] = [`
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [${caps.includes('database') ? 'postgres' : ''}${caps.includes('caching') ? ', redis' : ''}]`];

  if (caps.includes('database')) {
    services.push(`
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${projectName}
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
    volumes: [postgres-data:/var/lib/postgresql/data]`);
  }
  if (caps.includes('caching')) {
    services.push(`
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]`);
  }

  return `version: "3.9"\nservices:${services.join('')}\nvolumes:\n  postgres-data:`;
}

function generateCIPipeline(projectName: string): string {
  return `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
`;
}

function generateAPISpec(projectName: string, caps: string[]): Record<string, unknown> {
  return {
    openapi: '3.0.0',
    info: { title: `${projectName} API`, version: '1.0.0' },
    paths: {
      '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
      ...(caps.includes('authentication') ? {
        '/auth/login': { post: { summary: 'Authenticate user', tags: ['Auth'] } },
        '/auth/logout': { post: { summary: 'Logout', tags: ['Auth'] } },
      } : {}),
    },
  };
}

function generateDeploymentPlan(projectName: string, plan: WorkflowPlan): string {
  return `# ${projectName} — Deployment Plan

## Strategy: ${plan.deploymentStrategy}

### Environments
- **dev** — local Docker Compose
- **staging** — Kubernetes (namespace: ${projectName}-staging)
- **prod** — Kubernetes (namespace: ${projectName}-prod)

### Phases
${plan.tasks.map((t, i) => `${i + 1}. **${t.name}** — timeout: ${t.timeout_seconds}s, retries: ${t.retry_policy.max_attempts}`).join('\n')}

### Rollback
Automatic rollback on 3 consecutive health-check failures.
`;
}

// ─── Project Factory Agent ────────────────────────────────────────────────────

export class ProjectFactoryAgent {
  generate(plan: WorkflowPlan, intent: IntentResult, envelope: PromptEnvelope): ProjectArtifacts {
    const projectId   = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const projectName = deriveProjectName(envelope.normalizedPrompt, intent.industry.primary);
    const caps        = intent.capabilities;

    return {
      projectId,
      projectName,
      requestId: envelope.requestId,
      tenantId:  envelope.tenantId,
      repoStructure:         generateRepoStructure(projectName, intent),
      architectureManifest:  generateArchitectureManifest(projectName, intent, plan),
      cicd: {
        ci: generateCIPipeline(projectName),
        cd: `# CD pipeline for ${projectName}`,
      },
      containers: {
        dockerfile: generateDockerfile(projectName),
        compose:    generateDockerCompose(projectName, caps),
      },
      kubernetes: {
        deployment: `# Kubernetes Deployment for ${projectName}`,
        service:    `# Kubernetes Service for ${projectName}`,
      },
      apiSpec:        generateAPISpec(projectName, caps),
      deploymentPlan: generateDeploymentPlan(projectName, plan),
      generatedAt:    new Date().toISOString(),
    };
  }
}
