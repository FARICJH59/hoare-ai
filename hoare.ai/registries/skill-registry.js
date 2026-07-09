'use strict';

/**
 * Skill Registry
 *
 * Supports industry skills, AI skills, tool skills, and a plugin loader.
 * Skills are atomic capabilities (e.g. "send-email", "query-database")
 * that agents can compose into workflows.
 */

const logger = require('../utils/logger');

const SKILL_KINDS = Object.freeze(['industry', 'ai', 'tool', 'workflow']);

class SkillRegistry {
  constructor() {
    /** @type {Map<string, object>} skillId → skill */
    this._skills = new Map();
    /** @type {Map<string, string[]>} kind → [skillId, ...] */
    this._byKind = new Map();
    /** @type {Map<string, string[]>} pluginId → [skillId, ...] */
    this._byPlugin = new Map();
  }

  /**
   * Register a skill.
   *
   * @param {object} skill
   * @param {string}   skill.id          - Unique skill identifier
   * @param {string}   skill.name        - Human-readable name
   * @param {string}   skill.kind        - industry|ai|tool|workflow
   * @param {string}   skill.version     - Semver
   * @param {string}   [skill.pluginId]  - Owning plugin namespace
   * @param {string}   [skill.description]
   * @param {object}   [skill.inputSchema]  - JSON Schema for inputs
   * @param {object}   [skill.outputSchema] - JSON Schema for outputs
   * @param {Function} skill.execute     - async (params, ctx) => result
   * @returns {object}
   */
  register(skill) {
    const { id, name, kind, version, execute } = skill;
    if (!id)      throw new Error('SkillRegistry.register: id is required');
    if (!name)    throw new Error('SkillRegistry.register: name is required');
    if (!SKILL_KINDS.includes(kind)) throw new Error(`SkillRegistry.register: kind must be one of ${SKILL_KINDS.join('|')}`);
    if (!version) throw new Error('SkillRegistry.register: version is required');
    if (typeof execute !== 'function') throw new Error('SkillRegistry.register: execute must be a function');

    const entry = { ...skill, registeredAt: new Date().toISOString() };
    this._skills.set(id, entry);

    if (!this._byKind.has(kind)) this._byKind.set(kind, []);
    const kindList = this._byKind.get(kind);
    if (!kindList.includes(id)) kindList.push(id);

    if (skill.pluginId) {
      if (!this._byPlugin.has(skill.pluginId)) this._byPlugin.set(skill.pluginId, []);
      const pluginList = this._byPlugin.get(skill.pluginId);
      if (!pluginList.includes(id)) pluginList.push(id);
    }

    logger.info('SkillRegistry', 'Skill registered', { id, kind, version });
    return entry;
  }

  /**
   * Load skills from a plugin definition object.
   * @param {object} plugin
   * @param {string}   plugin.id     - Plugin identifier
   * @param {object[]} plugin.skills - Array of skill definitions
   * @returns {number} Number of skills loaded
   */
  loadPlugin(plugin) {
    if (!plugin || !plugin.id) throw new Error('SkillRegistry.loadPlugin: plugin.id is required');
    const skills = Array.isArray(plugin.skills) ? plugin.skills : [];
    let loaded = 0;
    for (const skill of skills) {
      this.register({ ...skill, pluginId: plugin.id });
      loaded++;
    }
    logger.info('SkillRegistry', 'Plugin loaded', { pluginId: plugin.id, skills: loaded });
    return loaded;
  }

  /**
   * Deregister a skill.
   * @param {string} id
   * @returns {boolean}
   */
  deregister(id) {
    const skill = this._skills.get(id);
    if (!skill) return false;
    this._skills.delete(id);
    const kindList = this._byKind.get(skill.kind) || [];
    const ki = kindList.indexOf(id);
    if (ki !== -1) kindList.splice(ki, 1);
    if (skill.pluginId) {
      const pluginList = this._byPlugin.get(skill.pluginId) || [];
      const pi = pluginList.indexOf(id);
      if (pi !== -1) pluginList.splice(pi, 1);
    }
    return true;
  }

  /**
   * Retrieve a skill by id.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    return this._skills.get(id) || null;
  }

  /**
   * List skills, optionally filtered by kind.
   * @param {string} [kind]
   * @returns {object[]}
   */
  list(kind) {
    if (kind) {
      const ids = this._byKind.get(kind) || [];
      return ids.map(id => this._skills.get(id)).filter(Boolean);
    }
    return Array.from(this._skills.values());
  }

  /**
   * Execute a skill by id.
   * @param {string} id
   * @param {object} params
   * @param {object} [ctx]
   * @returns {Promise<*>}
   */
  async execute(id, params, ctx = {}) {
    const skill = this._skills.get(id);
    if (!skill) throw new Error(`SkillRegistry.execute: skill "${id}" not found`);
    logger.debug('SkillRegistry', 'Executing skill', { id });
    return skill.execute(params, ctx);
  }

  /** @returns {{ total: number, byKind: object, plugins: number }} */
  stats() {
    const byKind = {};
    for (const [kind, ids] of this._byKind.entries()) {
      byKind[kind] = ids.length;
    }
    return { total: this._skills.size, byKind, plugins: this._byPlugin.size };
  }
}

const skillRegistry = new SkillRegistry();

module.exports = { SkillRegistry, skillRegistry, SKILL_KINDS };
