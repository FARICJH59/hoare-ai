# HOARE.ai — Autonomous AI Platform

> Enterprise-grade autonomous AI platform with modular agent runtime, workflow orchestration, QGPS gateway integration, and production-ready security.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      apps/web  (Next.js 14)                    │
│   Dashboard │ Agent Panel │ Workflow Viz │ Health Monitor       │
└──────────────────────────┬─────────────────────────────────────┘
                           │  NEXT_PUBLIC_API_URL
┌──────────────────────────▼─────────────────────────────────────┐
│                    API Layer  (Express / Node.js)              │
│   /api/chat  /api/execute  /api/tools  /api/session            │
│   /api/capabilities  /health  /metrics                         │
│                                                                │
│   Middleware: securityHeaders │ auditLogger │ rateLimit │ JWT  │
└──────────┬───────────────┬─────────────────┬───────────────────┘
           │               │                 │
┌──────────▼───────┐ ┌─────▼──────┐ ┌───────▼────────────────┐
│  Agent Runtime   │ │  Workflow  │ │   QGPS SDK             │
│  Agent           │ │  Engine    │ │   connect()            │
│  AgentSwarm      │ │  (DAG exec)│ │   authenticate()       │
│  AgentRouter     │ └────────────┘ │   submitTask()         │
│  IntentAgent     │                │   getSystemHealth()    │
│  PlannerAgent    │                │   reportMetrics()      │
│  CapabilityReg.  │                └────────────────────────┘
│  Scheduler       │                         │
└──────────┬───────┘                 QGPS Control Plane
           │
┌──────────▼───────────────────────────────────────────────────┐
│                         Tool Layer                            │
│  quantum-compute │ finance │ robotics │ machine-learning      │
└───────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
hoare-ai/
├── apps/
│   └── web/                    # Next.js 14 App Router frontend
│       ├── app/                # Routes: /, /dashboard, /agents, /workflows, /health
│       ├── lib/api.ts          # Typed API client
│       └── types/
├── packages/
│   ├── agent-runtime/          # Re-exports agent/ as a workspace package
│   ├── shared-types/           # Shared TypeScript interfaces (agents, workflows, QGPS)
│   ├── qgps-sdk/               # QGPS gateway integration (connect/auth/submitTask/health)
│   ├── security/               # RBAC, sanitisation, token generation
│   └── workflow-engine/        # DAG-based workflow execution engine
├── agent/                      # Core agent runtime
│   ├── agent.ts                # Agent class — tool registration, run loop
│   ├── memory.ts               # AgentMemory — short-term context store
│   ├── router.ts               # AgentRouter — round-robin / capability / rule routing
│   ├── swarm.ts                # AgentSwarm — parallel / sequential / vote / pipeline
│   ├── capability-registry.ts  # CapabilityRegistry singleton
│   ├── intent.ts               # IntentAgent — prompt classification
│   ├── planner.ts              # PlannerAgent — intent → ExecutionPlan
│   └── scheduler.ts            # Scheduler — background job management
├── api/
│   ├── index.ts                # Express app factory + /health + /metrics
│   ├── chat.ts                 # POST /api/chat, GET /api/chat/:id/history
│   ├── execute.ts              # POST /api/execute (sync/async), GET /api/execute/:id
│   ├── tools.ts                # GET /api/tools, POST /api/tools/:name/invoke
│   ├── session.ts              # CRUD /api/session
│   ├── middleware/             # auth, rateLimit, securityHeaders, validate, audit
│   └── observability/          # structuredLogger, metrics (Prometheus-compatible)
├── tools/                      # Domain tool implementations
│   ├── quantum-compute.ts      # quantum-simulate, quantum-optimize
│   ├── finance.ts              # finance-market-data, finance-portfolio-analysis, finance-risk-analysis
│   ├── robotics.ts             # robotics-status, robotics-command, robotics-trajectory-plan
│   └── ml.ts                   # ml-train, ml-inference, ml-embedding
├── sdk/
│   ├── node/                   # Official Node.js SDK (@hoare-ai/sdk)
│   └── python/                 # Python SDK
├── tests/                      # Jest test suite (75 tests)
│   ├── agent.test.ts
│   ├── api.test.ts
│   ├── qgps.test.ts
│   ├── workflow.test.ts
│   └── security.test.ts
├── infrastructure/
│   ├── docker/                 # Dockerfile.api, Dockerfile.web
│   ├── monitoring/             # prometheus.yml
│   └── terraform/              # (IaC — extend as needed)
├── docs/                       # Architecture, API reference, SDK guide, tools guide
├── .github/workflows/
│   └── deploy.yml              # CI/CD: lint → test → build → Vercel deploy
├── docker-compose.yml          # Full local stack (api, web, postgres, redis, prometheus)
├── vercel.json                 # Vercel production configuration + security headers
├── turbo.json                  # Turborepo task pipeline
├── Makefile                    # Developer shortcuts
├── jest.config.ts              # Jest + ts-jest configuration
├── .eslintrc.json              # ESLint rules
├── .prettierrc.json            # Prettier configuration
└── .env.example                # All required environment variables
```

---

## Local Development Setup

### Prerequisites

- Node.js ≥ 22
- npm ≥ 10
- Docker (for the full stack)

### Quick start

```bash
# 1. Clone & install
git clone https://github.com/FARICJH59/hoare-ai.git
cd hoare-ai
npm install          # installs root + all workspace packages

