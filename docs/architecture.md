# Architecture

## Overview

`hoare-ai` is a standalone agent runtime designed for advanced AI workloads. It integrates a modular tool ecosystem, multi-agent swarm coordination, persistent memory, API-first design, and multi-language SDKs.

```
┌─────────────────────────────────────────────────────────────┐
│                          API Layer                          │
│          /api/chat  /api/execute  /api/tools  /api/session  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       Agent Layer                           │
│    Agent ── AgentRouter ── AgentSwarm ── AgentMemory        │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                       Tool Layer                            │
│   quantum-compute │ finance │ robotics │ ml                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Layers

### API Layer (`api/`)

The API layer exposes an Express HTTP server with four resource groups:

| Route | Module | Responsibility |
|---|---|---|
| `/api/chat` | `chat.ts` | Conversational interface; manages per-session agents |
| `/api/execute` | `execute.ts` | Direct tool invocation; supports async job queue |
| `/api/tools` | `tools.ts` | Tool registry discovery and invocation |
| `/api/session` | `session.ts` | Session lifecycle management |

### Agent Layer (`agent/`)

| Module | Class | Responsibility |
|---|---|---|
| `agent.ts` | `Agent` | Core reasoning loop; tool dispatch; memory binding |
| `router.ts` | `AgentRouter` | Routes incoming requests to the best agent using configurable strategies |
| `memory.ts` | `AgentMemory` | In-process conversation memory with keyword search |
| `swarm.ts` | `AgentSwarm` | Orchestrates multiple agents in parallel, sequential, pipeline, or vote modes |

#### AgentRouter Strategies

- **round-robin** – distribute messages evenly across agents
- **least-busy** – send to the agent with the fewest completed calls
- **capability** – route based on whether an agent has a matching tool
- **first-match** – always use the first registered agent (deterministic)

#### AgentSwarm Modes

| Mode | Behaviour |
|---|---|
| `parallel` | All agents run concurrently; responses concatenated |
| `sequential` | Each agent's output becomes the next agent's input |
| `pipeline` | Alias for sequential |
| `vote` | All agents run in parallel; most-common response wins |

### Tool Layer (`tools/`)

All tools implement the `Tool` interface:

```typescript
interface Tool {
  name: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<unknown>;
}
```

| Module | Tools |
|---|---|
| `quantum-compute.ts` | `quantum-simulate`, `quantum-optimize` |
| `finance.ts` | `finance-market-data`, `finance-portfolio-analysis`, `finance-risk-analysis` |
| `robotics.ts` | `robotics-status`, `robotics-command`, `robotics-trajectory-plan` |
| `ml.ts` | `ml-train`, `ml-inference`, `ml-embedding` |

---

## Data Flow: Chat Request

```
Client → POST /api/chat
         └─ getOrCreateSession(sessionId)
              └─ Agent.run(message)
                   ├─ AgentMemory.addEntry(user)
                   ├─ detectToolCall(message)
                   │    └─ Tool.execute(params)  [if tool call found]
                   ├─ AgentMemory.addEntry(assistant)
                   └─ AgentResult → HTTP 200 JSON
```

---

## Configuration

| Env Var | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
