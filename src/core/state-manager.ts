
import { type PersistenceAdapter, InMemoryPersistence } from "./persistence";
import type { GlobalStateConfig, StateDefinition } from "../types";

/**
 * State Manager
 * Handles persistent state across rule executions.
 * Allows for "Stateful Triggers" like counters, sequences, and goals.
 * Now supports nested objects and live proxy for direct manipulation.
 */
export class StateManager {
  private static instance: StateManager;
  private state: Record<string, any>;
  private persistence: PersistenceAdapter;

  private constructor() {
    this.state = {};
    this.persistence = new InMemoryPersistence();
  }

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Configure the persistence adapter.
   */
  setPersistence(adapter: PersistenceAdapter) {
      this.persistence = adapter;
  }

  /**
   * Load state from persistence. Should be called at startup.
   */
  async initialize(): Promise<void> {
      const loaded = await this.persistence.loadState();
      // Handle Map if coming from older persistence or standard object
      if (loaded instanceof Map) {
          this.state = Object.fromEntries(loaded);
      } else {
          this.state = loaded || {};
      }
      console.log(`[StateManager] Initialized with ${Object.keys(this.state).length} root keys.`);
  }

  /**
   * Get a value from the state.
   */
  get(key: string): unknown {
    return this.state[key];
  }

  /**
   * Set a value in the state and persist it.
   */
  async set(key: string, value: unknown): Promise<void> {
    this.state[key] = value;
    await this.persistence.saveState(key, value);
  }

  /**
   * Increment a numeric value explicitly.
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const current = this.state[key] || 0;
    const newVal = Number(current) + amount;
    this.state[key] = newVal;
    await this.persistence.saveState(key, newVal);
    return newVal;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
      return this.increment(key, -amount);
  }

  async delete(key: string): Promise<boolean> {
    if (key in this.state) {
        delete this.state[key];
        await this.persistence.deleteState(key);
        return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    this.state = {};
    await this.persistence.clearState();
  }

  /**
   * Apply a global state configuration (initial values and lifecycles)
   */
  async applyConfig(config: GlobalStateConfig): Promise<void> {
      if (!config.state) return;

      for (const [key, def] of Object.entries(config.state)) {
          // If it's a simple value, set it if not present
          if (typeof def !== 'object' || def === null || !('value' in def)) {
              if (this.state[key] === undefined) {
                  await this.set(key, def);
              }
          } else {
              // It's a StateDefinition
              const stateDef = def as StateDefinition;
              if (this.state[key] === undefined) {
                  await this.set(key, stateDef.value);
              }

              // Handle lifecycles (basic TTL support)
              if (stateDef.lifecycle?.ttl) {
                  this.setupTTL(key, stateDef.lifecycle.ttl);
              }
          }
      }
  }

  private setupTTL(key: string, ttl: string | number) {
      let ms = 0;
      if (typeof ttl === 'number') {
          ms = ttl;
      } else {
          const match = ttl.match(/^(\d+)([smhd])$/);
          if (match && match[1] && match[2]) {
              const val = parseInt(match[1]);
              const unit = match[2];
              const multi: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
              ms = val * (multi[unit] || 0);
          }
      }

      if (ms > 0) {
          setTimeout(() => {
              this.delete(key).catch(console.error);
          }, ms);
      }
  }

  /**
   * Export state as a plain object (for Context injection).
   */
  getAll(): Record<string, unknown> {
    return { ...this.state };
  }

  /**
   * Returns a Proxy that automatically persists changes.
   * Supports nested objects recursively.
   */
  getLiveProxy(): any {
      const self = this;

      function createRecursiveProxy(obj: any, path: string[] = []): any {
          return new Proxy(obj, {
              get(target, prop) {
                  // Standard property access
                  const val = target[prop as string];

                  // If it's an object (but not null/array), wrap it in a proxy too
                  if (val && typeof val === 'object' && !Array.isArray(val)) {
                      return createRecursiveProxy(val, [...path, prop as string]);
                  }

                  // Support for auto-creating missing nested objects if someone tries to access them?
                  // For now, let's keep it simple and just return the value.
                  return val;
              },
              set(target, prop, value) {
                  if (typeof prop !== 'string') return false;
                  target[prop] = value;

                  // Find the root key to persist
                  const rootKey = path.length > 0 ? path[0] : prop;
                  if (rootKey) {
                      self.persistence.saveState(rootKey, self.state[rootKey]);
                  }
                  return true;
              }
          });
      }

      return createRecursiveProxy(this.state);
  }
}
