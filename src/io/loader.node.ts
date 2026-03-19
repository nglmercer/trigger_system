
import * as path from "path";
import * as fs from "fs";
import type { TriggerRule } from "../types";
import { parseYamlRules, type YamlParserError } from "../sdk/yaml-parser";

export class TriggerLoader {
  /**
   * Loads all YAML rule files from a directory
   */
  static async loadRulesFromDir(dirPath: string): Promise<TriggerRule[]> {
    const rules: TriggerRule[] = [];
    
    // Recursive walker function
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
                 // Case insensitive extension check
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
  static async loadRule(filePath: string,debug=(_err:YamlParserError|unknown)=>{}): Promise<TriggerRule[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      // Use the new YAML parser
      const result = parseYamlRules(content, { 
        filename: filePath,
        throwOnError: false 
      });
      
      // Log any validation errors
      if (result.errors.length > 0) {
        console.error(`Validation rule path: ${filePath}`);
        result.errors.forEach(err => {
          debug(err)
        });
      }

      // Assign ID from filename if missing
      const rules = result.rules.map((rule, index) => {
        if (!rule.id) {
          const base = path.basename(filePath, path.extname(filePath));
          rule.id = result.rules.length > 1 ? `${base}-${index}` : base;
        }
        return rule;
      });

      return rules;
    } catch (error) {
      debug({error,filePath});
      throw error;
    }
  }

  static watchRules(dirPath: string, onUpdate: (rules: TriggerRule[]) => void) {
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
}
