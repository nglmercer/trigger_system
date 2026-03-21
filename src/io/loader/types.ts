/**
 * TriggerLoader Types
 *
 * Type definitions for the TriggerLoader module.
 */

import type { TriggerRule } from "../../types";

/**
 * Registry entry containing a rule and its metadata
 * Supports multiple rules per file
 */
export interface RegistryEntry {
  rule: TriggerRule;
  filePath?: string;
  loadedAt: number;
  modified: boolean;
  /** Index of this rule within the file (for multi-rule files) */
  ruleIndex?: number;
}

/**
 * File entry containing all rules from a single file
 */
export interface FileEntry {
  filePath: string;
  rules: TriggerRule[];
  loadedAt: number;
  modified: boolean;
}

/**
 * Loader configuration options
 */
export interface LoaderOptions {
  defaultDir?: string;
  autoRegister?: boolean;
  watchChanges?: boolean;
}

/**
 * Rule file info
 */
export interface RuleFileInfo {
  ruleId: string;
  filePath: string;
  exists: boolean;
}
