'use strict';

/**
 * Role-Based Access Control (RBAC)
 *
 * Manages roles, permissions, and user-role assignments.
 * Supports hierarchical roles and resource-level permissions.
 */

const logger = require('../utils/logger');

// Built-in system roles
const SYSTEM_ROLES = {
  owner:  { name: 'owner',  permissions: ['*'] },
  admin:  { name: 'admin',  permissions: ['read', 'write', 'delete', 'invite', 'manage_keys'] },
  member: { name: 'member', permissions: ['read', 'write'] },
  viewer: { name: 'viewer', permissions: ['read'] },
};

class RBAC {
  constructor() {
    /** @type {Map<string, object>} roleId → role definition */
    this._roles = new Map(Object.entries(SYSTEM_ROLES));
    /** @type {Map<string, Map<string, string[]>>} tenantId → userId → [roleId, ...] */
    this._assignments = new Map();
  }

  /**
   * Define a custom role.
   * @param {object} role
   * @param {string}   role.name
   * @param {string[]} role.permissions
   * @param {string}   [role.inherits] - Parent role id to inherit from
   * @returns {object}
   */
  defineRole({ name, permissions, inherits }) {
    if (!name) throw new Error('RBAC.defineRole: name is required');
    const base = inherits ? (this._roles.get(inherits)?.permissions || []) : [];
    const all  = Array.from(new Set([...base, ...(permissions || [])]));
    const role = { name, permissions: all, inherits: inherits || null };
    this._roles.set(name, role);
    logger.info('RBAC', 'Role defined', { name, permissions: all });
    return role;
  }

  /**
   * Assign a role to a user within a tenant.
   * @param {string} tenantId
   * @param {string} userId
   * @param {string} roleId
   */
  assign(tenantId, userId, roleId) {
    if (!this._roles.has(roleId)) throw new Error(`RBAC.assign: role "${roleId}" not found`);
    if (!this._assignments.has(tenantId)) this._assignments.set(tenantId, new Map());
    const userMap = this._assignments.get(tenantId);
    if (!userMap.has(userId)) userMap.set(userId, []);
    const roles = userMap.get(userId);
    if (!roles.includes(roleId)) roles.push(roleId);
    logger.info('RBAC', 'Role assigned', { tenantId, userId, roleId });
  }

  /**
   * Revoke a role from a user within a tenant.
   * @param {string} tenantId
   * @param {string} userId
   * @param {string} roleId
   */
  revoke(tenantId, userId, roleId) {
    const userMap = this._assignments.get(tenantId);
    if (!userMap) return;
    const roles = userMap.get(userId) || [];
    const idx = roles.indexOf(roleId);
    if (idx !== -1) roles.splice(idx, 1);
    logger.info('RBAC', 'Role revoked', { tenantId, userId, roleId });
  }

  /**
   * Get roles assigned to a user in a tenant.
   * @param {string} tenantId
   * @param {string} userId
   * @returns {string[]}
   */
  getRoles(tenantId, userId) {
    const userMap = this._assignments.get(tenantId);
    return userMap ? (userMap.get(userId) || []) : [];
  }

  /**
   * Get all permissions for a user in a tenant (union of all assigned roles).
   * @param {string} tenantId
   * @param {string} userId
   * @returns {string[]}
   */
  getPermissions(tenantId, userId) {
    const roleIds = this.getRoles(tenantId, userId);
    const perms = new Set();
    for (const roleId of roleIds) {
      const role = this._roles.get(roleId);
      if (role) role.permissions.forEach(p => perms.add(p));
    }
    return Array.from(perms);
  }

  /**
   * Check if a user has a specific permission.
   * @param {string} tenantId
   * @param {string} userId
   * @param {string} permission
   * @returns {boolean}
   */
  can(tenantId, userId, permission) {
    const perms = this.getPermissions(tenantId, userId);
    return perms.includes('*') || perms.includes(permission);
  }

  /**
   * List all defined roles.
   * @returns {object[]}
   */
  listRoles() {
    return Array.from(this._roles.values());
  }

  /** @returns {{ roles: number, tenants: number }} */
  stats() {
    return { roles: this._roles.size, tenants: this._assignments.size };
  }
}

const rbac = new RBAC();

module.exports = { RBAC, rbac, SYSTEM_ROLES };
