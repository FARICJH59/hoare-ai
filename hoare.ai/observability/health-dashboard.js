'use strict';

/**
 * Health Dashboard
 *
 * Aggregates health signals from all runtime services and produces
 * a structured health report for /api/health endpoints and dashboards.
 */

const logger = require('../utils/logger');

class HealthDashboard {
  constructor() {
    /** @type {Map<string, Function>} serviceName → health check function */
    this._checks = new Map();
    /** @type {Map<string, object>} serviceName → last result */
    this._cache   = new Map();
    this._cacheTtlMs = 15000; // 15s cache
  }

  /**
   * Register a health check for a service.
   * @param {string}   name         - Service name
   * @param {Function} checkFn      - async () => { healthy: boolean, details?: object }
   * @param {object}   [options]
   * @param {boolean}  [options.critical] - If true, failure marks overall status as unhealthy
   */
  register(name, checkFn, { critical = false } = {}) {
    if (typeof checkFn !== 'function') throw new Error(`HealthDashboard.register: checkFn for "${name}" must be a function`);
    this._checks.set(name, { fn: checkFn, critical });
    logger.debug('HealthDashboard', 'Health check registered', { name, critical });
  }

  /**
   * Run all registered health checks and return a structured report.
   * @param {boolean} [force=false] - Bypass cache
   * @returns {Promise<object>}
   */
  async check(force = false) {
    const now = Date.now();
    const results = {};
    const promises = [];

    for (const [name, { fn, critical }] of this._checks.entries()) {
      const cached = this._cache.get(name);
      if (!force && cached && (now - cached.checkedAt) < this._cacheTtlMs) {
        results[name] = cached;
        continue;
      }
      promises.push(
        Promise.resolve()
          .then(() => fn())
          .then(r => ({ name, critical, healthy: r.healthy !== false, details: r.details || {}, checkedAt: now, error: null }))
          .catch(err => ({ name, critical, healthy: false, details: {}, checkedAt: now, error: err.message }))
          .then(result => {
            this._cache.set(name, result);
            results[name] = result;
          })
      );
    }

    await Promise.all(promises);

    const services = Object.values(results);
    const allHealthy = services.every(s => s.healthy);
    const criticalUnhealthy = services.some(s => s.critical && !s.healthy);

    return {
      status:    allHealthy ? 'healthy' : criticalUnhealthy ? 'unhealthy' : 'degraded',
      timestamp: new Date(now).toISOString(),
      services:  results,
    };
  }

  /**
   * Quick check — returns true if all critical services are healthy.
   * Uses cached results if available.
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    const report = await this.check();
    return report.status !== 'unhealthy';
  }

  /** @returns {{ checks: number }} */
  stats() {
    return { checks: this._checks.size };
  }
}

const healthDashboard = new HealthDashboard();

module.exports = { HealthDashboard, healthDashboard };
