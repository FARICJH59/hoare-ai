'use strict';

/**
 * QGPS Gateway
 *
 * Integrates with the QGPS Control Plane to:
 *  - Submit workflow execution requests
 *  - Monitor execution status
 *  - Receive health events
 *  - Trigger remediation on failure
 *
 * Uses an event-emitter pattern so other components can react to lifecycle events.
 */

const { EventEmitter } = require('events');
const logger = require('../utils/logger');

// ─── Status constants ─────────────────────────────────────────────────────────
const WORKFLOW_STATUS = {
  PENDING:     'PENDING',
  QUEUED:      'QUEUED',
  RUNNING:     'RUNNING',
  SUCCEEDED:   'SUCCEEDED',
  FAILED:      'FAILED',
  REMEDIATING: 'REMEDIATING',
  CANCELLED:   'CANCELLED',
};

const HEALTH_EVENTS = {
  HEALTHY:     'HEALTHY',
  DEGRADED:    'DEGRADED',
  UNHEALTHY:   'UNHEALTHY',
  RECOVERED:   'RECOVERED',
};

// ─── Simulated QGPS HTTP client ───────────────────────────────────────────────
// In production this would be replaced with actual HTTP calls to the QGPS Control Plane.

class QGPSClient {
  constructor({ baseUrl = 'http://qgps-control-plane/api/v1', apiKey = '' } = {}) {
    this.baseUrl = baseUrl;
    this.apiKey  = apiKey;
  }

  async submitWorkflow(workflowPayload) {
    logger.debug('QGPSClient', 'Submitting workflow', { workflowId: workflowPayload.workflowId });
    // Simulate async network call
    return new Promise(resolve => setTimeout(() => resolve({ accepted: true, queuePosition: 1 }), 20));
  }

  async getWorkflowStatus(workflowId) {
    logger.debug('QGPSClient', 'Polling workflow status', { workflowId });
    return new Promise(resolve => setTimeout(() => resolve({ workflowId, status: WORKFLOW_STATUS.RUNNING, progress: 0.5 }), 15));
  }

  async triggerRemediation(workflowId, failedTask) {
    logger.debug('QGPSClient', 'Triggering remediation', { workflowId, failedTask });
    return new Promise(resolve => setTimeout(() => resolve({ remediationId: `rem-${Date.now()}`, scheduled: true }), 15));
  }
}

// ─── QGPS Gateway ─────────────────────────────────────────────────────────────

