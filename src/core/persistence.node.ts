
import { type PersistenceAdapter } from "./persistence";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

/**
 * FileSystem Persistence Adapter
 * Saves state to a JSON file on disk.
 * 
 * Optimizations:
 * - Lazy loading: only reads file when first needed
 * - Optional debounced writes: batches multiple rapid changes (disabled by default)
 * - Manual flush: explicit persist() call for immediate write
 */
export class FilePersistence implements PersistenceAdapter {
  private filePath: string;
  private cache: Map<string, any> = new Map();
  private isLoaded: boolean = false;
  private pendingWrite: ReturnType<typeof setTimeout> | null = null;
  private writeDelay: number;
  private dirty: boolean = false;

  constructor(filePath: string, options?: { writeDelay?: number }) {
    this.filePath = filePath;
    this.writeDelay = options?.writeDelay ?? 0; // Default: immediate write (0 = disabled)
  }

  /**
   * Force immediate write to disk
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

  private ensureLoaded() {
    if (this.isLoaded) return;
    
    try {
        if (existsSync(this.filePath)) {
            const data = readFileSync(this.filePath, 'utf-8');
            const json = JSON.parse(data);
            this.cache = new Map(Object.entries(json));
        }
    } catch (error) {
        console.error(`[FilePersistence] Failed to load state from ${this.filePath}:`, error);
        this.cache = new Map();
    }
    this.isLoaded = true;
  }

  private schedulePersist() {
    // If writeDelay is 0, write immediately
    if (this.writeDelay <= 0) {
      this.persist();
      return;
    }
    
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
    }
    
    this.dirty = true;
    this.pendingWrite = setTimeout(() => {
      this.persist();
      this.pendingWrite = null;
    }, this.writeDelay);
  }

  public persist() {
    // Cancel any pending write if explicitly calling persist
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
      this.pendingWrite = null;
    }
    
    try {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        
        const obj = Object.fromEntries(this.cache);
        writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
        this.dirty = false;
    } catch (error) {
         console.error(`[FilePersistence] Failed to save state to ${this.filePath}:`, error);
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
