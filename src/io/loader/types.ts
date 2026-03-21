/**
 * TriggerLoader Types
 * 
 * Type definitions for the TriggerLoader module.
 */

import type { TriggerRule } from "../../types";

/**
 * Registry entry containing a rule and its metadata
 */
export interface RegistryEntry {
  rule: TriggerRule;
  filePath?: string;
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