# 2. Configure environment
cp .env.example .env
# Edit .env with your values (at minimum set JWT_SECRET)

# 3. Start the API server
npm run dev          # http://localhost:3000

# 4. (optional) Start the full Docker stack
make docker-up       # postgres + redis + prometheus + api + web
```

### Available `make` commands

| Command | Description |
|---|---|
| `make dev` | Start API dev server |
| `make build` | Compile TypeScript |
| `make test` | Run test suite |
| `make lint` | Lint TypeScript |
| `make type-check` | Type-check without emitting |
| `make docker-up` | Start Docker Compose stack |
| `make docker-down` | Stop Docker Compose stack |
| `make clean` | Remove build artefacts |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API server port (default: 3000) |
| `NODE_ENV` | No | `development` / `production` |
| `JWT_SECRET` | Yes (prod) | Secret for JWT signing — must be ≥ 32 chars |
| `API_KEYS` | No | Comma-separated API keys for machine auth |
| `DATABASE_URL` | No | PostgreSQL connection string |
| `REDIS_URL` | No | Redis connection string |
| `QGPS_BASE_URL` | No | QGPS control plane endpoint |
| `QGPS_API_KEY` | No | QGPS API key |
| `QGPS_TENANT_ID` | No | QGPS tenant identifier |
| `OPENAI_API_KEY` | No | OpenAI API key (for future LLM integration) |
| `LOG_LEVEL` | No | `debug` / `info` / `warn` / `error` (default: info) |
| `NEXT_PUBLIC_API_URL` | No | API base URL for the web frontend |
| `NEXTAUTH_URL` | No | NextAuth base URL |
| `NEXTAUTH_SECRET` | Yes (prod) | NextAuth secret |
| `VERCEL_TOKEN` | CI only | Vercel deploy token (GitHub Secret) |
| `VERCEL_ORG_ID` | CI only | Vercel org ID (GitHub Secret) |
| `VERCEL_PROJECT_ID` | CI only | Vercel project ID (GitHub Secret) |

---

## Deployment

### Vercel (recommended for web frontend)

1. Push to `main` — the GitHub Actions workflow runs automatically.
2. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as GitHub repository secrets.
3. The pipeline: `lint → test → build → vercel build → vercel deploy --prod`.

### Docker

```bash
# Build images
docker-compose build

# Start full stack
docker-compose up -d
```

Services:
- API: `http://localhost:3000`
- Web: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- Prometheus: `http://localhost:9090`

---

## Agent Development Guide

### Creating a custom agent

```typescript
import { Agent } from "./agent";
import { Tool } from "./tools";

const myTool: Tool = {
  name: "my-custom-tool",
  description: "Does something useful.",
  async execute(params) {
    return { result: params.input };
  },
};

const agent = new Agent({
  name: "my-agent",
  description: "Handles custom tasks.",
  tools: [myTool],
  systemPrompt: "You are a specialist agent.",
  maxIterations: 5,
});

const result = await agent.run('use_tool:my-custom-tool({"input": "hello"})');
console.log(result.response);
```

### Registering capabilities

```typescript
import { CapabilityRegistry } from "./agent/capability-registry";
import { myTool } from "./tools/my-tool";

const registry = CapabilityRegistry.getInstance();
registry.registerTool(myTool, "custom");

// Capabilities are then available to IntentAgent and PlannerAgent
```

### Intent-to-Plan pipeline

```typescript
import { IntentAgent } from "./agent/intent";
import { PlannerAgent } from "./agent/planner";

const plan = new PlannerAgent().plan("Simulate a 3-qubit quantum circuit");
console.log(plan.steps); // Array of WorkflowStep objects
```

---

## QGPS Integration Guide

```typescript
import { createQGPSClient } from "./packages/qgps-sdk";

const client = createQGPSClient(); // reads QGPS_* env vars

await client.connect();
await client.authenticate();

const task = await client.submitTask("quantum-workload", { qubits: 5 });
const result = await client.getTaskResult(task.id);

const health = await client.getSystemHealth();
await client.reportMetrics({ requestCount: 42 });
```

---

## API Reference

See [`docs/api.md`](docs/api.md) for the full REST API documentation.

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | System health (status, version, uptime, agents, dependencies) |
| `GET` | `/metrics` | Prometheus-format metrics |
| `GET` | `/api/capabilities` | List all registered capabilities |
| `POST` | `/api/chat` | Send a message to an agent |
| `GET` | `/api/chat/:id/history` | Retrieve conversation history |
| `POST` | `/api/execute` | Execute a tool synchronously or async |
| `GET` | `/api/execute/:jobId` | Poll async job status |
| `GET` | `/api/tools` | List all registered tools |
| `POST` | `/api/tools/:name/invoke` | Invoke a tool directly |
| `POST` | `/api/session` | Create a session |
| `GET` | `/api/session/:id` | Get session details |
| `PATCH` | `/api/session/:id` | Update session metadata |
| `DELETE` | `/api/session/:id` | Delete a session |

---

## Security

- **JWT authentication** — ****** verification on protected routes
- **API key authentication** — `X-API-Key` header support for service-to-service calls
- **Rate limiting** — in-memory per-IP limiter (Redis-replaceable for distributed deployments)
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `CSP`, `Referrer-Policy`
- **Request validation** — required fields and Content-Type checks
- **Audit logging** — every request logged with structured JSON
- **RBAC** — role → permission mapping in `packages/security`
- **Secrets via env vars only** — no secrets committed to source

---

## License

MIT © HOARE.ai
