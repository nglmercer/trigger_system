/**
 * TriggerLoader Module
 * 
 * Modular loader for trigger rules with registry support.
 * 
 * @example
 * import { TriggerLoader } from './io/loader';
 * 
 * // Load rules from directory
 * const rules = await TriggerLoader.loadRulesFromDir('./rules');
 * 
 * // Load rules from file
 * const rules = await TriggerLoader.loadRule('./rules/my-rule.yaml');
 * 
 * // Watch for changes
 * TriggerLoader.watchRules('./rules', (rules) => console.log('Rules updated:', rules));
 * 
 * For full CRUD operations, use the modular classes:
 * - RuleRegistry for registry operations
 * - RulePersistence for file operations  
 * - RuleQuery for querying rules
 * - RuleWatcher for file watching
 */

import * as path from "path";
import * as fs from "fs";
import type { TriggerRule } from "../../types";
import { parseYamlRules, type YamlParserError } from "../../sdk/yaml-parser";

// Export modular classes
export { RuleRegistry } from "./registry";
export { RulePersistence } from "./persistence";
export { RuleQuery } from "./query";
export { RuleWatcher } from "./watch";
export type { RegistryEntry, LoaderOptions, RuleFileInfo } from "./types";

// ============================================================================
// TriggerLoader Class - Basic file loading utilities
// ============================================================================

export class TriggerLoader {
  private static defaultDir: string = './rules';
  private static watcher: fs.FSWatcher | null = null;

  // ========================================================================
  // Configuration
  // ========================================================================

  static setDefaultDir(dirPath: string): void {
    this.defaultDir = dirPath;
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    console.log(`[TriggerLoader] Default directory set to: ${dirPath}`);
  }

  static getDefaultDir(): string {
    return this.defaultDir;
  }

  // ========================================================================
  // File Loading
  // ========================================================================

  /**
   * Loads all YAML rule files from a directory
   */
  static async loadRulesFromDir(dirPath: string): Promise<TriggerRule[]> {
    const rules: TriggerRule[] = [];
    
    const walk = async (dir: string) => {
      let files;
      try {
        files = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (e) {
        console.error(`[TriggerLoader] Failed to readdir ${dir}:`, e);
        return;
      }

      for (const dirent of files) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
          await walk(res);
        } else if (res.toLowerCase().endsWith('.yaml') || res.toLowerCase().endsWith('.yml')) {
          try {
            const loaded = await this.loadRule(res);
            rules.push(...loaded);
          } catch (err) {
            console.error(`Failed to load rule from ${res}:`, err);
          }
        }
      }
    };

    if (fs.existsSync(dirPath)) {
      await walk(dirPath);
    } else {
      console.warn(`[TriggerLoader] Directory not found: ${dirPath}`);
    }

    return rules;
  }

  /**
   * Loads rules from a YAML file (supports multi-document)
   */
  static async loadRule(filePath: string, debug = (_err: YamlParserError | unknown) => {}): Promise<TriggerRule[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const result = parseYamlRules(content, { 
        filename: filePath,
        throwOnError: false 
      });
      
      if (result.errors.length > 0) {
        console.error(`Validation rule path: ${filePath}`);
        result.errors.forEach(err => debug(err));
      }

      const rules = result.rules.map((rule, index) => {
        if (!rule.id) {
          const base = path.basename(filePath, path.extname(filePath));
          rule.id = result.rules.length > 1 ? `${base}-${index}` : base;
        }
        return rule;
      });

      return rules;
    } catch (error) {
      debug({error, filePath});
      throw error;
    }
  }

  // ========================================================================
  // File Watching
  // ========================================================================

  static watchRules(dirPath: string, onUpdate: (rules: TriggerRule[]) => void): fs.FSWatcher {
    this.loadRulesFromDir(dirPath).then(onUpdate);
    console.log(`[TriggerLoader] Watching for changes in ${dirPath}...`);
    const watcher = fs.watch(dirPath, { recursive: true }, async (event, filename) => {
      if (filename && (String(filename).endsWith('.yaml') || String(filename).endsWith('.yml'))) {
        console.log(`[TriggerLoader] Detected change in ${filename} (${event}). Reloading rules...`);
        try {
          const rules = await this.loadRulesFromDir(dirPath);
          onUpdate(rules);
          console.log(`[TriggerLoader] Reloaded ${rules.length} rules.`);
        } catch (err) {
          console.error("[TriggerLoader] Failed to reload rules:", err);
        }
      }
    });
    return watcher;
  }

  static stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[TriggerLoader] Stopped watching');
    }
  }
}
