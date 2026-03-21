/**
 * TriggerLoader Registry
 * 
 * In-memory registry for managing rules.
 */

import type { TriggerRule } from "../../types";
import type { RegistryEntry } from "./types";

/**
 * Registry class for managing rules in memory
 */
export class RuleRegistry {
  private registry: Map<string, RegistryEntry> = new Map();
  private defaultDir: string = './rules';

  /**
   * Clear the registry
   */
  clear(): void {
    this.registry.clear();
    console.log('[RuleRegistry] Cleared');
  }

  /**
   * Set default directory
   */
  setDefaultDir(dirPath: string): void {
    this.defaultDir = dirPath;
  }

  /**
   * Get default directory
   */
  getDefaultDir(): string {
    return this.defaultDir;
  }

  /**
   * Register a rule
   */
  register(rule: TriggerRule, filePath?: string): void {
    if (!rule.id) {
      throw new Error('[RuleRegistry] Cannot register rule without ID');
    }
    
    this.registry.set(rule.id, {
      rule: { ...rule },
      filePath,
      loadedAt: Date.now(),
      modified: false
    });
  }

  /**
   * Register multiple rules
   */
  registerAll(rules: TriggerRule[], baseDir?: string): void {
    for (const rule of rules) {
      let filePath: string | undefined;
      if (baseDir && rule.id) {
        filePath = `${baseDir}/${rule.id}.yaml`;
      }
      this.register(rule, filePath);
    }
  }

  /**
   * Get a rule by ID
   */
  get(ruleId: string): TriggerRule | undefined {
    return this.registry.get(ruleId)?.rule;
  }

  /**
   * Get all rules
   */
  getAll(): TriggerRule[] {
    return Array.from(this.registry.values()).map(entry => entry.rule);
  }

  /**
   * Check if rule exists
   */
  has(ruleId: string): boolean {
    return this.registry.has(ruleId);
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.registry.size;
  }

  /**
   * Get registry entry
   */
  getEntry(ruleId: string): RegistryEntry | undefined {
    return this.registry.get(ruleId);
  }

  /**
   * Add a new rule
   */
  add(rule: TriggerRule, filePath?: string): TriggerRule {
    if (!rule.id) {
      rule.id = this.generateId();
    }
    
    if (this.has(rule.id)) {
      throw new Error(`[RuleRegistry] Rule "${rule.id}" already exists`);
    }
    
    const savePath = filePath || (rule.id ? `${this.defaultDir}/${rule.id}.yaml` : undefined);
    this.register(rule, savePath);
    
    return rule;
  }

  /**
   * Update a rule
   */
  update(ruleId: string, updates: Partial<TriggerRule>): TriggerRule {
    const entry = this.registry.get(ruleId);
    
    if (!entry) {
      throw new Error(`[RuleRegistry] Rule "${ruleId}" not found`);
    }
    
    const updatedRule = { ...entry.rule, ...updates };
    updatedRule.id = ruleId;
    
    this.registry.set(ruleId, {
      ...entry,
      rule: updatedRule,
      modified: true,
      loadedAt: Date.now()
    });
    
    return updatedRule;
  }

  /**
   * Remove a rule
   */
  remove(ruleId: string): boolean {
    return this.registry.delete(ruleId);
  }

  /**
   * Get modified rules
   */
  getModified(): TriggerRule[] {
    return Array.from(this.registry.values())
      .filter(entry => entry.modified)
      .map(entry => entry.rule);
  }

  /**
   * Check if has modified rules
   */
  hasModified(): boolean {
    return Array.from(this.registry.values()).some(entry => entry.modified);
  }

  /**
   * Mark as saved
   */
  markAsSaved(ruleId: string, filePath?: string): void {
    const entry = this.registry.get(ruleId);
    if (entry) {
      this.registry.set(ruleId, {
        ...entry,
        filePath: filePath || entry.filePath,
        modified: false
      });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get entries iterator
   */
  entries(): IterableIterator<[string, RegistryEntry]> {
    return this.registry.entries();
  }

  /**
   * Get values iterator
   */
  values(): IterableIterator<RegistryEntry> {
    return this.registry.values();
  }
}
