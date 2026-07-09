'use strict';

/**
 * Agent Registry
 *
 * Provides dynamic agent discovery, metadata storage, versioning,
 * and hot registration without modifying the core runtime.
 */

const logger = require('../utils/logger');

class AgentRegistry {
  constructor() {
    /** @type {Map<string, object>} agentId → registration */
    this._agents = new Map();
    /** @type {Map<string, string[]>} kind → [agentId, ...] */
    this._byKind = new Map();
  }

  /**
   * Register an agent.
   *
   * @param {object} registration
   * @param {string}   registration.id          - Unique agent identifier
   * @param {string}   registration.name        - Human-readable name
   * @param {string}   registration.kind        - Category (intent|planner|factory|custom)
   * @param {string}   registration.version     - Semver string
   * @param {string}   [registration.author]    - Author / plugin namespace
   * @param {string}   [registration.description]
   * @param {string[]} [registration.capabilities]
   * @param {Function} registration.handler     - async (input, ctx) => output
   * @returns {object}
   */
  register(registration) {
    const { id, name, kind, version, handler } = registration;
    if (!id)      throw new Error('AgentRegistry.register: id is required');
    if (!name)    throw new Error('AgentRegistry.register: name is required');
    if (!kind)    throw new Error('AgentRegistry.register: kind is required');
    if (!version) throw new Error('AgentRegistry.register: version is required');
    if (typeof handler !== 'function') throw new Error('AgentRegistry.register: handler must be a function');

    const entry = { ...registration, registeredAt: new Date().toISOString() };
    this._agents.set(id, entry);

    if (!this._byKind.has(kind)) this._byKind.set(kind, []);
    const kindList = this._byKind.get(kind);
    if (!kindList.includes(id)) kindList.push(id);

    logger.info('AgentRegistry', 'Agent registered', { id, kind, version });
    return entry;
  }

  /**
   * Deregister an agent by id.
   * @param {string} id
   * @returns {boolean}
   */
  deregister(id) {
    const entry = this._agents.get(id);
    if (!entry) return false;
    this._agents.delete(id);
    const kindList = this._byKind.get(entry.kind) || [];
    const idx = kindList.indexOf(id);
    if (idx !== -1) kindList.splice(idx, 1);
    logger.info('AgentRegistry', 'Agent deregistered', { id });
    return true;
  }

  /**
   * Retrieve a registered agent by id.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    return this._agents.get(id) || null;
  }

  /**
   * List all agents, optionally filtered by kind.
   * @param {string} [kind]
   * @returns {object[]}
   */
  list(kind) {
    if (kind) {
      const ids = this._byKind.get(kind) || [];
      return ids.map(id => this._agents.get(id)).filter(Boolean);
    }
    return Array.from(this._agents.values());
  }

  /**
   * Invoke a registered agent by id.
   * @param {string} id
   * @param {*} input
   * @param {object} [ctx]
   * @returns {Promise<*>}
   */
  async invoke(id, input, ctx = {}) {
    const agent = this._agents.get(id);
    if (!agent) throw new Error(`AgentRegistry.invoke: agent "${id}" not found`);
    logger.debug('AgentRegistry', 'Invoking agent', { id });
    return agent.handler(input, ctx);
  }

  /** @returns {{ total: number, kinds: object }} */
  stats() {
    const kinds = {};
    for (const [kind, ids] of this._byKind.entries()) {
      kinds[kind] = ids.length;
    }
    return { total: this._agents.size, kinds };
  }
}

const agentRegistry = new AgentRegistry();

module.exports = { AgentRegistry, agentRegistry };
