import * as http from "http";
import * as https from "https";
import { URL } from "url";

export interface HoareAIClientOptions {
  baseUrl: string;
  apiKey?: string;
  orgId?: string;
  timeout?: number;
}

export interface ChatResponse {
  sessionId: string;
  agentId: string;
  response: string;
  toolsUsed: string[];
  iterations: number;
  timestamp: number;
}

export interface ToolInfo {
  name: string;
  description: string;
}

export interface ToolsListResponse {
  count: number;
  tools: ToolInfo[];
}

export interface ExecutionJob {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export interface Session {
  id: string;
  name?: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

function request<T>(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
  timeout = 30_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr).toString() } : {}),
        ...headers,
      },
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Request timed out after ${timeout}ms`));
    });

    req.on("error", reject);

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export class HoareAIClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(options: HoareAIClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = {
      ...(options.apiKey ? { Authorization: "Bearer " + options.apiKey } : {}),
      ...(options.orgId ? { "x-org-id": options.orgId } : {}),
    };
    this.timeout = options.timeout ?? 30_000;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    return request<ChatResponse>(
      `${this.baseUrl}/api/chat`,
      "POST",
      { message, sessionId },
      this.headers,
      this.timeout
    );
  }

  async getChatHistory(sessionId: string): Promise<{ sessionId: string; entries: unknown[] }> {
    return request(
      `${this.baseUrl}/api/chat/${encodeURIComponent(sessionId)}/history`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  async clearChatHistory(sessionId: string): Promise<{ sessionId: string; cleared: boolean }> {
    return request(
      `${this.baseUrl}/api/chat/${encodeURIComponent(sessionId)}`,
      "DELETE",
      undefined,
      this.headers,
      this.timeout
    );
  }

  // ── Tools ─────────────────────────────────────────────────────────────────

  async listTools(): Promise<ToolsListResponse> {
    return request<ToolsListResponse>(
      `${this.baseUrl}/api/tools`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  async getTool(name: string): Promise<ToolInfo> {
    return request<ToolInfo>(
      `${this.baseUrl}/api/tools/${encodeURIComponent(name)}`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  async invokeTool(name: string, params: Record<string, unknown> = {}): Promise<{ tool: string; result: unknown }> {
    return request(
      `${this.baseUrl}/api/tools/${encodeURIComponent(name)}/invoke`,
      "POST",
      { params },
      this.headers,
      this.timeout
    );
  }

  // ── Execute ───────────────────────────────────────────────────────────────

  async execute(
    toolName: string,
    params: Record<string, unknown> = {},
    async = false
  ): Promise<ExecutionJob> {
    return request<ExecutionJob>(
      `${this.baseUrl}/api/execute`,
      "POST",
      { toolName, params, async },
      this.headers,
      this.timeout
    );
  }

  async getJob(jobId: string): Promise<ExecutionJob> {
    return request<ExecutionJob>(
      `${this.baseUrl}/api/execute/${encodeURIComponent(jobId)}`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  async listJobs(): Promise<ExecutionJob[]> {
    return request<ExecutionJob[]>(
      `${this.baseUrl}/api/execute`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  // ── Session ───────────────────────────────────────────────────────────────

  async createSession(name?: string, metadata?: Record<string, unknown>): Promise<Session> {
    return request<Session>(
      `${this.baseUrl}/api/session`,
      "POST",
      { name, metadata },
      this.headers,
      this.timeout
    );
  }

  async listSessions(): Promise<Session[]> {
    return request<Session[]>(
      `${this.baseUrl}/api/session`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  async getSession(id: string): Promise<Session> {
    return request<Session>(
      `${this.baseUrl}/api/session/${encodeURIComponent(id)}`,
      "GET",
      undefined,
      this.headers,
      this.timeout
    );
  }

  async updateSession(id: string, updates: { name?: string; metadata?: Record<string, unknown> }): Promise<Session> {
    return request<Session>(
      `${this.baseUrl}/api/session/${encodeURIComponent(id)}`,
      "PATCH",
      updates,
      this.headers,
      this.timeout
    );
  }

  async deleteSession(id: string): Promise<{ deleted: boolean; id: string }> {
    return request(
      `${this.baseUrl}/api/session/${encodeURIComponent(id)}`,
      "DELETE",
      undefined,
      this.headers,
      this.timeout
    );
  }

  // ── Partner integration surface ────────────────────────────────────────────

  async runAgent(message: string): Promise<unknown> {
    return request(`${this.baseUrl}/agent/run`, "POST", { message }, this.headers, this.timeout);
  }

  async invokePartnerTool(toolName: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return request(`${this.baseUrl}/tools/invoke`, "POST", { toolName, params }, this.headers, this.timeout);
  }

  async executeWorkflow(definition: Record<string, unknown>): Promise<unknown> {
    return request(`${this.baseUrl}/workflow/execute`, "POST", { definition }, this.headers, this.timeout);
  }

  async generateFoundation(task: string, params: Record<string, unknown>): Promise<unknown> {
    return request(`${this.baseUrl}/foundation/generate`, "POST", { task, params }, this.headers, this.timeout);
  }

  async getBillingUsage(): Promise<unknown> {
    return request(`${this.baseUrl}/billing/usage`, "GET", undefined, this.headers, this.timeout);
  }
}

export const HoareClient = HoareAIClient;

export default HoareAIClient;
