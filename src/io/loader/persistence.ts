/**
 * TriggerLoader Persistence
 * 
 * File system operations for loading and saving rules.
 */

import * as path from "path";
import * as fs from "fs";
import type { TriggerRule } from "../../types";
import { parseYamlRules, type YamlParserError } from "../../sdk/yaml-parser";
import { RuleExporter } from "../../sdk/exporter";

/**
 * Persistence operations for rules
 */
export class RulePersistence {
  /**
   * Load rules from a directory (recursive)
   */
  static async loadFromDir(dirPath: string): Promise<TriggerRule[]> {
    const rules: TriggerRule[] = [];
    
    const walk = async (dir: string) => {
      let files;
      try {
        files = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (e) {
        console.error(`[RulePersistence] Failed to readdir ${dir}:`, e);
        return;
      }

      for (const dirent of files) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
          await walk(res);
        } else if (res.toLowerCase().endsWith('.yaml') || res.toLowerCase().endsWith('.yml')) {
          try {
            const loaded = await RulePersistence.loadFile(res);
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
      console.warn(`[RulePersistence] Directory not found: ${dirPath}`);
    }

    return rules;
  }

  /**
   * Load rules from a single file
   */
  static async loadFile(
    filePath: string, 
    debug: (err: YamlParserError | unknown) => void = () => {}
  ): Promise<TriggerRule[]> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const result = parseYamlRules(content, { 
      filename: filePath,
      throwOnError: false 
    });
    
    if (result.errors.length > 0) {
      console.error(`Validation rule path: ${filePath}`);
      result.errors.forEach(err => debug(err));
    }

    return result.rules.map((rule, index) => {
      if (!rule.id) {
        const base = path.basename(filePath, path.extname(filePath));
        rule.id = result.rules.length > 1 ? `${base}-${index}` : base;
      }
      return rule;
    });
  }

  /**
   * Save a rule to file
   */
  static async saveRule(rule: TriggerRule, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const yamlContent = RuleExporter.toCleanYaml(rule);
    await fs.promises.writeFile(filePath, yamlContent, 'utf-8');
  }

  /**
   * Save multiple rules
   */
  static async saveAll(
    rules: TriggerRule[], 
    baseDir: string,
    getFilePath: (ruleId: string) => string = (id) => `${baseDir}/${id}.yaml`
  ): Promise<string[]> {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    const savedPaths: string[] = [];
    
    for (const rule of rules) {
      const filePath = getFilePath(rule.id!);
      await this.saveRule(rule, filePath);
      savedPaths.push(filePath);
    }
    
    return savedPaths;
  }

  /**
   * Delete a rule file
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    await fs.promises.unlink(filePath);
    return true;
  }

  /**
   * Check if file exists
   */
  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Ensure directory exists
   */
  static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
