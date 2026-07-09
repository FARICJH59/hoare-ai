# HOARE.ai

> **Enterprise SaaS AI assistant** — the fastest way to go from a natural language prompt to a production-ready architecture, repository structure, and deployment plan.

[![CI](https://github.com/FARICJH59/hoare-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/FARICJH59/hoare-ai/actions/workflows/ci.yml)

---

## Overview

HOARE.ai is a full-stack, production-grade AI assistant platform similar in experience to ChatGPT / Claude, but purpose-built for **enterprise software engineering**. Type a prompt like:

> *"Build me a healthcare AI platform with patient management and telemedicine"*

and receive:

- 🏛️ **Architecture manifest** with detected capabilities and infrastructure
- 📁 **Repository structure** with directories and file scaffolding
- 🚀 **Deployment plan** (rolling or blue-green based on complexity)
- 🐳 **Dockerfile + Docker Compose** for local development
- ⚙️ **GitHub Actions CI/CD** pipelines
- 📋 **OpenAPI specification** skeleton
- 🔌 **QGPS workflow submission** for autonomous execution

---

## Tech Stack

| Layer       | Technology                                |
|-------------|-------------------------------------------|
| Frontend    | Next.js 15 (App Router), React 19, TypeScript |
| UI          | Tailwind CSS, shadcn/ui, Radix UI         |
| Auth        | NextAuth.js v5 (GitHub, Google, credentials) |
| AI          | OpenAI GPT-4o (streaming), local pipeline fallback |
| Agents      | TypeScript agent framework (5 agents)     |
| Runtime     | Node.js 20, Next.js API routes            |
| Deployment  | Vercel (zero-config)                      |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Next.js App                       │
│  ┌─────────────┐  ┌───────────────────────────────┐  │
│  │  Chat UI    │  │        API Routes              │  │
│  │  (React)    │  │  /api/chat   (streaming)       │  │
│  │             │  │  /api/generate                 │  │
│  │  Dark mode  │  │  /api/health                   │  │
│  │  Sidebar    │  └───────────────┬───────────────┘  │
│  └─────────────┘                  │                   │
└──────────────────────────────────┼───────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │     HOARE Agent Pipeline      │
                    │                               │
                    │  PromptReceiver               │
                    │       ↓                       │
                    │  IntentAgent                  │
                    │  (industry + capabilities)    │
                    │       ↓                       │
                    │  PlannerAgent                 │
                    │  (DAG workflow)               │
                    │       ↓                       │
                    │  ProjectFactoryAgent          │
                    │  (artifacts)                  │
                    │       ↓                       │
                    │  VerificationAgent            │
                    │       ↓                       │
                    │  QGPSClient (optional)        │
                    └───────────────────────────────┘
```

---

## Project Structure

```
hoare-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Landing page
│   │   ├── chat/page.tsx       # Main chat interface
│   │   ├── auth/               # Sign-in / error pages
│   │   └── api/
│   │       ├── chat/route.ts          # Streaming chat endpoint
│   │       ├── generate/route.ts      # Project generation endpoint
│   │       ├── health/route.ts        # Health check
│   │       ├── registry/              # Agent & skill registry endpoints
│   │       ├── marketplace/           # Capability marketplace endpoints
│   │       ├── enterprise/            # Org / RBAC / API keys / usage endpoints
│   │       └── observability/         # Metrics & traces endpoints
│   ├── agents/                 # TypeScript agent framework
│   ├── gateway/                # QGPS Control Plane integration
│   ├── memory/                 # Session + project memory
│   ├── knowledge/              # Industry knowledge packs
│   ├── capabilities/           # Capability registry
│   ├── components/             # React UI components
│   └── middleware.ts           # Rate limiting middleware
├── hoare.ai/                   # Node.js agent runtime (CommonJS)
│   ├── agents/                 # Core pipeline agents
│   ├── gateway/                # QGPS gateway
│   ├── memory/                 # Project / user / session / vector memory
│   ├── registries/             # Agent registry + skill registry
│   ├── marketplace/            # Capability marketplace
│   ├── enterprise/             # Orgs, RBAC, API keys, metering, multi-tenancy
│   ├── observability/          # Tracing, metrics, cost tracking, health dashboard
│   ├── plugins/                # Plugin framework
│   ├── sdk/                    # REST client + JS/TS SDK
│   ├── templates/              # Code generators
│   ├── versioning/             # Workflow versioning
│   ├── audit/                  # Audit log
│   ├── cli/                    # CLI tool
│   ├── utils/                  # Logger, ID generator
│   └── tests/                  # Runtime test suite
├── deploy.sh                   # Automated production deployment script
├── .github/workflows/ci.yml    # CI pipeline
├── vercel.json                 # Vercel deployment config
└── .env.example                # Environment variable template
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### 1. Clone & install

```bash
git clone https://github.com/FARICJH59/hoare-ai.git
cd hoare-ai
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable           | Required | Description                          |
|--------------------|----------|--------------------------------------|
| `NEXTAUTH_URL`     | ✅       | `http://localhost:3000`              |
| `NEXTAUTH_SECRET`  | ✅       | Random 32+ char secret               |
| `OPENAI_API_KEY`   | Optional | OpenAI key for LLM responses         |
| `DATABASE_URL`     | Optional | PostgreSQL connection string         |
| `QGPS_BASE_URL`    | Optional | QGPS Control Plane URL               |
| `QGPS_API_KEY`     | Optional | QGPS API key                         |

> **No OpenAI key?** The app works without it — the agent pipeline still runs locally and returns intelligent analysis and project generation.

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

```
Email:    demo@hoare.ai
Password: password123
```

---

## API Documentation

### `POST /api/chat`

Streaming chat endpoint.

**Request:**
```json
{
  "message": "Build me a fintech payment platform",
  "sessionId": "session-abc123",
  "userId": "user-1",
  "mode": "chat"
}
```

**Response:** `text/plain` stream (markdown).

**Mode values:**
- `chat` — conversational response with intent analysis
- `generate` — full project generation pipeline

---

### `POST /api/generate`

Full agent pipeline — returns structured JSON artifacts.

**Request:**
```json
{
  "prompt": "Build a healthcare AI platform with FHIR integration",
  "sessionId": "session-abc123",
  "submit": false
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "intent": { "industry": {...}, "capabilities": [...], "complexity": {...} },
    "plan": { "workflowId": "wf-...", "tasks": [...] },
    "artifacts": {
      "repoStructure": {...},
      "architectureManifest": {...},
      "deploymentPlan": "...",
      "containers": { "dockerfile": "...", "compose": "..." },
      "cicd": { "ci": "..." }
    },
    "verification": { "passed": true, "score": 100 }
  }
}
```

---

### `GET /api/health`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "services": { "app": { "healthy": true }, "qgps": { "healthy": false } },
  "memory": { "sessions": 0, "messages": 0, "projects": 0 }
}
```

---

## Deployment to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/FARICJH59/hoare-ai)

### Automated deployment script

The repository ships with `deploy.sh` — a fully automated, fail-safe script that handles everything from preflight checks to Vercel deployment.

```bash
# Make executable (first time only)
chmod +x deploy.sh

# Run
./deploy.sh
```

The script automatically:
1. **Preflight checks** — verifies Git is initialised, current branch is `main`, Vercel CLI is installed, and you are authenticated.
2. **Backs up** existing `vercel.json` / `.env.example` before touching them.
3. Runs `npm install` → `npm run lint` → `npm test` → `npm run build` — and **stops immediately** if any step fails.
4. Commits and pushes to `origin/main`.
5. Deploys to Vercel production with `vercel --prod`.

#### Prerequisites

```bash
# Install Vercel CLI
npm install -g vercel

# Log in
vercel login

# Ensure you are on main
git checkout main
```

#### Required environment variables

Set these in your shell or in the Vercel dashboard before running the script:

| Variable             | Required | Description                                      |
|----------------------|----------|--------------------------------------------------|
| `NEXTAUTH_URL`       | ✅       | Production URL, e.g. `https://hoare.ai`          |
| `NEXTAUTH_SECRET`    | ✅       | Random 32+ char secret (`openssl rand -base64 32`) |
| `OPENAI_API_KEY`     | ✅       | OpenAI API key for LLM responses                  |
| `DATABASE_URL`       | ✅       | PostgreSQL connection string                      |
| `QGPS_BASE_URL`      | Optional | QGPS Control Plane URL                           |
| `QGPS_API_KEY`       | Optional | QGPS API key                                     |

### Manual deployment

```bash
npm i -g vercel
vercel deploy --prod
```

### Environment validation

The app validates required environment variables at startup. Missing variables cause a clear error message rather than a silent failure.

---

## Extended API Reference

In addition to the core endpoints (`/api/chat`, `/api/generate`, `/api/health`), the following enterprise and observability endpoints are available:

### Agent & Skill Registry

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/registry/agents?kind=<kind>` | List registered agents |
| `GET`  | `/api/registry/skills?kind=<kind>` | List registered skills |

### Capability Marketplace

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/marketplace/packs` | List loaded capability packs |
| `POST` | `/api/marketplace/enable` | Enable a pack for a tenant `{ tenantId, packId }` |
| `POST` | `/api/marketplace/disable` | Disable a pack for a tenant `{ tenantId, packId }` |

### Enterprise

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/enterprise/organizations` | List organizations |
| `POST` | `/api/enterprise/organizations` | Create an organization `{ name, plan }` |
| `GET`  | `/api/enterprise/rbac?tenantId=&userId=` | Get user roles and permissions |
| `POST` | `/api/enterprise/rbac` | Assign/revoke roles `{ action, tenantId, userId, roleId }` |
| `GET`  | `/api/enterprise/api-keys?tenantId=` | List API keys for tenant |
| `POST` | `/api/enterprise/api-keys` | Issue/revoke API keys `{ action, tenantId, name }` |
| `GET`  | `/api/enterprise/usage?tenantId=` | Get usage and quota for tenant |

### Observability

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/observability/metrics` | Get runtime metrics (counters, gauges, histograms) |
| `GET`  | `/api/observability/traces?limit=50` | List recent workflow traces |

---

## Plugin Framework

HOARE.ai supports third-party plugins. A plugin is a JavaScript module that exports:

```js
module.exports = {
  id: 'my-org/my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  agents:    [ /* agent definitions */ ],
  skills:    [ /* skill definitions */ ],
  packs:     [ /* capability pack definitions */ ],
  templates: [ /* workflow template metadata */ ],
};
```

Load it at runtime:

```js
const { pluginFramework } = require('./hoare.ai/plugins/plugin-framework');
const myPlugin = require('./my-plugin');
pluginFramework.load(myPlugin);
```

Plugins can add **agents**, **skills**, **capability packs**, and **workflow templates** without modifying any core runtime files.

---

## Running Tests

```bash
# Next.js type check + lint
npm run type-check
npm run lint

# HOARE runtime tests (113 tests — covers all core + extended modules)
npm test
```

---

## Environment Flags

| Flag                     | Default | Description                     |
|--------------------------|---------|---------------------------------|
| `ENABLE_QGPS_SUBMISSION` | `false` | Submit workflows to QGPS        |
| `ENABLE_STREAMING`       | `true`  | Stream responses                |
| `RATE_LIMIT_RPM`         | `60`    | API rate limit (req/min/IP)     |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE).
