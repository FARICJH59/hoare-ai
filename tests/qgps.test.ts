import { QGPSClient, createQGPSClient } from "../packages/qgps-sdk";

describe("QGPSClient", () => {
  it("connects successfully", async () => {
    const client = new QGPSClient({
      baseUrl: "http://localhost:4000",
      apiKey: "test-key",
      tenantId: "test-tenant",
    });
    const result = await client.connect();
    expect(result.connected).toBe(true);
  });

  it("authenticates after connect", async () => {
    const client = new QGPSClient({
      baseUrl: "http://localhost:4000",
      apiKey: "test-key",
      tenantId: "t1",
    });
    await client.connect();
    const auth = await client.authenticate();
    expect(auth.authenticated).toBe(true);
    expect(auth.tenantId).toBe("t1");
  });

  it("throws when submitting tasks before authentication", async () => {
    const client = new QGPSClient({
      baseUrl: "http://localhost:4000",
      apiKey: "test-key",
      tenantId: "t1",
    });
    await expect(client.submitTask("test", {})).rejects.toThrow("authenticate");
  });

  it("submits a task and returns a task descriptor", async () => {
    const client = new QGPSClient({
      baseUrl: "http://localhost:4000",
      apiKey: "test-key",
      tenantId: "t1",
    });
    await client.authenticate();
    const task = await client.submitTask("compute", { input: 42 });
    expect(task.id).toBeDefined();
    expect(task.type).toBe("compute");
    expect(task.payload).toEqual({ input: 42 });
  });

  it("retrieves system health", async () => {
    const client = new QGPSClient({
      baseUrl: "http://localhost:4000",
      apiKey: "test-key",
      tenantId: "t1",
    });
    await client.authenticate();
    const health = await client.getSystemHealth();
    expect(["healthy", "degraded", "down"]).toContain(health.status);
  });

  it("createQGPSClient uses environment defaults", () => {
    const client = createQGPSClient({ apiKey: "override" });
    expect(client).toBeInstanceOf(QGPSClient);
  });
});
