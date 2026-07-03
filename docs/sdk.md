# SDK Reference

hoare-ai ships SDKs for **Node.js** and **Python**. Both SDKs wrap the REST API and expose identical functionality.

---

## Node.js SDK (`sdk/node/`)

### Installation

```bash
cd sdk/node
npm install
```

### Usage

```typescript
import HoareAIClient from "./sdk/node";

const client = new HoareAIClient({
  baseUrl: "http://localhost:3000",
  apiKey: "your-api-key",   // optional
  timeout: 30_000,           // ms, optional
});
```

### Chat

```typescript
// Start or continue a conversation
const res = await client.chat("What is the Sharpe ratio of my portfolio?");
console.log(res.response);
console.log(res.sessionId); // reuse for follow-up messages

// Continue conversation
const res2 = await client.chat("Show me the top 3 risks.", res.sessionId);

// Retrieve history
const history = await client.getChatHistory(res.sessionId);

// Clear history
await client.clearChatHistory(res.sessionId);
```

### Tools

```typescript
// List all tools
const { tools } = await client.listTools();
tools.forEach(t => console.log(t.name, "-", t.description));

// Get a specific tool
const tool = await client.getTool("ml-train");

// Invoke a tool directly
const result = await client.invokeTool("finance-market-data", {
  symbols: ["AAPL", "TSLA"],
});
```

### Execute (Job Queue)

```typescript
// Synchronous execution
const job = await client.execute("quantum-simulate", { shots: 512 });
console.log(job.result);

// Asynchronous execution
const submitted = await client.execute("ml-train", { epochs: 100 }, true);
console.log(submitted.status); // "pending"

// Poll for result
let job = await client.getJob(submitted.id);
while (job.status === "pending" || job.status === "running") {
  await new Promise(r => setTimeout(r, 500));
  job = await client.getJob(submitted.id);
}
console.log(job.result);

// List all jobs
const jobs = await client.listJobs();
```

### Session Management

```typescript
const session = await client.createSession("Research Session", { project: "alpha" });

const sessions = await client.listSessions();

await client.updateSession(session.id, { metadata: { project: "beta" } });

await client.deleteSession(session.id);
```

---

## Python SDK (`sdk/python/`)

### Installation

```bash
cd sdk/python
pip install -e .
```

### Usage

```python
from client import HoareAIClient

client = HoareAIClient(
    base_url="http://localhost:3000",
    api_key="your-api-key",   # optional
    timeout=30,
)
```

### Chat

```python
res = client.chat("Run a Bell-state quantum simulation")
print(res["response"])
session_id = res["sessionId"]

# Continue
res2 = client.chat("Now optimise with 100 iterations", session_id)

# History
history = client.get_chat_history(session_id)

# Clear
client.clear_chat_history(session_id)
```

### Tools

```python
tools = client.list_tools()["tools"]
for t in tools:
    print(t["name"], "-", t["description"])

result = client.invoke_tool("robotics-status", {"robotId": "robot-42"})
```

### Execute

```python
# Synchronous
job = client.execute("ml-inference", {"modelId": "model-abc", "input": [0.1, 0.9]})
print(job["result"])

# Asynchronous
submitted = client.execute("ml-train", {"epochs": 200}, async_mode=True)
import time
while submitted["status"] in ("pending", "running"):
    time.sleep(0.5)
    submitted = client.get_job(submitted["id"])
print(submitted["result"])
```

### Session Management

```python
session = client.create_session("Experiment 1", {"run": 42})
client.update_session(session["id"], metadata={"run": 43})
client.delete_session(session["id"])
```

---

## Error Handling

Both SDKs surface API errors as exceptions:

**Node.js** — the `request` function rejects with an object containing `{ error: "..." }` from the API.

**Python** — raises `HoareAIError(message, status_code=...)`.

```python
from client import HoareAIClient, HoareAIError

try:
    client.get_tool("nonexistent")
except HoareAIError as e:
    print(e, e.status_code)  # Tool "nonexistent" not found. 404
```
