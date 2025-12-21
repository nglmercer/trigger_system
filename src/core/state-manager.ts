
import { type PersistenceAdapter, InMemoryPersistence } from "./persistence";

/**
 * State Manager
 * Handles persistent state across rule executions.
 * Allows for "Stateful Triggers" like counters, sequences, and goals.
 */
export class StateManager {
  private static instance: StateManager;
  private state: Map<string, any>;
  private persistence: PersistenceAdapter;

  private constructor() {
    this.state = new Map();
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
      this.state = loaded;
      console.log(`[StateManager] Initialized with ${this.state.size} keys.`);
  }

  /**
   * Get a value from the state. 
   */
  get(key: string): any {
    return this.state.get(key);
  }

  /**
   * Set a value in the state and persist it.
   */
  async set(key: string, value: any): Promise<void> {
    this.state.set(key, value);
    await this.persistence.saveState(key, value);
  }

  /**
   * Increment a numeric value explicitly.
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const current = this.get(key) || 0;
    const newVal = Number(current) + amount;
    await this.set(key, newVal);
    return newVal;
  }
  
  async decrement(key: string, amount: number = 1): Promise<number> {
      return this.increment(key, -amount);
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.state.delete(key);
    if (deleted) {
        await this.persistence.deleteState(key);
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.state.clear();
    await this.persistence.clearState();
  }

  /**
   * Export state as a plain object (for Context injection).
   */
  getAll(): Record<string, any> {
    return Object.fromEntries(this.state);
  }
}
