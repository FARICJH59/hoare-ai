/**
 * QGPS Gateway Client
 * Submits workflows, monitors execution, and handles lifecycle events.
 */

export type WorkflowStatus =
  | 'PENDING' | 'QUEUED' | 'RUNNING'
  | 'SUCCEEDED' | 'FAILED' | 'REMEDIATING' | 'CANCELLED';

export interface WorkflowSubmission {
  workflowId: string;
  accepted: boolean;
  queuePosition: number;
  submittedAt: string;
}

export interface WorkflowStatusResult {
  workflowId: string;
  status: WorkflowStatus;
  progress: number;
  currentTask: string | null;
  updatedAt: string;
}

export interface QGPSClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class QGPSClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options: QGPSClientOptions = {}) {
    this.baseUrl   = options.baseUrl   ?? process.env.QGPS_BASE_URL ?? 'http://qgps-control-plane/api/v1';
    this.apiKey    = options.apiKey    ?? process.env.QGPS_API_KEY  ?? '';
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + this.apiKey,
      'X-Client':      'hoare-ai/1.0',
    };
  }

  /**
   * Submits a workflow to the QGPS Control Plane.
   */
  async submitWorkflow(payload: Record<string, unknown>): Promise<WorkflowSubmission> {
    const qgpsEnabled = process.env.ENABLE_QGPS_SUBMISSION === 'true';

    if (!qgpsEnabled || !this.apiKey) {
      // Simulate response when QGPS is not configured
      return {
        workflowId:  (payload.workflowId as string) ?? 'wf-simulated',
        accepted:    true,
        queuePosition: 1,
        submittedAt: new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/workflows`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`QGPS submission failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as WorkflowSubmission;
      return { ...data, submittedAt: new Date().toISOString() };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Polls the status of a submitted workflow.
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResult> {
    const qgpsEnabled = process.env.ENABLE_QGPS_SUBMISSION === 'true';

    if (!qgpsEnabled || !this.apiKey) {
      return {
        workflowId,
        status:      'RUNNING',
        progress:    Math.floor(Math.random() * 100),
        currentTask: 'Configuring services',
        updatedAt:   new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
        headers: this.headers,
        signal:  controller.signal,
      });

      if (!response.ok) {
        throw new Error(`QGPS status check failed: ${response.status}`);
      }

      return (await response.json()) as WorkflowStatusResult;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Triggers remediation for a failed workflow.
   */
  async triggerRemediation(workflowId: string, failedTaskId: string): Promise<{ triggered: boolean }> {
    const qgpsEnabled = process.env.ENABLE_QGPS_SUBMISSION === 'true';
    if (!qgpsEnabled) return { triggered: false };

    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/remediate`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ failedTaskId }),
    });

    return { triggered: response.ok };
  }

  /**
   * Health check for the QGPS control plane.
   */
  async health(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    const qgpsEnabled = process.env.ENABLE_QGPS_SUBMISSION === 'true';

    if (!qgpsEnabled) {
      return { healthy: false, latencyMs: 0 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, { headers: this.headers });
      return { healthy: response.ok, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }
}
