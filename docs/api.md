# API Reference

Base URL: `http://localhost:3000` (configurable via `PORT` env var)

All request and response bodies are JSON. All error responses follow:

```json
{ "error": "Human-readable message" }
```

---

## Health

### `GET /health`

Returns server health status.

**Response**

```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Chat — `/api/chat`

### `POST /api/chat`

Send a message to an agent and receive a response.

**Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | ✅ | User message |
| `sessionId` | `string` | ❌ | Existing session ID (auto-created if omitted) |

**Response `200`**

```json
{
  "sessionId": "uuid",
  "agentId": "uuid",
  "response": "Agent response text",
  "toolsUsed": ["quantum-simulate"],
  "iterations": 1,
  "timestamp": 1700000000000
}
```

---

### `GET /api/chat/:sessionId/history`

Get full conversation history for a session.

**Response `200`**

```json
{
  "sessionId": "uuid",
  "entries": [
    { "role": "user", "content": "Hello", "timestamp": 1700000000000 },
    { "role": "assistant", "content": "Hi there!", "timestamp": 1700000000001 }
  ]
}
```

---

### `DELETE /api/chat/:sessionId`

Clear the conversation history for a session (session agent is preserved).

**Response `200`**

```json
{ "sessionId": "uuid", "cleared": true }
```

---

## Execute — `/api/execute`

### `POST /api/execute`

Execute a tool, synchronously or asynchronously.

**Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `toolName` | `string` | ✅ | Name of the tool to execute |
| `params` | `object` | ❌ | Tool-specific parameters |
| `async` | `boolean` | ❌ | If `true`, returns immediately with a job ID |

**Response `200`** (synchronous)

```json
{
  "jobId": "uuid",
  "status": "completed",
  "result": { ... }
}
```

**Response `202`** (async)

```json
{ "jobId": "uuid", "status": "pending" }
```

---

### `GET /api/execute/:jobId`

Poll the status of a submitted job.

**Response `200`**

```json
{
  "id": "uuid",
  "toolName": "ml-train",
  "params": {},
  "status": "completed",
  "result": { ... },
  "createdAt": 1700000000000,
  "completedAt": 1700000001500
}
```

---

### `GET /api/execute`

List all submitted jobs.

**Response `200`** — array of `ExecutionJob` objects.

---

## Tools — `/api/tools`

### `GET /api/tools`

List all registered tools.

**Response `200`**

```json
{
  "count": 8,
  "tools": [
    { "name": "quantum-simulate", "description": "..." },
    ...
  ]
}
```

---

### `GET /api/tools/:name`

Get details of a specific tool.

**Response `200`**

```json
{ "name": "ml-train", "description": "Train a machine learning model..." }
```

---

### `POST /api/tools/:name/invoke`

Invoke a tool directly without creating a job record.

**Body**

```json
{ "params": { "symbols": ["TSLA", "NVDA"] } }
```

**Response `200`**

```json
{ "tool": "finance-market-data", "result": [ ... ] }
```

---

## Session — `/api/session`

### `POST /api/session`

Create a new session.

**Body**

| Field | Type | Required |
|---|---|---|
| `name` | `string` | ❌ |
| `metadata` | `object` | ❌ |

**Response `201`**

```json
{
  "id": "uuid",
  "name": "My Session",
  "metadata": {},
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000
}
```

---

### `GET /api/session`

List all sessions.

---

### `GET /api/session/:id`

Get a specific session.

---

### `PATCH /api/session/:id`

Update a session's `name` or `metadata`.

---

### `DELETE /api/session/:id`

Delete a session.

**Response `200`**

```json
{ "deleted": true, "id": "uuid" }
```
