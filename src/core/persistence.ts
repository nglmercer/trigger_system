
/**
 * Persistence Adapter Interface
 * Allows the StateManager to save/load state from external storage (Redis, SQLite, File, etc.)
 */
export interface PersistenceAdapter {
  /**
   * Load state from storage on startup
   */
  loadState(): Promise<Map<string, unknown>>;

  /**
   * Save a single key-value pair
   */
  saveState(key: string, value: unknown): Promise<void>;

  /**
   * Delete a key
   */
  deleteState(key: string): Promise<void>;

  /**
   * Clear all state
   */
  clearState(): Promise<void>;
}

/**
 * InMemory Adapter (Default)
 * Does not persist across restarts, but fulfills the interface.
 */
export class InMemoryPersistence implements PersistenceAdapter {
  private store = new Map<string, unknown>();

  async loadState(): Promise<Map<string, unknown>> {
    return new Map(this.store);
  }

  async saveState(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async deleteState(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clearState(): Promise<void> {
    this.store.clear();
  }
}
