import type { TriggerRule } from "../types";
import { RuleBuilder } from "./builder";
import YAML from "yaml";

export class RuleExporter {
  /**
   * Converts a rule or array of rules to a YAML string.
   */
  static toYaml(rules: TriggerRule | TriggerRule[]): string {
    const data = Array.isArray(rules) ? rules : [rules];
    return YAML.stringify(data);
  }


  /**
   * For Node.js only: Saves a rule or array of rules to a file.
   * This is part of the 'Server SDK' functionality.
   */
  static async saveToFile(rules: TriggerRule | TriggerRule[], filePath: string): Promise<void> {
    const yamlContent = this.toYaml(rules);
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
       const fs = await import("fs/promises");
       const path = await import("path");
       const dir = path.dirname(filePath);
       await fs.mkdir(dir, { recursive: true });
       await fs.writeFile(filePath, yamlContent, "utf8");
    } else {
      throw new Error("saveToFile is only supported in Node.js/Bun environments");
    }
  }
}