class QGPSGateway extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl]  - QGPS Control Plane base URL
   * @param {string} [options.apiKey]   - API key for authentication
   * @param {number} [options.pollIntervalMs] - Status polling interval (default 5000ms)
   * @param {object} [options.auditLog]
   */
  constructor(options = {}) {
    super();
    this.client          = new QGPSClient({ baseUrl: options.baseUrl, apiKey: options.apiKey });
    this.pollIntervalMs  = options.pollIntervalMs || 5000;
    this.auditLog        = options.auditLog || null;
    this._activePollers  = new Map(); // workflowId → timer
    this._workflowStates = new Map(); // workflowId → state record
  }

  /**
   * Submits a workflow to the QGPS Control Plane.
   * @param {object} plan - Planner output
   * @param {object} artifacts - ProjectFactory output
   * @returns {Promise<object>} Submission result
   */
  async submit(plan, artifacts) {
    const { workflowId, requestId, tenantId } = plan;

    const payload = {
      workflowId,
      requestId,
      tenantId,
      graph: plan.workflowGraph,
      deploymentPlan: plan.deploymentPlan,
      projectName: artifacts.projectName,
      projectId: artifacts.projectId,
      submittedAt: new Date().toISOString(),
    };

    logger.info('QGPSGateway', 'Submitting workflow', { workflowId, requestId });

    let result;
    try {
      result = await this.client.submitWorkflow(payload);
    } catch (err) {
      this._updateState(workflowId, WORKFLOW_STATUS.FAILED, { error: err.message });
      this.emit('workflow:failed', { workflowId, error: err.message });
      if (this.auditLog) this.auditLog.record({ event: 'WORKFLOW_SUBMIT_ERROR', workflowId, tenantId, error: err.message });
      throw err;
    }

    this._updateState(workflowId, WORKFLOW_STATUS.QUEUED, { queuePosition: result.queuePosition });
    this.emit('workflow:queued', { workflowId, queuePosition: result.queuePosition });

    if (this.auditLog) {
      this.auditLog.record({ event: 'WORKFLOW_SUBMITTED', workflowId, requestId, tenantId });
    }

    return { workflowId, ...result };
  }

  /**
   * Begins polling for workflow status updates.
   * Emits 'workflow:update', 'workflow:succeeded', 'workflow:failed'.
   * @param {string} workflowId
   * @param {number} [maxPollCount] - Safety limit on poll iterations (default 60)
   */
  startMonitoring(workflowId, maxPollCount = 60) {
    if (this._activePollers.has(workflowId)) return;

    logger.info('QGPSGateway', 'Starting workflow monitoring', { workflowId });
    let polls = 0;

    const poll = async () => {
      polls++;
      let statusResult;
      try {
        statusResult = await this.client.getWorkflowStatus(workflowId);
      } catch (err) {
        logger.warn('QGPSGateway', 'Poll error', { workflowId, error: err.message });
        this.emit('workflow:poll-error', { workflowId, error: err.message });
        return;
      }

      const { status, progress } = statusResult;
      this._updateState(workflowId, status, { progress });
      this.emit('workflow:update', { workflowId, status, progress, polls });

      if (status === WORKFLOW_STATUS.SUCCEEDED) {
        this.stopMonitoring(workflowId);
        this.emit('workflow:succeeded', { workflowId });
        if (this.auditLog) this.auditLog.record({ event: 'WORKFLOW_SUCCEEDED', workflowId });
      } else if (status === WORKFLOW_STATUS.FAILED) {
        this.stopMonitoring(workflowId);
        this.emit('workflow:failed', { workflowId });
        if (this.auditLog) this.auditLog.record({ event: 'WORKFLOW_FAILED', workflowId });
      } else if (polls >= maxPollCount) {
        this.stopMonitoring(workflowId);
        logger.warn('QGPSGateway', 'Max poll count reached', { workflowId });
      }
    };

    const timer = setInterval(poll, this.pollIntervalMs);
    this._activePollers.set(workflowId, timer);
  }

  /**
   * Stops polling for a workflow.
   * @param {string} workflowId
   */
  stopMonitoring(workflowId) {
    const timer = this._activePollers.get(workflowId);
    if (timer) {
      clearInterval(timer);
      this._activePollers.delete(workflowId);
      logger.info('QGPSGateway', 'Stopped monitoring', { workflowId });
    }
  }

  /**
   * Handles an incoming health event from the Control Plane.
   * @param {object} event - { workflowId, healthStatus, details }
   */
  receiveHealthEvent(event) {
    const { workflowId, healthStatus, details = {} } = event;
    logger.info('QGPSGateway', 'Health event received', { workflowId, healthStatus });
    this.emit('health:event', { workflowId, healthStatus, details });

    if (healthStatus === HEALTH_EVENTS.UNHEALTHY) {
      this.triggerRemediation(workflowId, details.failedTask).catch(err => {
        logger.error('QGPSGateway', 'Remediation trigger failed', { workflowId, error: err.message });
      });
    }

    if (this.auditLog) {
      this.auditLog.record({ event: 'HEALTH_EVENT', workflowId, healthStatus, ...details });
    }
  }

  /**
   * Triggers remediation for a failed workflow task.
   * @param {string} workflowId
   * @param {string} [failedTask]
   * @returns {Promise<object>}
   */
  async triggerRemediation(workflowId, failedTask) {
    logger.info('QGPSGateway', 'Triggering remediation', { workflowId, failedTask });
    this._updateState(workflowId, WORKFLOW_STATUS.REMEDIATING, { failedTask });
    this.emit('workflow:remediating', { workflowId, failedTask });

    const result = await this.client.triggerRemediation(workflowId, failedTask);

    if (this.auditLog) {
      this.auditLog.record({ event: 'REMEDIATION_TRIGGERED', workflowId, failedTask, ...result });
    }

    return result;
  }

  /**
   * Returns the current state of a workflow.
   * @param {string} workflowId
   * @returns {object|null}
   */
  getWorkflowState(workflowId) {
    return this._workflowStates.get(workflowId) || null;
  }

  /**
   * Returns all tracked workflow states.
   * @returns {object[]}
   */
  listWorkflows() {
    return Array.from(this._workflowStates.values());
  }

  _updateState(workflowId, status, extra = {}) {
    const existing = this._workflowStates.get(workflowId) || { workflowId };
    this._workflowStates.set(workflowId, {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
      ...extra,
    });
  }
}

module.exports = { QGPSGateway, WORKFLOW_STATUS, HEALTH_EVENTS };
