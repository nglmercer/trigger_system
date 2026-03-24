
import { type PersistenceAdapter, InMemoryPersistence } from "./persistence";
import type { GlobalStateConfig, StateDefinition, HelperFunction } from "../types";

/**
 * State Manager
 * Handles persistent state across rule executions and manages the global `vars` proxy.
 * `vars` acts as the single namespace containing `state`, `helpers`, and variables.
 */
export class StateManager {
  private static instance: StateManager;
  private vars: Record<string, any>;
  private persistence: PersistenceAdapter;

  private constructor() {
    this.vars = {
        state: {},
        helpers: {}
    };
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
          this.vars.state = Object.fromEntries(loaded);
      } else {
          this.vars.state = loaded || {};
      }
      console.log(`[StateManager] Initialized with ${Object.keys(this.vars.state).length} root state keys.`);
  }

  /**
   * Merges objects or function records into the vars space.
   */
  mergeElements(elements: Record<string, any>) {
      if (!elements) return;
      for (const [key, value] of Object.entries(elements)) {
          if (typeof value === 'function') {
              this.vars.helpers[key] = value;
              this.vars[key] = value;
          } else if (key === 'state') {
              Object.assign(this.vars.state, value);
          } else if (key === 'helpers') {
              Object.assign(this.vars.helpers, value);
              Object.assign(this.vars, value);
          } else {
              this.vars[key] = value;
          }
      }
  }

  /**
   * Get a value from the state.
   */
  get(key: string): unknown {
    return this.vars.state[key];
  }

  /**
   * Set a value in the state and persist it.
   */
  async set(key: string, value: unknown): Promise<void> {
    this.vars.state[key] = value;
    await this.persistence.saveState(key, value);
  }

  /**
   * Increment a numeric value explicitly in state.
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const current = this.vars.state[key] || 0;
    const newVal = Number(current) + amount;
    this.vars.state[key] = newVal;
    await this.persistence.saveState(key, newVal);
    return newVal;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
      return this.increment(key, -amount);
  }

  async delete(key: string): Promise<boolean> {
    if (key in this.vars.state) {
        delete this.vars.state[key];
        await this.persistence.deleteState(key);
        return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    this.vars.state = {};
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
              if (this.vars.state[key] === undefined) {
                  await this.set(key, def);
              }
          } else {
              // It's a StateDefinition
              const stateDef = def as StateDefinition;
              if (this.vars.state[key] === undefined) {
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
   * Export state as a plain object
   */
  getAll(): Record<string, unknown> {
    return { ...this.vars.state };
  }

  /**
   * Returns a Proxy representing `vars`, which automatically persists changes to `vars.state`.
   * Also merges initial variables and helpers into vars space.
   */
  getVarsProxy(initialVars?: Record<string, unknown>, helpers?: Record<string, HelperFunction>): any {
      if (initialVars) this.mergeElements(initialVars);
      if (helpers) this.mergeElements(helpers);

      const self = this;

      function createRecursiveProxy(obj: any, path: string[] = []): any {
          return new Proxy(obj, {
              get(target, prop) {
                  if (prop === '_isProxy') return true;
                  if (typeof prop !== 'string') return target[prop];
                  
                  const val = target[prop];

                  // Bind functions to main target to retain 'this' context if needed
                  if (typeof val === 'function') {
                      return val.bind(target);
                  }

                  // If it's a nested object, proxy it further
                  if (val && typeof val === 'object' && !Array.isArray(val)) {
                      return createRecursiveProxy(val, [...path, prop]);
                  }

                  return val;
              },
              set(target, prop, value) {
                  if (typeof prop !== 'string') return false;
                  target[prop] = value;

                  // Find if we are modifying state
                  // If path is ['state'], we are modifying vars.state direct children
                  if (path[0] === 'state') {
                      const rootKey = path.length > 1 ? path[1] : prop;
                      if (rootKey) {
                          self.persistence.saveState(rootKey, self.vars.state[rootKey]);
                      }
                  } else if (path.length === 0 && prop === 'state') {
                      // Attempt to replace the whole state? Re-persist fields if any.
                      const newState = value || {};
                      for (const [k, v] of Object.entries(newState)) {
                          self.persistence.saveState(k, v);
                      }
                  }
                  
                  return true;
              }
          });
      }

      return createRecursiveProxy(this.vars);
  }

  /**
   * Legacy method mapped to proxy vars
   */
  getLiveProxy(): any {
      return this.getVarsProxy();
  }
}
