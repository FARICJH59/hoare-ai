import supertest from "supertest";
import { createApp } from "../api/index";

const app = createApp();
const request = supertest(app);

// ── Health endpoint ───────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with required fields", async () => {
    const res = await request.get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      version: expect.any(String),
      uptime: expect.any(Number),
      timestamp: expect.any(String),
    });
    expect(res.body.agents).toBeDefined();
    expect(res.body.dependencies).toBeDefined();
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────

describe("404 handler", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request.get("/api/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

// ── Tools API ─────────────────────────────────────────────────────────────────

describe("GET /api/tools", () => {
  it("lists all registered tools", async () => {
    const res = await request.get("/api/tools");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.tools)).toBe(true);
    expect(res.body.tools[0]).toHaveProperty("name");
    expect(res.body.tools[0]).toHaveProperty("description");
  });
});

describe("GET /api/tools/:name", () => {
  it("returns a specific tool", async () => {
    const res = await request.get("/api/tools/quantum-simulate");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("quantum-simulate");
  });

  it("returns 404 for a missing tool", async () => {
    const res = await request.get("/api/tools/no-such-tool");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/tools/:name/invoke", () => {
  it("invokes quantum-simulate with default params", async () => {
    const res = await request
      .post("/api/tools/quantum-simulate/invoke")
      .set("Content-Type", "application/json")
      .send({ params: {} });
    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
  });

  it("returns 404 for unknown tool", async () => {
    const res = await request
      .post("/api/tools/nope/invoke")
      .set("Content-Type", "application/json")
      .send({ params: {} });
    expect(res.status).toBe(404);
  });
});

// ── Capabilities endpoint ─────────────────────────────────────────────────────

describe("GET /api/capabilities", () => {
  it("returns capability list", async () => {
    const res = await request.get("/api/capabilities");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.capabilities)).toBe(true);
  });
});

// ── Chat API ──────────────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  it("responds to a message", async () => {
    const res = await request
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send({ message: "Hello, agent!" });
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.response).toBeDefined();
  });

  it("returns 400 for missing message", async () => {
    const res = await request
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send({});
    expect(res.status).toBe(400);
  });

  it("maintains session continuity", async () => {
    const first = await request
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send({ message: "First message" });
    const sid = first.body.sessionId;
    const second = await request
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send({ message: "Second message", sessionId: sid });
    expect(second.body.sessionId).toBe(sid);
  });
});

describe("GET /api/chat/:sessionId/history", () => {
  it("returns history for an existing session", async () => {
    const chat = await request
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send({ message: "Remember me" });
    const sid = chat.body.sessionId;
    const history = await request.get(`/api/chat/${sid}/history`);
    expect(history.status).toBe(200);
    expect(Array.isArray(history.body.entries)).toBe(true);
  });

  it("returns 404 for unknown session", async () => {
    const res = await request.get("/api/chat/no-such-session/history");
    expect(res.status).toBe(404);
  });
});

// ── Execute API ───────────────────────────────────────────────────────────────

describe("POST /api/execute", () => {
  it("executes a tool synchronously", async () => {
    const res = await request
      .post("/api/execute")
      .set("Content-Type", "application/json")
      .send({ toolName: "finance-market-data", params: { symbols: ["AAPL"] } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    expect(res.body.result).toBeDefined();
  });

  it("executes a tool asynchronously and returns 202", async () => {
    const res = await request
      .post("/api/execute")
      .set("Content-Type", "application/json")
      .send({ toolName: "ml-train", params: { epochs: 2 }, async: true });
    expect(res.status).toBe(202);
    expect(res.body.status).toBe("pending");
    expect(res.body.jobId).toBeDefined();
  });

  it("returns 400 for missing toolName", async () => {
    const res = await request
      .post("/api/execute")
      .set("Content-Type", "application/json")
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/execute/:jobId", () => {
  it("polls a submitted job", async () => {
    const submit = await request
      .post("/api/execute")
      .set("Content-Type", "application/json")
      .send({ toolName: "quantum-optimize", params: { iterations: 2 } });
    const jobId = submit.body.jobId;
    const poll = await request.get(`/api/execute/${jobId}`);
    expect(poll.status).toBe(200);
    expect(poll.body.id).toBe(jobId);
  });
});

// ── Session API ───────────────────────────────────────────────────────────────

describe("Session API", () => {
  it("creates a session", async () => {
    const res = await request
      .post("/api/session")
      .set("Content-Type", "application/json")
      .send({ name: "test-session" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("test-session");
  });

  it("retrieves a session", async () => {
    const create = await request
      .post("/api/session")
      .set("Content-Type", "application/json")
      .send({});
    const { id } = create.body;
    const get = await request.get(`/api/session/${id}`);
    expect(get.status).toBe(200);
    expect(get.body.id).toBe(id);
  });

  it("updates a session", async () => {
    const create = await request
      .post("/api/session")
      .set("Content-Type", "application/json")
      .send({ name: "original" });
    const { id } = create.body;
    const patch = await request
      .patch(`/api/session/${id}`)
      .set("Content-Type", "application/json")
      .send({ name: "updated" });
    expect(patch.status).toBe(200);
    expect(patch.body.name).toBe("updated");
  });

  it("deletes a session", async () => {
    const create = await request
      .post("/api/session")
      .set("Content-Type", "application/json")
      .send({});
    const { id } = create.body;
    const del = await request.delete(`/api/session/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);
  });
});
