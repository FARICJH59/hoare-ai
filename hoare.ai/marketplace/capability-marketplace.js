'use strict';

/**
 * Capability Marketplace
 *
 * Manages capability packs: loading, versioning, and per-tenant enable/disable.
 * Capability packs bundle related capabilities, agents, and skills into
 * installable units without modifying the core runtime.
 */

const logger = require('../utils/logger');

class CapabilityMarketplace {
  constructor() {
    /** @type {Map<string, object>} packId → pack definition */
    this._packs = new Map();
    /** @type {Map<string, Set<string>>} tenantId → Set of enabled packIds */
    this._tenantEnabled = new Map();
  }

  /**
   * Load a capability pack into the marketplace.
   *
   * @param {object} pack
   * @param {string}   pack.id          - Unique pack identifier
   * @param {string}   pack.name        - Human-readable name
   * @param {string}   pack.version     - Semver
   * @param {string}   [pack.description]
   * @param {string}   [pack.author]
   * @param {string[]} [pack.capabilities] - Capability IDs provided
   * @param {object[]} [pack.agents]    - Agent definitions to register
   * @param {object[]} [pack.skills]    - Skill definitions to register
   * @param {string[]} [pack.tags]
   * @returns {object}
   */
  load(pack) {
    const { id, name, version } = pack;
    if (!id)      throw new Error('CapabilityMarketplace.load: pack.id is required');
    if (!name)    throw new Error('CapabilityMarketplace.load: pack.name is required');
    if (!version) throw new Error('CapabilityMarketplace.load: pack.version is required');

    const entry = {
      ...pack,
      loadedAt: new Date().toISOString(),
    };
    this._packs.set(id, entry);
    logger.info('CapabilityMarketplace', 'Pack loaded', { id, version });
    return entry;
  }

  /**
   * Unload a capability pack.
   * @param {string} packId
   * @returns {boolean}
   */
  unload(packId) {
    if (!this._packs.has(packId)) return false;
    this._packs.delete(packId);
    // Remove from all tenant enablements
    for (const enabled of this._tenantEnabled.values()) {
      enabled.delete(packId);
    }
    logger.info('CapabilityMarketplace', 'Pack unloaded', { packId });
    return true;
  }

  /**
   * Retrieve a pack by id.
   * @param {string} packId
   * @returns {object|null}
   */
  getPack(packId) {
    return this._packs.get(packId) || null;
  }

  /**
   * List all loaded packs.
   * @returns {object[]}
   */
  listPacks() {
    return Array.from(this._packs.values());
  }

  /**
   * Enable a capability pack for a tenant.
   * @param {string} tenantId
   * @param {string} packId
   */
  enable(tenantId, packId) {
    if (!this._packs.has(packId)) throw new Error(`CapabilityMarketplace.enable: pack "${packId}" not found`);
    if (!this._tenantEnabled.has(tenantId)) this._tenantEnabled.set(tenantId, new Set());
    this._tenantEnabled.get(tenantId).add(packId);
    logger.info('CapabilityMarketplace', 'Pack enabled for tenant', { tenantId, packId });
  }

  /**
   * Disable a capability pack for a tenant.
   * @param {string} tenantId
   * @param {string} packId
   */
  disable(tenantId, packId) {
    const enabled = this._tenantEnabled.get(tenantId);
    if (enabled) enabled.delete(packId);
    logger.info('CapabilityMarketplace', 'Pack disabled for tenant', { tenantId, packId });
  }

  /**
   * Check if a pack is enabled for a tenant.
   * @param {string} tenantId
   * @param {string} packId
   * @returns {boolean}
   */
  isEnabled(tenantId, packId) {
    const enabled = this._tenantEnabled.get(tenantId);
    return enabled ? enabled.has(packId) : false;
  }

  /**
   * List packs enabled for a tenant.
   * @param {string} tenantId
   * @returns {object[]}
   */
  listEnabled(tenantId) {
    const enabled = this._tenantEnabled.get(tenantId) || new Set();
    return Array.from(enabled).map(id => this._packs.get(id)).filter(Boolean);
  }

  /** @returns {{ totalPacks: number, totalTenants: number }} */
  stats() {
    return {
      totalPacks: this._packs.size,
      totalTenants: this._tenantEnabled.size,
    };
  }
}

const capabilityMarketplace = new CapabilityMarketplace();

module.exports = { CapabilityMarketplace, capabilityMarketplace };
