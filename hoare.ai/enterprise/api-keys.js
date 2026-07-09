'use strict';

/**
 * API Key Management
 *
 * Issues, validates, and revokes API keys for programmatic access.
 * Keys are scoped to a tenant and carry optional permission scopes.
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

const KEY_PREFIX = 'hk_';

/**
 * Hash an API key for safe storage (never store raw keys).
 * @param {string} raw
 * @returns {string}
 */
function hashKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate a cryptographically random API key.
 * @returns {string}
 */
function generateKey() {
  return KEY_PREFIX + crypto.randomBytes(32).toString('hex');
}

class ApiKeys {
  constructor() {
    /** @type {Map<string, object>} keyHash → key record */
    this._keys = new Map();
    /** @type {Map<string, string[]>} tenantId → [keyHash, ...] */
    this._byTenant = new Map();
  }

  /**
   * Issue a new API key.
   * @param {object} options
   * @param {string}   options.tenantId
   * @param {string}   options.name        - Human-readable label
   * @param {string[]} [options.scopes]    - Permission scopes (default: ['read','write'])
   * @param {string}   [options.expiresAt] - ISO date string; omit for no expiry
   * @returns {{ raw: string, record: object }} raw is shown once; record is stored
   */
  issue({ tenantId, name, scopes = ['read', 'write'], expiresAt }) {
    if (!tenantId) throw new Error('ApiKeys.issue: tenantId is required');
    if (!name)     throw new Error('ApiKeys.issue: name is required');

    const raw  = generateKey();
    const hash = hashKey(raw);
    const now  = new Date().toISOString();
    const record = {
      hash,
      tenantId,
      name,
      scopes,
      expiresAt:  expiresAt || null,
      createdAt:  now,
      lastUsedAt: null,
      revoked:    false,
    };

    this._keys.set(hash, record);
    if (!this._byTenant.has(tenantId)) this._byTenant.set(tenantId, []);
    this._byTenant.get(tenantId).push(hash);

    logger.info('ApiKeys', 'API key issued', { tenantId, name });
    return { raw, record };
  }

  /**
   * Validate an API key. Returns the record on success, null on failure.
   * @param {string} raw
   * @returns {object|null}
   */
  validate(raw) {
    if (!raw || !raw.startsWith(KEY_PREFIX)) return null;
    const hash = hashKey(raw);
    const record = this._keys.get(hash);
    if (!record) return null;
    if (record.revoked) return null;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return null;
    // Update last used timestamp
    record.lastUsedAt = new Date().toISOString();
    logger.debug('ApiKeys', 'API key validated', { tenantId: record.tenantId });
    return record;
  }

  /**
   * Revoke an API key by hash.
   * @param {string} hash
   * @returns {boolean}
   */
  revoke(hash) {
    const record = this._keys.get(hash);
    if (!record) return false;
    record.revoked = true;
    logger.info('ApiKeys', 'API key revoked', { hash: hash.slice(0, 8) + '...', tenantId: record.tenantId });
    return true;
  }

  /**
   * List all keys for a tenant (returns records without the raw key).
   * @param {string} tenantId
   * @returns {object[]}
   */
  listByTenant(tenantId) {
    const hashes = this._byTenant.get(tenantId) || [];
    return hashes.map(h => this._keys.get(h)).filter(Boolean);
  }

  /** @returns {{ total: number, active: number, revoked: number }} */
  stats() {
    let active = 0, revoked = 0;
    for (const r of this._keys.values()) {
      r.revoked ? revoked++ : active++;
    }
    return { total: this._keys.size, active, revoked };
  }
}

const apiKeys = new ApiKeys();

module.exports = { ApiKeys, apiKeys, generateKey, hashKey };
