
import { type PersistenceAdapter } from "./persistence";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

/**
 * FileSystem Persistence Adapter
 * Saves state to a JSON file on disk.
 */
export class FilePersistence implements PersistenceAdapter {
  private filePath: string;
  private cache: Map<string, any> = new Map();
  private isLoaded: boolean = false;

  constructor(filePath: string) {
    this.filePath = filePath;
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
        // Start empty if corrupt or error
        this.cache = new Map();
    }
    this.isLoaded = true;
  }

  private persist() {
    try {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        
        const obj = Object.fromEntries(this.cache);
        writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
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
