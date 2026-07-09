'use strict';

/**
 * Template Generators
 *
 * Provides string-based generators for:
 *  - Repository directory structure (manifest)
 *  - Architecture manifests (JSON)
 *  - GitHub Actions CI/CD workflow YAML
 *  - Dockerfile
 *  - Docker Compose
 *  - Kubernetes Deployment + Service manifests
 */

// ─── Repository Structure ─────────────────────────────────────────────────────

/**
 * Generates a standard project repository structure descriptor.
 * @param {object} params
 * @param {string} params.projectName
 * @param {string[]} params.capabilities
 * @param {string} params.industry
 * @returns {object} Directory tree descriptor
 */
function generateRepoStructure({ projectName, capabilities, industry }) {
  const dirs = [
    'src',
    'src/api',
    'src/middleware',
    'src/config',
    'src/utils',
    'tests',
    'tests/unit',
    'tests/integration',
    'docs',
    '.github',
    '.github/workflows',
  ];

  if (capabilities.includes('database')) {
    dirs.push('src/models', 'src/migrations', 'src/repositories');
  }
  if (capabilities.includes('messaging')) {
    dirs.push('src/events', 'src/consumers', 'src/producers');
  }
  if (capabilities.includes('storage')) {
    dirs.push('src/storage');
  }
  if (capabilities.includes('authentication') || capabilities.includes('authorization')) {
    dirs.push('src/auth');
  }
  if (capabilities.includes('ai_ml')) {
    dirs.push('src/ai', 'src/prompts', 'src/embeddings');
  }
  if (capabilities.includes('realtime')) {
    dirs.push('src/websocket', 'src/channels');
  }

  const files = [
    { path: 'package.json',       description: 'Node.js project manifest' },
    { path: '.env.example',       description: 'Environment variable template' },
    { path: '.gitignore',         description: 'Git ignore rules' },
    { path: 'README.md',          description: 'Project documentation' },
    { path: 'src/index.js',       description: 'Application entry point' },
    { path: 'src/app.js',         description: 'Express/Fastify app setup' },
    { path: 'src/config/index.js',description: 'Centralized configuration' },
    { path: 'Dockerfile',         description: 'Container image definition' },
    { path: 'docker-compose.yml', description: 'Local development stack' },
    { path: '.github/workflows/ci.yml', description: 'CI pipeline' },
    { path: '.github/workflows/deploy.yml', description: 'CD pipeline' },
  ];

  return {
    projectName,
    industry,
    root: `./${projectName}`,
    directories: dirs,
    files,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Architecture Manifest ────────────────────────────────────────────────────

/**
 * Generates a JSON architecture manifest.
 * @param {object} params
 * @returns {object}
 */
function generateArchitectureManifest({ projectName, intent, plan, tenantId }) {
  return {
    schemaVersion: '1.0',
    project: {
      name: projectName,
      tenantId,
      industry: intent.industry.primary,
      complexity: intent.complexity.level,
      generatedAt: new Date().toISOString(),
    },
    capabilities: intent.capabilities,
    infrastructure: intent.infrastructure,
    selectedPacks: plan.selectedPacks.map(p => p.name),
    deployment: {
      strategy: plan.deploymentPlan.strategy,
      environments: plan.deploymentPlan.environments,
      replicas: plan.deploymentPlan.replicas,
      autoscale: plan.deploymentPlan.autoscale,
    },
    workflow: {
      workflowId: plan.workflowId,
      totalTasks: plan.workflowGraph.metadata.totalTasks,
      phases: plan.workflowGraph.metadata.phases,
    },
    security: {
      tlsEnabled: true,
      secretsManager: 'Vault',
      networkPolicy: 'default-deny',
      scanningEnabled: true,
    },
    observability: {
      metrics: 'Prometheus',
      tracing: 'OpenTelemetry',
      logging: 'structured-json',
    },
  };
}

// ─── GitHub Actions CI/CD ─────────────────────────────────────────────────────

/**
 * Generates a GitHub Actions CI workflow YAML string.
 * @param {object} params
 * @param {string} params.projectName
 * @param {string} params.nodeVersion
 * @param {boolean} params.hasDocker
 * @returns {string} YAML content
 */
function generateGithubActionsCI({ projectName, nodeVersion = '20', hasDocker = true }) {
  return `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '${nodeVersion}'

jobs:
  lint-and-test:
    name: Lint and Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
        continue-on-error: true
${hasDocker ? `
  build-image:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: ${projectName}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
` : ''}`;
}

/**
 * Generates a GitHub Actions CD (deploy) workflow YAML string.
 * @param {object} params
 * @param {string} params.projectName
 * @param {string[]} params.environments
 * @returns {string} YAML content
 */
function generateGithubActionsCD({ projectName, environments = ['staging', 'prod'] }) {
  const envJobs = environments.map((env, i) => {
    const needs = i === 0 ? 'build' : `deploy-${environments[i - 1]}`;
    return `
  deploy-${env}:
    name: Deploy to ${env}
    runs-on: ubuntu-latest
    needs: ${needs}
    environment: ${env}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to ${env}
        run: echo "Deploying ${projectName} to ${env}"
        env:
          KUBE_CONFIG: \${{ secrets.KUBE_CONFIG_${env.toUpperCase()} }}`;
  }).join('\n');

  return `name: CD

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  build:
    name: Build and Push Image
    runs-on: ubuntu-latest
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/\${{ github.repository }}/${projectName}:\${{ github.sha }}
${envJobs}
`;
}

// ─── Dockerfile ──────────────────────────────────────────────────────────────

/**
 * Generates a production-ready multi-stage Dockerfile.
 * @param {object} params
 * @param {string} params.nodeVersion
 * @param {number} params.port
 * @returns {string}
 */
function generateDockerfile({ nodeVersion = '20', port = 3000 }) {
  return `# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:${nodeVersion}-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:${nodeVersion}-alpine AS runtime

RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/src         ./src
COPY --from=builder --chown=appuser:appgroup /app/package.json .

USER appuser

ENV NODE_ENV=production
ENV PORT=${port}

EXPOSE ${port}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:${port}/health || exit 1

CMD ["node", "src/index.js"]
`;
}

// ─── Docker Compose ───────────────────────────────────────────────────────────

/**
 * Generates a docker-compose.yml for local development.
 * @param {object} params
 * @param {string} params.projectName
 * @param {object[]} params.infrastructure
 * @param {number} params.appPort
 * @returns {string}
 */
function generateDockerCompose({ projectName, infrastructure = [], appPort = 3000 }) {
  const services = [`  app:
    build: .
    ports:
      - "${appPort}:${appPort}"
    environment:
      - NODE_ENV=development
    env_file:
      - .env
    depends_on: [${infrastructure.map(i => i.type).join(', ')}]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:${appPort}/health"]
      interval: 30s
      timeout: 5s
      retries: 3`];

  for (const infra of infrastructure) {
    if (infra.type === 'database') {
      services.push(`  database:
    image: ${infra.containerImage}
    environment:
      POSTGRES_DB: ${projectName}
      POSTGRES_USER: app
      POSTGRES_PASSWORD: \${DB_PASSWORD:-changeme}
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"`);
    } else if (infra.type === 'cache') {
      services.push(`  cache:
    image: ${infra.containerImage}
    command: redis-server --requirepass \${REDIS_PASSWORD:-changeme}
    ports:
      - "6379:6379"`);
    } else if (infra.type === 'queue') {
      services.push(`  queue:
    image: ${infra.containerImage}
    environment:
      RABBITMQ_DEFAULT_USER: app
      RABBITMQ_DEFAULT_PASS: \${RABBIT_PASSWORD:-changeme}
    ports:
      - "5672:5672"
      - "15672:15672"`);
    }
  }

  return `version: '3.9'

services:
${services.join('\n\n')}

volumes:
  db_data:

networks:
  default:
    name: ${projectName}-net
`;
}

// ─── Kubernetes Manifests ─────────────────────────────────────────────────────

/**
 * Generates a Kubernetes Deployment manifest.
 * @param {object} params
 * @param {string} params.projectName
 * @param {number} params.replicas
 * @param {string} params.image
 * @param {number} params.port
 * @param {object} params.resourceLimits
 * @returns {string}
 */
function generateK8sDeployment({ projectName, replicas = 2, image, port = 3000, resourceLimits = {} }) {
  const cpu    = resourceLimits.cpu    || '500m';
  const memory = resourceLimits.memory || '512Mi';

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${projectName}
  labels:
    app: ${projectName}
    version: v1
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${projectName}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: ${projectName}
        version: v1
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: ${projectName}
          image: ${image || `ghcr.io/org/${projectName}:latest`}
          ports:
            - containerPort: ${port}
              protocol: TCP
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "${port}"
          envFrom:
            - secretRef:
                name: ${projectName}-secrets
          resources:
            requests:
              cpu: ${Math.round(parseInt(cpu) / 2)}m
              memory: ${Math.round(parseInt(memory) / 2)}Mi
            limits:
              cpu: ${cpu}
              memory: ${memory}
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: ${port}
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
      terminationGracePeriodSeconds: 60
`;
}

/**
 * Generates a Kubernetes Service manifest.
 * @param {object} params
 * @param {string} params.projectName
 * @param {number} params.port
 * @returns {string}
 */
function generateK8sService({ projectName, port = 3000 }) {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${projectName}-svc
  labels:
    app: ${projectName}
spec:
  selector:
    app: ${projectName}
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: ${port}
  type: ClusterIP
`;
}

/**
 * Generates a Kubernetes HorizontalPodAutoscaler manifest.
 * @param {object} params
 * @returns {string}
 */
function generateK8sHPA({ projectName, minReplicas = 2, maxReplicas = 10 }) {
  return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${projectName}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${projectName}
  minReplicas: ${minReplicas}
  maxReplicas: ${maxReplicas}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
`;
}

module.exports = {
  generateRepoStructure,
  generateArchitectureManifest,
  generateGithubActionsCI,
  generateGithubActionsCD,
  generateDockerfile,
  generateDockerCompose,
  generateK8sDeployment,
  generateK8sService,
  generateK8sHPA,
};
