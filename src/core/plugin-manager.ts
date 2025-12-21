
import { ActionRegistry } from "../core/action-registry";
import type { ActionHandler } from "../core/action-registry";

export interface PluginManifest {
  name: string;
  version: string;
  actions?: Record<string, ActionHandler>;
  // Future: conditions, etc.
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins = new Map<string, PluginManifest>();

  private constructor() {}

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  registerPlugin(manifest: PluginManifest) {
    if (this.plugins.has(manifest.name)) {
      console.warn(`Plugin ${manifest.name} is already registered. Overwriting.`);
    }
    
    this.plugins.set(manifest.name, manifest);
    
    // Register actions
    if (manifest.actions) {
      const registry = ActionRegistry.getInstance();
      for (const [actionType, handler] of Object.entries(manifest.actions)) {
        // Namespace the action type? e.g. "pluginName:actionType"
        // For now, let's keep it direct, but maybe enforce namespacing in future.
        // Or assume the user provides specific unique names.
        
        // Let's implement auto-namespacing option or just direct register.
        // Direct register is more flexible but risky.
        // Let's namespace it: `pluginName:actionName`
        const namespacedType = `${manifest.name}:${actionType}`;
        registry.register(namespacedType, handler);
        console.log(`[PluginManager] Registered action: ${namespacedType}`);
      }
    }
  }

  getPlugin(name: string) {
    return this.plugins.get(name);
  }
}
