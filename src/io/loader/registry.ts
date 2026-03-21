/**
 * TriggerLoader Registry
 *
 * In-memory registry for managing rules.
 * Supports multiple rules per file.
 */

import type { TriggerRule } from "../../types";
import type { RegistryEntry, FileEntry } from "./types";

/**
 * Registry class for managing rules in memory
 * Supports grouping rules by file
 */
export class RuleRegistry {
  private registry: Map<string, RegistryEntry> = new Map();
  private fileRegistry: Map<string, FileEntry> = new Map();
  private defaultDir: string = './rules';

  /**
   * Clear the registry
   */
  clear(): void {
    this.registry.clear();
    this.fileRegistry.clear();
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
  register(rule: TriggerRule, filePath?: string, ruleIndex?: number): void {
    if (!rule.id) {
      throw new Error('[RuleRegistry] Cannot register rule without ID');
    }
    
    const entry: RegistryEntry = {
      rule: { ...rule },
      filePath,
      loadedAt: Date.now(),
      modified: false,
      ruleIndex
    };
    
    this.registry.set(rule.id, entry);
    
    // Update file registry if filePath is provided
    if (filePath) {
      const fileEntry = this.fileRegistry.get(filePath);
      if (fileEntry) {
        // Add rule to existing file entry
        const existingIndex = fileEntry.rules.findIndex(r => r.id === rule.id);
        if (existingIndex >= 0) {
          fileEntry.rules[existingIndex] = { ...rule };
        } else {
          fileEntry.rules.push({ ...rule });
        }
        fileEntry.loadedAt = Date.now();
      } else {
        // Create new file entry
        this.fileRegistry.set(filePath, {
          filePath,
          rules: [{ ...rule }],
          loadedAt: Date.now(),
          modified: false
        });
      }
    }
  }

  /**
   * Register multiple rules
   * Groups rules by file when they share the same filePath
   * @param rules - Array of rules to register
   * @param sourceFilePath - Optional: The actual file path where these rules came from
   *                        If provided, all rules will be grouped under this file path
   */
  registerAll(rules: TriggerRule[], sourceFilePath?: string): void {
    if (rules.length === 0) return;
    
    // If sourceFilePath is provided, group all rules under that file
    if (sourceFilePath) {
      // Create or update file entry with all rules
      const existingFileEntry = this.fileRegistry.get(sourceFilePath);
      if (existingFileEntry) {
        // Merge with existing rules in the file
        for (const rule of rules) {
          const existingIndex = existingFileEntry.rules.findIndex(r => r.id === rule.id);
          if (existingIndex >= 0) {
            existingFileEntry.rules[existingIndex] = { ...rule };
          } else {
            existingFileEntry.rules.push({ ...rule });
          }
        }
        existingFileEntry.loadedAt = Date.now();
      } else {
        // Create new file entry
        this.fileRegistry.set(sourceFilePath, {
          filePath: sourceFilePath,
          rules: rules.map(r => ({ ...r })),
          loadedAt: Date.now(),
          modified: false
        });
      }
      
      // Register each rule with its index in the file
      const fileEntry = this.fileRegistry.get(sourceFilePath)!;
      fileEntry.rules.forEach((rule, index) => {
        if (rule.id) {
          this.register(rule, sourceFilePath, index);
        }
      });
    } else {
      // No source file path - register each rule individually
      // This is for rules created programmatically without a source file
      for (const rule of rules) {
        if (rule.id) {
          this.register(rule);
        }
      }
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
   * Get file entry by file path
   */
  getFileEntry(filePath: string): FileEntry | undefined {
    return this.fileRegistry.get(filePath);
  }

  /**
   * Get all rules from a specific file
   */
  getRulesByFile(filePath: string): TriggerRule[] {
    const fileEntry = this.fileRegistry.get(filePath);
    return fileEntry ? fileEntry.rules : [];
  }

  /**
   * Get all file entries
   */
  getAllFileEntries(): FileEntry[] {
    return Array.from(this.fileRegistry.values());
  }

  /**
   * Get file path for a rule
   */
  getFilePath(ruleId: string): string | undefined {
    return this.registry.get(ruleId)?.filePath;
  }

  /**
   * Check if a file has multiple rules
   */
  isMultiRuleFile(filePath: string): boolean {
    const fileEntry = this.fileRegistry.get(filePath);
    return fileEntry ? fileEntry.rules.length > 1 : false;
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
      const targetPath = filePath || entry.filePath;
      this.registry.set(ruleId, {
        ...entry,
        filePath: targetPath,
        modified: false
      });
      
      // Update file registry
      if (targetPath) {
        const fileEntry = this.fileRegistry.get(targetPath);
        if (fileEntry) {
          fileEntry.modified = false;
        }
      }
    }
  }

  /**
   * Mark all rules in a file as saved
   */
  markFileAsSaved(filePath: string): void {
    const fileEntry = this.fileRegistry.get(filePath);
    if (fileEntry) {
      fileEntry.modified = false;
      fileEntry.rules.forEach(rule => {
        if (rule.id) {
          const entry = this.registry.get(rule.id);
          if (entry) {
            this.registry.set(rule.id, { ...entry, modified: false });
          }
        }
      });
    }
  }

  /**
   * Mark a file as modified
   */
  markFileAsModified(filePath: string): void {
    const fileEntry = this.fileRegistry.get(filePath);
    if (fileEntry) {
      fileEntry.modified = true;
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

  /**
   * Get file registry entries iterator
   */
  fileEntries(): IterableIterator<FileEntry> {
    return this.fileRegistry.values();
  }

  /**
   * Get file registry size
   */
  fileCount(): number {
    return this.fileRegistry.size;
  }
}
