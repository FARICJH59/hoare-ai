"use strict";

const DEFAULT_TIMEOUT_MS = 15000;

function log(level, message, context) {
  const payload = {
    timestamp: new Date().toISOString(),
    component: "qgps-client",
    level,
    message,
    ...(context ? { context } : {}),
  };
  console.log(JSON.stringify(payload));
}

function requireFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is unavailable. Use Node.js 18+ or provide a fetch polyfill.");
  }
}

function createQgpsClient(options = {}) {
  const baseUrl = options.baseUrl || process.env.QGPS_URL || "";
  const apiKey = options.apiKey || process.env.QGPS_API_KEY || "";
  const mockMode = options.mockMode ?? (process.env.QGPS_MOCK_MODE === "true" || (!baseUrl && !apiKey));
  const timeoutMs = Number(options.timeoutMs || process.env.QGPS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  async function request(method, endpoint, body) {
    if (mockMode) {
      const mockResponse = {
        ok: true,
        request: { method, endpoint, body },
        data: {
          workflowId: body && body.workflowId ? body.workflowId : `wf_${Date.now()}`,
          status: method === "GET" ? "completed" : "submitted",
        },
      };
      log("info", "QGPS mock request served", { endpoint, method });
      return mockResponse.data;
    }

    if (!baseUrl || !apiKey) {
      throw new Error("QGPS_URL and QGPS_API_KEY are required when mock mode is disabled");
    }

    requireFetch();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const normalizedEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
      const url = new URL(normalizedEndpoint, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer ".concat(apiKey),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch (parseError) {
        log("warn", "Unable to parse QGPS response body as JSON", {
          endpoint,
          method,
          error: parseError.message,
        });
      }
      if (!response.ok) {
        throw new Error(`QGPS API error ${response.status}: ${payload.message || "unknown error"}`);
      }

      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async submitWorkflow(workflowRequest) {
      if (!workflowRequest || typeof workflowRequest !== "object") {
        throw new Error("workflowRequest must be an object");
      }
      return request("POST", "/workflows", workflowRequest);
    },

    async getWorkflowStatus(workflowId) {
      if (!workflowId || typeof workflowId !== "string") {
        throw new Error("workflowId must be a non-empty string");
      }
      return request("GET", `/workflows/${encodeURIComponent(workflowId)}`, null);
    },

    status() {
      return {
        mockMode,
        configured: Boolean(baseUrl && apiKey) || mockMode,
        baseUrl: baseUrl || null,
        timeoutMs,
      };
    },
  };
}

module.exports = {
  createQgpsClient,
};
