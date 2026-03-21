
import { type PersistenceAdapter } from "./persistence";

/**
 * Browser LocalStorage Persistence Adapter
 * Uses window.localStorage to save state.
 * Fallbacks to in-memory if not available (e.g. Node env without polyfill).
 * 
 * Optimizations:
 * - Lazy loading: only reads from localStorage when first needed
 * - Debounced writes: batches multiple rapid changes into single write
 * - Manual flush: explicit persist() call for immediate write
 */
export class BrowserPersistence implements PersistenceAdapter {
  private keyPrefix: string;
  private cache: Map<string, any> = new Map();
  private isLoaded: boolean = false;
  private pendingWrite: ReturnType<typeof setTimeout> | null = null;
  private writeDelay: number;
  private dirty: boolean = false;

  constructor(prefix: string = "trigger_system:", options?: { writeDelay?: number }) {
    this.keyPrefix = prefix;
    this.writeDelay = options?.writeDelay ?? 100; // Default 100ms debounce
  }

  /**
   * Force immediate write to localStorage
   */
  public flush(): void {
    this.dirty = true;
    this.persist();
  }

  /**
   * Get the current cache (for debugging)
   */
  public getCache(): Map<string, any> {
    this.ensureLoaded();
    return new Map(this.cache);
  }

  /**
   * Check if there are pending writes
   */
  public isDirty(): boolean {
    return this.dirty;
  }

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  public ensureLoaded() {
    if (this.isLoaded) return;
    
    if (this.isAvailable()) {
        try {
            const raw = window.localStorage.getItem(this.keyPrefix + "state");
            if (raw) {
                const json = JSON.parse(raw);
                this.cache = new Map(Object.entries(json));
            }
        } catch (error) {
            console.error(`[BrowserPersistence] Failed to load from localStorage:`, error);
        }
    }
    this.isLoaded = true;
  }

  private schedulePersist() {
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
    }
    
    this.dirty = true;
    this.pendingWrite = setTimeout(() => {
      this.persist();
      this.pendingWrite = null;
    }, this.writeDelay);
  }

  private persist() {
    // Cancel any pending write if explicitly calling persist
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
      this.pendingWrite = null;
    }
    
    if (this.isAvailable()) {
        try {
            const obj = Object.fromEntries(this.cache);
            window.localStorage.setItem(this.keyPrefix + "state", JSON.stringify(obj));
            this.dirty = false;
        } catch (error) {
             console.error(`[BrowserPersistence] Failed to save to localStorage:`, error);
        }
    }
  }

  async loadState(): Promise<Map<string, any>> {
    this.ensureLoaded();
    return new Map(this.cache);
  }

  async saveState(key: string, value: any): Promise<void> {
    this.ensureLoaded();
    this.cache.set(key, value);
    this.schedulePersist();
  }

  async deleteState(key: string): Promise<void> {
    this.ensureLoaded();
    this.cache.delete(key);
    this.schedulePersist();
  }

  async clearState(): Promise<void> {
    this.cache.clear();
    this.schedulePersist();
  }
}
