'use strict';

/**
 * HOARE.ai JavaScript / TypeScript SDK
 *
 * High-level client for HOARE.ai APIs.
 * Wraps RestClient with domain-specific methods.
 *
 * Usage (Node.js / browser / TypeScript):
 *   const { HoareClient } = require('hoare-ai-runtime/sdk');
 *   const client = new HoareClient({ apiKey: 'hk_...' });
 *   const result = await client.generate('Build a SaaS platform');
 */

const { RestClient } = require('./rest-client');

class HoareClient {
  /**
   * @param {object} [options]
   * @param {string} [options.baseUrl]
   * @param {string} [options.apiKey]
   * @param {number} [options.timeoutMs]
   */
  constructor(options = {}) {
    this._http = new RestClient(options);
  }

  // ── Health ────────────────────────────────────────────────────────────────

  /** @returns {Promise<object>} */
  health() {
    return this._http.get('/api/health');
  }

  // ── Project Generation ────────────────────────────────────────────────────

  /**
   * Generate a project from a natural language prompt.
   * @param {string} prompt
   * @param {object} [options]
   * @param {string}   [options.tenantId]
   * @param {boolean}  [options.submitToQgps]
   * @returns {Promise<object>}
   */
  generate(prompt, options = {}) {
    return this._http.post('/api/generate', { prompt, ...options });
  }

  // ── Agent Registry ────────────────────────────────────────────────────────

  /** @returns {Promise<object[]>} */
  listAgents(kind) {
    const q = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return this._http.get(`/api/registry/agents${q}`);
  }

  // ── Skill Registry ────────────────────────────────────────────────────────

  /** @returns {Promise<object[]>} */
  listSkills(kind) {
    const q = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return this._http.get(`/api/registry/skills${q}`);
  }

  // ── Capability Marketplace ────────────────────────────────────────────────

  /** @returns {Promise<object[]>} */
  listCapabilityPacks() {
    return this._http.get('/api/marketplace/packs');
  }

  /**
   * @param {string} tenantId
   * @param {string} packId
   * @returns {Promise<object>}
   */
  enablePack(tenantId, packId) {
    return this._http.post('/api/marketplace/enable', { tenantId, packId });
  }

  /**
   * @param {string} tenantId
   * @param {string} packId
   * @returns {Promise<object>}
   */
  disablePack(tenantId, packId) {
    return this._http.post('/api/marketplace/disable', { tenantId, packId });
  }

  // ── Observability ─────────────────────────────────────────────────────────

  /** @returns {Promise<object>} */
  getMetrics() {
    return this._http.get('/api/observability/metrics');
  }

  /** @returns {Promise<object[]>} */
  listTraces(limit = 20) {
    return this._http.get(`/api/observability/traces?limit=${limit}`);
  }

  // ── Enterprise ────────────────────────────────────────────────────────────

  /**
   * @param {string} tenantId
   * @returns {Promise<object>}
   */
  getUsage(tenantId) {
    return this._http.get(`/api/enterprise/usage?tenantId=${encodeURIComponent(tenantId)}`);
  }
}

module.exports = { HoareClient };
