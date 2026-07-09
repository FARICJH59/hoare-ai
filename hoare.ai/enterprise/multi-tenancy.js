'use strict';

/**
 * Multi-tenancy Manager
 *
 * Manages tenant lifecycle, configuration, and isolation.
 * Coordinates with Organizations, RBAC, and UsageMetering.
 */

const logger = require('../utils/logger');
const { generateProjectId } = require('../utils/id-generator');

class MultiTenancy {
  constructor() {
    /** @type {Map<string, object>} tenantId → tenant */
    this._tenants = new Map();
  }

  /**
   * Create a tenant.
   * @param {object} data
   * @param {string}   data.name
   * @param {string}   [data.orgId]    - Parent organization
   * @param {string}   [data.plan]     - free|starter|growth|enterprise
   * @param {object}   [data.config]   - Custom tenant config (feature flags, etc.)
   * @returns {object}
   */
  create({ name, orgId, plan = 'free', config = {} }) {
    if (!name) throw new Error('MultiTenancy.create: name is required');
    const tenantId = generateProjectId().replace('proj-', 'tenant-');
    const now = new Date().toISOString();
    const tenant = {
      tenantId,
      name,
      orgId:     orgId || null,
      plan,
      config,
      status:    'active',
      createdAt: now,
      updatedAt: now,
    };
    this._tenants.set(tenantId, tenant);
    logger.info('MultiTenancy', 'Tenant created', { tenantId, name, plan });
    return tenant;
  }

  /**
   * Retrieve a tenant.
   * @param {string} tenantId
   * @returns {object|null}
   */
  get(tenantId) {
    return this._tenants.get(tenantId) || null;
  }

  /**
   * Update tenant configuration.
   * @param {string} tenantId
   * @param {object} updates
   * @returns {object}
   */
  update(tenantId, updates) {
    const tenant = this._tenants.get(tenantId);
    if (!tenant) throw new Error(`MultiTenancy.update: tenant "${tenantId}" not found`);
    const updated = { ...tenant, ...updates, tenantId, updatedAt: new Date().toISOString() };
    this._tenants.set(tenantId, updated);
    return updated;
  }

  /**
   * Suspend a tenant (blocks API access).
   * @param {string} tenantId
   * @returns {object}
   */
  suspend(tenantId) {
    return this.update(tenantId, { status: 'suspended' });
  }

  /**
   * Reactivate a suspended tenant.
   * @param {string} tenantId
   * @returns {object}
   */
  activate(tenantId) {
    return this.update(tenantId, { status: 'active' });
  }

  /**
   * Check if a tenant is active.
   * @param {string} tenantId
   * @returns {boolean}
   */
  isActive(tenantId) {
    const tenant = this._tenants.get(tenantId);
    return tenant ? tenant.status === 'active' : false;
  }

  /**
   * List all tenants, optionally filtered by org.
   * @param {string} [orgId]
   * @returns {object[]}
   */
  list(orgId) {
    const all = Array.from(this._tenants.values());
    return orgId ? all.filter(t => t.orgId === orgId) : all;
  }

  /** @returns {{ tenants: number, active: number, suspended: number }} */
  stats() {
    let active = 0, suspended = 0;
    for (const t of this._tenants.values()) {
      t.status === 'active' ? active++ : suspended++;
    }
    return { tenants: this._tenants.size, active, suspended };
  }
}

const multiTenancy = new MultiTenancy();

module.exports = { MultiTenancy, multiTenancy };
