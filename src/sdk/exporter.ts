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
   * Converts a rule or array of rules to a JSON string.
   */
  static toJson(rules: TriggerRule | TriggerRule[], pretty = true): string {
    const data = Array.isArray(rules) ? rules : [rules];
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }

  /**
   * Convert a single rule to a clean object (remove undefined/null)
   */
  static cleanRule(rule: TriggerRule): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    
    // Core Identification
    cleaned.id = rule.id;
    if (rule.name) cleaned.name = rule.name;
    if (rule.description) cleaned.description = rule.description;
    
    // Trigger Condition
    cleaned.on = rule.on;
    
    // Logic & Metadata
    if (rule.priority !== undefined && rule.priority !== 0) cleaned.priority = rule.priority;
    if (rule.enabled !== undefined && rule.enabled !== true) cleaned.enabled = rule.enabled;
    if (rule.cooldown !== undefined && rule.cooldown !== 0) cleaned.cooldown = rule.cooldown;
    if (rule.tags && rule.tags.length > 0) cleaned.tags = rule.tags;
    
    // The conditional part
    if (rule.if) cleaned.if = rule.if;
    
    // The action part (always last)
    cleaned.do = rule.do;
    
    // The else clause (if present)
    if (rule.else) cleaned.else = rule.else;
    
    return cleaned;
  }

  /**
   * Convert rules to clean YAML (without undefined/null values)
   */
  static toCleanYaml(rules: TriggerRule | TriggerRule[]): string {
    const data = Array.isArray(rules) ? rules : [rules];
    const cleaned = data.map(rule => this.cleanRule(rule));
    return YAML.stringify(cleaned, {
      indent: 2,
      lineWidth: 0
    });
  }

  /**
   * Convert rules to clean JSON (without undefined/null values)
   */
  static toCleanJson(rules: TriggerRule | TriggerRule[], pretty = true): string {
    const data = Array.isArray(rules) ? rules : [rules];
    const cleaned = data.map(rule => this.cleanRule(rule));
    return JSON.stringify(cleaned, null, pretty ? 2 : 0);
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
