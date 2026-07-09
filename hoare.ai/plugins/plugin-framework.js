'use strict';

/**
 * Plugin Framework
 *
 * Allows third-party developers to add agents, skills, capability packs,
 * and workflow templates without modifying the core runtime.
 *
 * A plugin is a plain object (or module) that declares:
 *   { id, name, version, agents?, skills?, packs?, templates? }
 *
 * The framework loads it and registers all declared components.
 */

const logger = require('../utils/logger');
const { agentRegistry }        = require('../registries/agent-registry');
const { skillRegistry }        = require('../registries/skill-registry');
const { capabilityMarketplace } = require('../marketplace/capability-marketplace');

class PluginFramework {
  constructor() {
    /** @type {Map<string, object>} pluginId → plugin manifest */
    this._plugins = new Map();
  }

  /**
   * Load and activate a plugin.
   *
   * @param {object} plugin
   * @param {string}   plugin.id       - Unique plugin identifier
   * @param {string}   plugin.name     - Human-readable name
   * @param {string}   plugin.version  - Semver
   * @param {string}   [plugin.author]
   * @param {string}   [plugin.description]
   * @param {object[]} [plugin.agents]    - Agent registration definitions
   * @param {object[]} [plugin.skills]    - Skill registration definitions
   * @param {object[]} [plugin.packs]     - Capability pack definitions
   * @param {object[]} [plugin.templates] - Workflow template definitions (metadata only)
   * @returns {object} summary of what was registered
   */
  load(plugin) {
    const { id, name, version } = plugin;
    if (!id)      throw new Error('PluginFramework.load: plugin.id is required');
    if (!name)    throw new Error('PluginFramework.load: plugin.name is required');
    if (!version) throw new Error('PluginFramework.load: plugin.version is required');

    if (this._plugins.has(id)) {
      logger.warn('PluginFramework', 'Plugin already loaded, reloading', { id });
      this.unload(id);
    }

    const summary = { agents: 0, skills: 0, packs: 0, templates: 0 };

    // Register agents
    for (const agent of (plugin.agents || [])) {
      agentRegistry.register({ ...agent, author: agent.author || id });
      summary.agents++;
    }

    // Register skills
    for (const skill of (plugin.skills || [])) {
      skillRegistry.register({ ...skill, pluginId: id });
      summary.skills++;
    }

    // Load capability packs
    for (const pack of (plugin.packs || [])) {
      capabilityMarketplace.load({ ...pack, author: pack.author || id });
      summary.packs++;
    }

    // Store template metadata (templates are workflow blueprints, not executed here)
    const templates = (plugin.templates || []).map(t => ({ ...t, pluginId: id }));
    summary.templates = templates.length;

    const manifest = {
      id,
      name,
      version,
      author:      plugin.author      || 'unknown',
      description: plugin.description || '',
      summary,
      templates,
      loadedAt: new Date().toISOString(),
    };

    this._plugins.set(id, manifest);
    logger.info('PluginFramework', 'Plugin loaded', { id, version, ...summary });
    return manifest;
  }

  /**
   * Unload a plugin and deregister its components.
   * @param {string} pluginId
   * @returns {boolean}
   */
  unload(pluginId) {
    const manifest = this._plugins.get(pluginId);
    if (!manifest) return false;

    // Deregister agents contributed by this plugin
    for (const a of agentRegistry.list()) {
      if (a.author === pluginId) agentRegistry.deregister(a.id);
    }

    // Deregister skills contributed by this plugin
    for (const s of skillRegistry.list()) {
      if (s.pluginId === pluginId) skillRegistry.deregister(s.id);
    }

    // Unload capability packs contributed by this plugin
    for (const p of capabilityMarketplace.listPacks()) {
      if (p.author === pluginId) capabilityMarketplace.unload(p.id);
    }

    this._plugins.delete(pluginId);
    logger.info('PluginFramework', 'Plugin unloaded', { pluginId });
    return true;
  }

  /**
   * Get a loaded plugin manifest.
   * @param {string} pluginId
   * @returns {object|null}
   */
  get(pluginId) {
    return this._plugins.get(pluginId) || null;
  }

  /**
   * List all loaded plugins.
   * @returns {object[]}
   */
  list() {
    return Array.from(this._plugins.values());
  }

  /**
   * List workflow templates across all loaded plugins.
   * @returns {object[]}
   */
  listTemplates() {
    const templates = [];
    for (const p of this._plugins.values()) {
      templates.push(...(p.templates || []));
    }
    return templates;
  }

  /** @returns {{ plugins: number, templates: number }} */
  stats() {
    let templates = 0;
    for (const p of this._plugins.values()) templates += (p.templates || []).length;
    return { plugins: this._plugins.size, templates };
  }
}

const pluginFramework = new PluginFramework();

module.exports = { PluginFramework, pluginFramework };
