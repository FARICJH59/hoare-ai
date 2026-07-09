'use strict';

/**
 * Usage Metering
 *
 * Tracks API calls, token consumption, and per-tenant usage quotas.
 * Designed for SaaS billing integration.
 */

const logger = require('../utils/logger');

class UsageMetering {
  constructor() {
    /** @type {Map<string, object>} tenantId → usage counters */
    this._usage = new Map();
    /** @type {Map<string, object>} tenantId → quota limits */
    this._quotas = new Map();
    /** @type {Array<object>} Recent usage events (capped) */
    this._events = [];
    this._maxEvents = 10000;
  }

  /**
   * Set usage quotas for a tenant.
   * @param {string} tenantId
   * @param {object} limits - e.g. { requestsPerMonth: 10000, tokensPerMonth: 5000000 }
   */
  setQuota(tenantId, limits) {
    this._quotas.set(tenantId, { ...limits, updatedAt: new Date().toISOString() });
    logger.info('UsageMetering', 'Quota set', { tenantId, limits });
  }

  /**
   * Record a usage event.
   * @param {string} tenantId
   * @param {object} event
   * @param {string}   event.type       - e.g. 'api_call', 'token_usage', 'project_generated'
   * @param {number}   [event.quantity] - Amount consumed (default: 1)
   * @param {string}   [event.userId]
   * @param {object}   [event.metadata]
   */
  record(tenantId, event) {
    if (!tenantId) throw new Error('UsageMetering.record: tenantId is required');
    if (!event.type) throw new Error('UsageMetering.record: event.type is required');

    const qty = event.quantity || 1;
    const entry = { tenantId, ...event, quantity: qty, timestamp: new Date().toISOString() };

    // Append to events ring buffer
    this._events.push(entry);
    if (this._events.length > this._maxEvents) this._events.shift();

    // Increment counters
    if (!this._usage.has(tenantId)) {
      this._usage.set(tenantId, { requests: 0, tokens: 0, projects: 0 });
    }
    const counters = this._usage.get(tenantId);
    if (event.type === 'api_call')           counters.requests += qty;
    else if (event.type === 'token_usage')   counters.tokens   += qty;
    else if (event.type === 'project_generated') counters.projects += qty;

    logger.debug('UsageMetering', 'Usage recorded', { tenantId, type: event.type, qty });
    return entry;
  }

  /**
   * Get current usage counters for a tenant.
   * @param {string} tenantId
   * @returns {object}
   */
  getUsage(tenantId) {
    return this._usage.get(tenantId) || { requests: 0, tokens: 0, projects: 0 };
  }

  /**
   * Get quota for a tenant.
   * @param {string} tenantId
   * @returns {object|null}
   */
  getQuota(tenantId) {
    return this._quotas.get(tenantId) || null;
  }

  /**
   * Check if a tenant is within quota for a given metric.
   * @param {string} tenantId
   * @param {string} metric  - 'requests' | 'tokens' | 'projects'
   * @returns {boolean}
   */
  withinQuota(tenantId, metric) {
    const quota   = this._quotas.get(tenantId);
    if (!quota) return true; // no quota = unlimited
    const usage   = this.getUsage(tenantId);
    const limitKey = metric + 'PerMonth';
    if (quota[limitKey] === undefined) return true;
    return usage[metric] < quota[limitKey];
  }

  /**
   * Get recent usage events for a tenant.
   * @param {string} tenantId
   * @param {number} [limit=100]
   * @returns {object[]}
   */
  getEvents(tenantId, limit = 100) {
    return this._events
      .filter(e => e.tenantId === tenantId)
      .slice(-limit);
  }

  /** @returns {{ tenants: number, totalEvents: number }} */
  stats() {
    return { tenants: this._usage.size, totalEvents: this._events.length };
  }
}

const usageMetering = new UsageMetering();

module.exports = { UsageMetering, usageMetering };
