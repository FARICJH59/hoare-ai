'use strict';

/**
 * Organizations
 *
 * Hierarchical organization management for multi-tenant enterprise deployments.
 * Organizations own tenants; tenants own users and projects.
 */

const logger = require('../utils/logger');
const { generateProjectId } = require('../utils/id-generator');

class Organizations {
  constructor() {
    /** @type {Map<string, object>} orgId → org */
    this._orgs = new Map();
    /** @type {Map<string, string[]>} orgId → [tenantId, ...] */
    this._tenants = new Map();
    /** @type {Map<string, string>} tenantId → orgId */
    this._tenantToOrg = new Map();
  }

  /**
   * Create an organization.
   * @param {object} data
   * @param {string}   data.name
   * @param {string}   [data.plan]   - free|starter|growth|enterprise
   * @param {object}   [data.metadata]
   * @returns {object}
   */
  create({ name, plan = 'free', metadata = {} }) {
    if (!name) throw new Error('Organizations.create: name is required');
    const orgId = generateProjectId().replace('proj-', 'org-');
    const now = new Date().toISOString();
    const org = { orgId, name, plan, metadata, createdAt: now, updatedAt: now };
    this._orgs.set(orgId, org);
    this._tenants.set(orgId, []);
    logger.info('Organizations', 'Organization created', { orgId, name, plan });
    return org;
  }

  /**
   * Retrieve an organization by id.
   * @param {string} orgId
   * @returns {object|null}
   */
  get(orgId) {
    return this._orgs.get(orgId) || null;
  }

  /**
   * Update organization metadata.
   * @param {string} orgId
   * @param {object} updates
   * @returns {object}
   */
  update(orgId, updates) {
    const org = this._orgs.get(orgId);
    if (!org) throw new Error(`Organizations.update: org "${orgId}" not found`);
    const updated = { ...org, ...updates, orgId, updatedAt: new Date().toISOString() };
    this._orgs.set(orgId, updated);
    return updated;
  }

  /**
   * Add a tenant to an organization.
   * @param {string} orgId
   * @param {string} tenantId
   */
  addTenant(orgId, tenantId) {
    if (!this._orgs.has(orgId)) throw new Error(`Organizations.addTenant: org "${orgId}" not found`);
    if (!this._tenants.has(orgId)) this._tenants.set(orgId, []);
    const list = this._tenants.get(orgId);
    if (!list.includes(tenantId)) list.push(tenantId);
    this._tenantToOrg.set(tenantId, orgId);
    logger.info('Organizations', 'Tenant added to org', { orgId, tenantId });
  }

  /**
   * Remove a tenant from its organization.
   * @param {string} tenantId
   */
  removeTenant(tenantId) {
    const orgId = this._tenantToOrg.get(tenantId);
    if (!orgId) return;
    const list = this._tenants.get(orgId) || [];
    const idx = list.indexOf(tenantId);
    if (idx !== -1) list.splice(idx, 1);
    this._tenantToOrg.delete(tenantId);
  }

  /**
   * Get all tenants for an org.
   * @param {string} orgId
   * @returns {string[]}
   */
  listTenants(orgId) {
    return this._tenants.get(orgId) || [];
  }

  /**
   * Get the org for a tenant.
   * @param {string} tenantId
   * @returns {object|null}
   */
  getByTenant(tenantId) {
    const orgId = this._tenantToOrg.get(tenantId);
    return orgId ? this._orgs.get(orgId) || null : null;
  }

  /**
   * List all organizations.
   * @returns {object[]}
   */
  list() {
    return Array.from(this._orgs.values());
  }

  /** @returns {{ organizations: number, tenants: number }} */
  stats() {
    return { organizations: this._orgs.size, tenants: this._tenantToOrg.size };
  }
}

const organizations = new Organizations();

module.exports = { Organizations, organizations };
