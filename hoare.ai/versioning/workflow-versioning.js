'use strict';

/**
 * Workflow Versioning
 *
 * Maintains an immutable version history of workflow plans.
 * Supports retrieval by workflowId and diffing between versions.
 */

const { generateRequestId } = require('../utils/id-generator');
const logger = require('../utils/logger');

class WorkflowVersioning {
  constructor() {
    // Map: workflowId → Array<{ version, plan, savedAt, versionId }>
    this._history = new Map();
  }

  /**
   * Saves a workflow plan as a new version.
   * @param {string} workflowId
   * @param {object} plan
   * @returns {object} Version record
   */
  save(workflowId, plan) {
    if (!this._history.has(workflowId)) {
      this._history.set(workflowId, []);
    }
    const history = this._history.get(workflowId);
    const versionNumber = history.length + 1;
    const versionId     = generateRequestId('wfv');

    const record = {
      versionId,
      workflowId,
      version: `${versionNumber}.0.0`,
      versionNumber,
      plan: JSON.parse(JSON.stringify(plan)), // deep clone
      savedAt: new Date().toISOString(),
    };

    history.push(record);
    logger.debug('WorkflowVersioning', 'Workflow version saved', {
      workflowId,
      version: record.version,
      versionId,
    });
    return record;
  }

  /**
   * Retrieves all versions for a workflow.
   * @param {string} workflowId
   * @returns {object[]}
   */
  getHistory(workflowId) {
    return (this._history.get(workflowId) || []).slice(); // defensive copy
  }

  /**
   * Retrieves the latest version of a workflow.
   * @param {string} workflowId
   * @returns {object|null}
   */
  getLatest(workflowId) {
    const history = this._history.get(workflowId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  /**
   * Retrieves a specific version by version number.
   * @param {string} workflowId
   * @param {number} versionNumber
   * @returns {object|null}
   */
  getVersion(workflowId, versionNumber) {
    const history = this._history.get(workflowId) || [];
    return history.find(v => v.versionNumber === versionNumber) || null;
  }

  /**
   * Returns a simple structural diff between two version numbers.
   * @param {string} workflowId
   * @param {number} fromVersion
   * @param {number} toVersion
   * @returns {object}
   */
  diff(workflowId, fromVersion, toVersion) {
    const from = this.getVersion(workflowId, fromVersion);
    const to   = this.getVersion(workflowId, toVersion);
    if (!from) throw new Error(`Version ${fromVersion} not found for workflow ${workflowId}`);
    if (!to)   throw new Error(`Version ${toVersion} not found for workflow ${workflowId}`);

    const fromTasks = (from.plan.workflowGraph && from.plan.workflowGraph.nodes) || [];
    const toTasks   = (to.plan.workflowGraph   && to.plan.workflowGraph.nodes)   || [];

    const fromIds = new Set(fromTasks.map(n => n.id));
    const toIds   = new Set(toTasks.map(n => n.id));

    return {
      workflowId,
      fromVersion,
      toVersion,
      addedTasks:   toTasks.filter(n => !fromIds.has(n.id)).map(n => n.label),
      removedTasks: fromTasks.filter(n => !toIds.has(n.id)).map(n => n.label),
      taskCountDelta: toTasks.length - fromTasks.length,
    };
  }

  /**
   * Returns stats about tracked workflows.
   * @returns {object}
   */
  stats() {
    let totalVersions = 0;
    for (const history of this._history.values()) totalVersions += history.length;
    return { trackedWorkflows: this._history.size, totalVersions };
  }
}

module.exports = { WorkflowVersioning };
