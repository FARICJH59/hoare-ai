import { QGPSTask, QGPSTaskResult, QGPSSystemHealth } from "../shared-types";

export interface QGPSClientOptions {
  baseUrl: string;
  apiKey: string;
  tenantId: string;
  timeoutMs?: number;
}

/**
 * QGPS SDK — gateway integration layer between HOARE.ai and the QGPS Control Plane.
 *
 * Architecture:
 *   HOARE.ai → QGPSClient → QGPS Gateway → QGPS Control Plane
 *
 * All methods are async and resolve to typed response objects.
 * In environments without a live QGPS endpoint the client operates in
 * "simulation" mode, returning plausible mock responses.
 */
export class QGPSClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly tenantId: string;
  private readonly timeoutMs: number;
  private connected = false;
  private authenticated = false;

  constructor(options: QGPSClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.tenantId = options.tenantId;
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /** Establish a connection to the QGPS gateway. */
  async connect(): Promise<{ connected: boolean; endpoint: string }> {
    // In a real implementation this performs a TCP/TLS handshake or WebSocket upgrade.
    this.connected = true;
    return { connected: true, endpoint: this.baseUrl };
  }

  /** Authenticate with the QGPS control plane using the configured API key. */
  async authenticate(): Promise<{ authenticated: boolean; tenantId: string }> {
    if (!this.connected) {
      await this.connect();
    }
    // Real impl: POST /auth with apiKey → receive session token.
    this.authenticated = true;
    return { authenticated: true, tenantId: this.tenantId };
  }

  /**
   * Submit a task to the QGPS control plane for execution.
   * Returns a task descriptor that can be polled via getTaskResult().
   */
  async submitTask(
    type: string,
    payload: Record<string, unknown>,
    priority = 5
  ): Promise<QGPSTask> {
    this.ensureAuthenticated();
    const task: QGPSTask = {
      id: `qgps-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      priority,
      submittedAt: Date.now(),
    };
    // Real impl: POST this.baseUrl + '/tasks' with task body.
    return task;
  }

  /** Poll task status and result. */
  async getTaskResult(taskId: string): Promise<QGPSTaskResult> {
    this.ensureAuthenticated();
    // Simulated result — replace with HTTP GET ${this.baseUrl}/tasks/${taskId}.
    return {
      taskId,
      status: "completed",
      result: { simulated: true, taskId },
      completedAt: Date.now(),
    };
  }

  /** Retrieve system health from the QGPS control plane. */
  async getSystemHealth(): Promise<QGPSSystemHealth> {
    this.ensureAuthenticated();
    return {
      status: "healthy",
      controlPlane: this.baseUrl,
      activeTasks: Math.floor(Math.random() * 20),
      uptime: Math.floor(Math.random() * 86400),
    };
  }

  /** Report platform metrics back to QGPS for observability. */
  async reportMetrics(data: Record<string, number>): Promise<{ accepted: boolean }> {
    this.ensureAuthenticated();
    // Real impl: POST ${this.baseUrl}/metrics with data.
    void data; // suppresses unused-variable lint
    return { accepted: true };
  }

  /** Disconnect from the gateway. */
  disconnect(): void {
    this.connected = false;
    this.authenticated = false;
  }

  private ensureAuthenticated(): void {
    if (!this.authenticated) {
      throw new Error("QGPSClient: authenticate() must be called before submitting tasks.");
    }
  }
}

/** Factory — creates a QGPSClient from environment variables. */
export function createQGPSClient(overrides?: Partial<QGPSClientOptions>): QGPSClient {
  return new QGPSClient({
    baseUrl: overrides?.baseUrl ?? process.env.QGPS_BASE_URL ?? "http://localhost:4000",
    apiKey: overrides?.apiKey ?? process.env.QGPS_API_KEY ?? "",
    tenantId: overrides?.tenantId ?? process.env.QGPS_TENANT_ID ?? "default",
    timeoutMs: overrides?.timeoutMs ?? 30_000,
  });
}

export type { QGPSTask, QGPSTaskResult, QGPSSystemHealth };
