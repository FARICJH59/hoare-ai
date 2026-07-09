'use strict';

/**
 * Project Memory
 *
 * Persistent in-process storage for project records.
 * In production, this would be backed by a database (PostgreSQL, Redis, etc.).
 * Uses an in-memory Map for isolation and serializes to JSON for persistence.
 */

const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DEFAULT_STORE_PATH = path.join(process.env.HOARE_DATA_DIR || '/tmp', 'hoare-project-memory.json');

class ProjectMemory {
  /**
   * @param {object} [options]
   * @param {string} [options.storePath] - Path for JSON persistence file
   * @param {boolean} [options.persist]  - Whether to persist to disk (default true)
   */
  constructor(options = {}) {
    this.storePath = options.storePath || DEFAULT_STORE_PATH;
    this.persist   = options.persist !== false;
    this._store    = new Map(); // projectId → record
    this._byTenant = new Map(); // tenantId → Set<projectId>

    if (this.persist) this._load();
  }

  /**
   * Saves (upserts) a project record.
   * @param {object} record - Must have projectId, tenantId
   */
  save(record) {
    if (!record.projectId) throw new Error('record.projectId is required');
    if (!record.tenantId)  throw new Error('record.tenantId is required');

    const entry = { ...record, savedAt: new Date().toISOString() };
    this._store.set(record.projectId, entry);

    if (!this._byTenant.has(record.tenantId)) {
      this._byTenant.set(record.tenantId, new Set());
    }
    this._byTenant.get(record.tenantId).add(record.projectId);

    logger.debug('ProjectMemory', 'Project saved', { projectId: record.projectId, tenantId: record.tenantId });
    if (this.persist) this._flush();
    return entry;
  }

  /**
   * Retrieves a project record by ID.
   * @param {string} projectId
   * @returns {object|null}
   */
  get(projectId) {
    return this._store.get(projectId) || null;
  }

  /**
   * Returns all projects for a given tenant.
   * @param {string} tenantId
   * @returns {object[]}
   */
  listByTenant(tenantId) {
    const ids = this._byTenant.get(tenantId) || new Set();
    return Array.from(ids).map(id => this._store.get(id)).filter(Boolean);
  }

  /**
   * Returns all project records.
   * @returns {object[]}
   */
  listAll() {
    return Array.from(this._store.values());
  }

  /**
   * Deletes a project record.
   * @param {string} projectId
   * @returns {boolean}
   */
  delete(projectId) {
    const record = this._store.get(projectId);
    if (!record) return false;
    this._store.delete(projectId);
    const tenantSet = this._byTenant.get(record.tenantId);
    if (tenantSet) tenantSet.delete(projectId);
    if (this.persist) this._flush();
    return true;
  }

  /**
   * Returns memory statistics.
   * @returns {object}
   */
  stats() {
    return {
      totalProjects: this._store.size,
      tenants: this._byTenant.size,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  _flush() {
    try {
      const data = JSON.stringify(Array.from(this._store.entries()), null, 2);
      fs.writeFileSync(this.storePath, data, 'utf8');
    } catch (err) {
      logger.warn('ProjectMemory', 'Failed to flush to disk', { error: err.message });
    }
  }

  _load() {
    try {
      if (!fs.existsSync(this.storePath)) return;
      const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
      for (const [id, record] of data) {
        this._store.set(id, record);
        if (!this._byTenant.has(record.tenantId)) {
          this._byTenant.set(record.tenantId, new Set());
        }
        this._byTenant.get(record.tenantId).add(id);
      }
      logger.info('ProjectMemory', 'Loaded from disk', { projects: this._store.size });
    } catch (err) {
      logger.warn('ProjectMemory', 'Failed to load from disk', { error: err.message });
    }
  }
}

module.exports = { ProjectMemory };
