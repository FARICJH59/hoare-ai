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
│   │       ├── chat/route.ts   # Streaming chat endpoint
│   │       ├── generate/route.ts  # Project generation endpoint
│   │       └── health/route.ts    # Health check
│   ├── agents/                 # TypeScript agent framework
│   │   ├── prompt-receiver.ts
│   │   ├── intent-agent.ts
│   │   ├── planner-agent.ts
│   │   ├── project-factory-agent.ts
│   │   └── verification-agent.ts
│   ├── gateway/
│   │   └── qgps-client.ts      # QGPS Control Plane integration
│   ├── memory/                 # Session + project memory
│   ├── knowledge/              # Industry knowledge packs
│   ├── capabilities/           # Capability registry
│   ├── components/             # React UI components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── chat/               # Chat interface components
│   │   └── layout/             # Theme provider
│   ├── lib/
│   │   ├── auth.ts             # NextAuth.js configuration
│   │   └── utils.ts            # Utility functions
│   └── middleware.ts           # Rate limiting middleware
├── hoare.ai/                   # Node.js agent runtime (JS)
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

### Manual deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```

Set the following environment variables in the Vercel dashboard:

- `NEXTAUTH_URL` — your production URL (e.g., `https://hoare.ai`)
- `NEXTAUTH_SECRET` — random 32+ char secret (`openssl rand -base64 32`)
- `OPENAI_API_KEY` — optional, for LLM responses
- `DATABASE_URL` — optional, for persistent sessions

---

## Running Tests

```bash
# Next.js type check + lint
npm run type-check
npm run lint

# HOARE runtime tests (50 tests)
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
