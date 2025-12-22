
import * as path from "path";
import * as fs from "fs";
import type { TriggerRule } from "../types";
import { TriggerValidator } from "../domain/validator";
import { parseAllDocuments } from "yaml";
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
  static async loadRule(filePath: string): Promise<TriggerRule[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Support multi-document YAML
      const yamlDocs = parseAllDocuments(content);
      
      // Check for parsing errors
      for (const doc of yamlDocs) {
          // In some yaml versions errors is an array on the doc
          if (doc.errors && doc.errors.length > 0) {
             throw new Error(`YAML syntax error in ${filePath}: ${doc.errors.map(e => e.message).join(', ')}`);
          }
      }

      const docs = yamlDocs.map(doc => doc.toJS());
      
      const rules: TriggerRule[] = [];

      // Flatten docs if the root is an array (Single doc with list of rules)
      let flattenedDocs: unknown[] = [];
      docs.forEach(d => {
          if (Array.isArray(d)) {
              flattenedDocs.push(...d);
          } else {
              flattenedDocs.push(d);
          }
      });

      flattenedDocs.forEach((doc: unknown, index: number) => {
        // Normalize 'actions' to 'do' alias
        if (doc && typeof doc === 'object' && doc !== null && 'actions' in doc && !(doc as Record<string, unknown>).do) {
            (doc as Record<string, unknown>).do = (doc as Record<string, unknown>).actions;
        }

        const validation = TriggerValidator.validate(doc as Record<string, unknown>);
        
        if (validation.valid) {
          const rule = validation.rule;
           // Assign ID from filename if missing, with index suffix if multidoc
          if (!rule.id && typeof doc === 'object' && doc !== null) {
            const base = path.basename(filePath, path.extname(filePath));
            rule.id = flattenedDocs.length > 1 ? `${base}-${index}` : base;
          }
          rules.push(rule);
        } else {
             // LOG ERROR TO STDERR so it shows up in tests
             console.error(`\n[TriggerLoader] ⚠️ Validation Problem in ${filePath} (item #${index + 1})`);
             validation.issues.forEach(issue => {
                 console.error(`  - [${issue.path}] ${issue.message}`);
                 if (issue.suggestion) {
                     console.error(`    💡 Suggestion: ${issue.suggestion}`);
                 }
             });
        }
      });

      return rules;
    } catch (error) {
      console.error(`Error parsing YAML file ${filePath}:`, error);
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
