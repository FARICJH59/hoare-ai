'use strict';

/**
 * Audit Log
 *
 * Immutable, append-only structured audit trail.
 * Supports:
 *  - Per-tenant query
 *  - Per-request query
 *  - Event-type filtering
 *  - JSON export
 */

const { generateAuditId } = require('../utils/id-generator');
const logger = require('../utils/logger');

class AuditLog {
  constructor() {
    this._entries = []; // append-only
  }

  /**
   * Records an audit event.
   * @param {object} payload - Must have at minimum: event
   * @returns {object} The recorded audit entry
   */
  record(payload) {
    if (!payload || !payload.event) throw new Error('audit entry must have an event field');
    const entry = {
      auditId:   generateAuditId(),
      timestamp: new Date().toISOString(),
      ...payload,
    };
    this._entries.push(entry);
    logger.debug('AuditLog', `Event recorded: ${entry.event}`, { auditId: entry.auditId });
    return entry;
  }

  /**
   * Queries audit entries by optional filters.
   * @param {object} [filters]
   * @param {string} [filters.tenantId]
   * @param {string} [filters.requestId]
   * @param {string} [filters.event]
   * @param {string} [filters.since]  - ISO timestamp lower bound
   * @returns {object[]}
   */
  query({ tenantId, requestId, event, since } = {}) {
    let results = this._entries;
    if (tenantId)  results = results.filter(e => e.tenantId  === tenantId);
    if (requestId) results = results.filter(e => e.requestId === requestId);
    if (event)     results = results.filter(e => e.event     === event);
    if (since) {
      const sinceMs = new Date(since).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() >= sinceMs);
    }
    return results;
  }

  /**
   * Returns all audit entries for a given workflow.
   * @param {string} workflowId
   * @returns {object[]}
   */
  getByWorkflow(workflowId) {
    return this._entries.filter(e => e.workflowId === workflowId);
  }

  /**
   * Returns the total count of entries.
   * @returns {number}
   */
  count() {
    return this._entries.length;
  }

  /**
   * Exports all audit entries as a JSON string.
   * @returns {string}
   */
  export() {
    return JSON.stringify(this._entries, null, 2);
  }

  /**
   * Returns the last N entries (most recent).
   * @param {number} [n=20]
   * @returns {object[]}
   */
  tail(n = 20) {
    return this._entries.slice(-n);
  }
}

module.exports = { AuditLog };
