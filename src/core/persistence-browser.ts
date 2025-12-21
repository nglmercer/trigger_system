
import { type PersistenceAdapter } from "./persistence";

/**
 * Browser LocalStorage Persistence Adapter
 * Uses window.localStorage to save state.
 * Fallbacks to in-memory if not available (e.g. Node env without polyfill).
 */
export class BrowserPersistence implements PersistenceAdapter {
  private keyPrefix: string;
  private cache: Map<string, any> = new Map();
  private isLoaded: boolean = false;

  constructor(prefix: string = "trigger_system:") {
    this.keyPrefix = prefix;
  }

  private isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private ensureLoaded() {
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

  private persist() {
    if (this.isAvailable()) {
        try {
            const obj = Object.fromEntries(this.cache);
            window.localStorage.setItem(this.keyPrefix + "state", JSON.stringify(obj));
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
    this.persist();
  }

  async deleteState(key: string): Promise<void> {
    this.ensureLoaded();
    this.cache.delete(key);
    this.persist();
  }

  async clearState(): Promise<void> {
    this.cache.clear();
    this.persist();
  }
}
