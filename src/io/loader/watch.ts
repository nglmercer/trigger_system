/**
 * TriggerLoader Watch
 * 
 * File system watcher for real-time rule updates.
 */

import * as fs from "fs";
import type { TriggerRule } from "../../types";

/**
 * Callback for rule updates
 */
export type WatchCallback = (rules: TriggerRule[]) => void;

/**
 * File system watcher for rules
 */
export class RuleWatcher {
  private watcher: fs.FSWatcher | null = null;
  private dirPath: string = '';
  private callback: WatchCallback | null = null;
  private loadFn: ((dirPath: string) => Promise<TriggerRule[]>) | null = null;

  /**
   * Start watching a directory
   */
  start(
    dirPath: string, 
    loadFn: (dirPath: string) => Promise<TriggerRule[]>,
    onUpdate?: WatchCallback
  ): void {
    this.stop();
    
    this.dirPath = dirPath;
    this.loadFn = loadFn;
    this.callback = onUpdate || null;
    
    // Initial load
    loadFn(dirPath).then(rules => {
      if (this.callback) {
        this.callback(rules);
      }
    });
    
    console.log(`[RuleWatcher] Watching: ${dirPath}`);
    
    this.watcher = fs.watch(dirPath, { recursive: true }, async (event, filename) => {
      if (filename && (String(filename).endsWith('.yaml') || String(filename).endsWith('.yml'))) {
        console.log(`[RuleWatcher] Change detected: ${filename} (${event})`);
        
        try {
          const rules = await loadFn(dirPath);
          if (this.callback) {
            this.callback(rules);
          }
        } catch (err) {
          console.error('[RuleWatcher] Failed to reload:', err);
        }
      }
    });
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[RuleWatcher] Stopped');
    }
  }

  /**
   * Check if watching
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }

  /**
   * Get current watch path
   */
  getWatchPath(): string {
    return this.dirPath;
  }
}
