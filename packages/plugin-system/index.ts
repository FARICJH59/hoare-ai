import { Tool } from "../../tools";

// ── Plugin contract ──────────────────────────────────────────────────────────

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
}

export interface PluginRegistrations {
  tools?: Tool[];
  /** Future: agents, workflows, routes, knowledge, policies, events, UI, analytics */
}

export interface HoarePlugin {
  manifest: PluginManifest;
  register(): PluginRegistrations;
}

// ── Plugin Registry ──────────────────────────────────────────────────────────

export class PluginRegistry {
  private plugins: Map<string, { plugin: HoarePlugin; registrations: PluginRegistrations }> = new Map();

  /** Load a plugin: call its register() and store the results. */
  load(plugin: HoarePlugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin "${plugin.manifest.id}" is already loaded.`);
    }
    const registrations = plugin.register();
    this.plugins.set(plugin.manifest.id, { plugin, registrations });
  }

  /** Unload a plugin by ID. */
  unload(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  /** Get all tools registered by all loaded plugins. */
  getAllTools(): Tool[] {
    const tools: Tool[] = [];
    for (const { registrations } of this.plugins.values()) {
      if (registrations.tools) {
        tools.push(...registrations.tools);
      }
    }
    return tools;
  }

  /** List all loaded plugin manifests. */
  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.plugin.manifest);
  }

  /** Check if a plugin is loaded. */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /** Get registrations for a specific plugin. */
  getRegistrations(pluginId: string): PluginRegistrations | undefined {
    return this.plugins.get(pluginId)?.registrations;
  }

  /** Total number of loaded plugins. */
  size(): number {
    return this.plugins.size;
  }
}
