/**
 * YAML Parser for Trigger Rules
 * 
 * This module provides a reusable YAML parser that converts YAML content
 * into TriggerRule objects with proper validation.
 * 
 * It can be used by:
 * - The Node.js loader (src/io/loader.node.ts)
 * - The React Flow editor (trigger-editor)
 * - Any other component that needs to parse trigger rules from YAML
 * 
 * Architecture:
 * - yaml-parser.ts: Main entry point and public API
 * 
 * The parser:
 * 1. Parses YAML using the yaml library
 * 2. Normalizes the structure (handles aliases like 'actions' -> 'do')
 * 3. Validates using TriggerValidator
 * 4. Returns a valid TriggerRule or throws/returns errors
 */

import { parseAllDocuments, parse as parseYaml } from 'yaml';
import type { TriggerRule } from '../types';
import { TriggerValidator } from '../domain/validator';

export interface YamlParserOptions {
  /**
   * Assign an ID to rules that don't have one.
   * If false, rules without IDs will fail validation.
   * If string, that string will be used as a prefix.
   * If true, a default ID will be generated from the filename (requires filename option).
   */
  autoId?: boolean | string;
  
  /**
   * Filename to use for generating rule IDs and error messages.
   * Useful when parsing from a file.
   */
  filename?: string;
  
  /**
   * Whether to throw on validation errors or return them.
   * @default false (return errors)
   */
  throwOnError?: boolean;
  
  /**
   * Whether to support multi-document YAML.
   * @default true
   */
  multiDocument?: boolean;
}

export interface YamlParserResult {
  /**
   * The parsed and validated rules
   */
  rules: TriggerRule[];
  
  /**
   * Validation errors (empty if all rules are valid)
   */
  errors: YamlParserError[];
  
  /**
   * Whether all rules are valid
   */
  valid: boolean;
}

export interface YamlParserError {
  /**
   * Index of the rule in the document (0-based)
   */
  index: number;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Path to the problematic field
   */
  path?: string;
  
  /**
   * Validation issues from TriggerValidator
   */
  issues?: Array<{
    path: string;
    message: string;
    suggestion?: string;
  }>;
}

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Check if a value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a raw YAML object to a proper TriggerRule structure
 * This handles aliases, defaults, and type conversions
 */
function normalizeRule(raw: unknown, index: number, filename?: string): Record<string, unknown> {
  if (!isObject(raw)) {
    throw new Error(`Rule at index ${index} is not an object`);
  }
  
  const rule: Record<string, unknown> = { ...raw };
  
  // Normalize 'actions' -> 'do' alias
  if ('actions' in rule && !('do' in rule)) {
    rule.do = rule.actions;
    delete rule.actions;
  }
  
  // Normalize 'else' at rule level (already handled by types, but ensure consistency)
  // If there's no 'if', there shouldn't be a 'else' at rule level
  
  // Ensure required fields have defaults
  if (!('enabled' in rule)) {
    rule.enabled = true;
  }
  
  if (!('priority' in rule)) {
    rule.priority = 0;
  }
  
  // Auto-generate ID if requested
  if (!rule.id) {
    if (filename) {
      const base = filename.replace(/\.(ya?ml)$/i, '');
      rule.id = base;
    }
  }
  
  return rule;
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse a YAML string into TriggerRule objects
 * 
 * @param yamlContent - The YAML content to parse
 * @param options - Parser options
 * @returns YamlParserResult with parsed rules and any errors
 * 
 * @example
 * // Basic usage
 * const result = parseYamlRules(`
 * - id: my-rule
 *   on: chat.message
 *   do:
 *     - type: log
 *       params: { message: "Hello" }
 * `);
 * 
 * @example
 * // With options
 * const result = parseYamlRules(yamlContent, {
 *   filename: 'rules.yaml',
 *   autoId: true,
 *   throwOnError: false
 * });
 */
export function parseYamlRules(
  yamlContent: string,
  options: YamlParserOptions = {}
): YamlParserResult {
  const {
    autoId = false,
    filename,
    throwOnError = false,
    multiDocument = true,
  } = options;
  
  const errors: YamlParserError[] = [];
  const rules: TriggerRule[] = [];
  
  try {
    // Parse YAML
    let docs: unknown[];
    
    if (multiDocument) {
      const yamlDocs = parseAllDocuments(yamlContent);
      
      // Check for YAML parsing errors
      for (const doc of yamlDocs) {
        if (doc.errors && doc.errors.length > 0) {
          const errorMessages = doc.errors.map(e => e.message).join(', ');
          throw new Error(`YAML syntax error: ${errorMessages}`);
        }
      }
      
      docs = yamlDocs.map(doc => doc.toJS());
    } else {
      const parsed = parseYaml(yamlContent);
      docs = Array.isArray(parsed) ? [parsed] : [parsed];
    }
    
    // Flatten docs if the root is an array (Single doc with list of rules)
    let flattenedDocs: unknown[] = [];
    docs.forEach(d => {
      if (Array.isArray(d)) {
        flattenedDocs.push(...d);
      } else {
        flattenedDocs.push(d);
      }
    });
    
    // Process each rule
    flattenedDocs.forEach((doc: unknown, index: number) => {
      try {
        // Normalize the rule structure
        let normalized: Record<string, unknown>;
        
        if (autoId && !filename) {
          // Auto-generate ID without filename
          normalized = { ...normalizeRule(doc, index), id: `rule-${index}` };
        } else {
          normalized = normalizeRule(doc, index, filename);
        }
        
        // Validate using TriggerValidator
        const validation = TriggerValidator.validate(normalized);
        
        if (validation.valid) {
          rules.push(validation.rule!);
        } else {
          errors.push({
            index,
            message: `Validation failed for rule at index ${index}`,
            issues: validation.issues.map(issue => ({
              path: issue.path,
              message: issue.message,
              suggestion: issue.suggestion,
            })),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : `Unknown error at index ${index}`;
        errors.push({
          index,
          message,
        });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    errors.push({
      index: -1,
      message: `Failed to parse YAML: ${message}`,
    });
  }
  
  const result: YamlParserResult = {
    rules,
    errors,
    valid: errors.length === 0 && rules.length > 0,
  };
  
  // Throw if requested and there are errors
  if (throwOnError && !result.valid) {
    const errorMessages = result.errors.map(e => {
      let msg = `Rule ${e.index}: ${e.message}`;
      if (e.issues) {
        msg += '\n  Issues:\n' + e.issues.map(i => `    - [${i.path}] ${i.message}`).join('\n');
      }
      return msg;
    }).join('\n');
    
    throw new Error(`YAML parsing failed:\n${errorMessages}`);
  }
  
  return result;
}

/**
 * Parse a single YAML document (not multi-document)
 * Shorthand for parseYamlRules with multiDocument: false
 */
export function parseYamlRule(
  yamlContent: string,
  options: Omit<YamlParserOptions, 'multiDocument'> = {}
): YamlParserResult {
  return parseYamlRules(yamlContent, { ...options, multiDocument: false });
}

/**
 * Parse YAML and return the first valid rule
 * Throws if there are errors or no rules
 */
export function parseYamlRuleStrict(
  yamlContent: string,
  options: Omit<YamlParserOptions, 'throwOnError'> = {}
): TriggerRule {
  const result = parseYamlRules(yamlContent, { ...options, throwOnError: true });
  
  if (result.rules.length === 0) {
    throw new Error('No valid rules found in YAML');
  }
  
  return result.rules[0]!;
}

// // ============================================================================
// this Functions not work in browser only node, is not necesary, only for example 
// // ============================================================================

// /**
//  * Load and parse rules from a file path
//  * This is a Node.js specific function
//  */
// export async function loadYamlRulesFromFile(
//   filePath: string,
//   options: Omit<YamlParserOptions, 'filename'> = {}
// ): Promise<YamlParserResult> {
//   const { readFile } = await import('fs/promises');
//   const content = await readFile(filePath, 'utf-8');
//   return parseYamlRules(content, { ...options, filename: filePath });
// }

// /**
//  * Load a single rule from a file
//  * Throws if there are errors or no rules
//  */
// export async function loadYamlRuleFromFile(
//   filePath: string,
//   options?: Omit<YamlParserOptions, 'filename' | 'throwOnError'>
// ): Promise<TriggerRule> {
//   const result = await loadYamlRulesFromFile(filePath, { ...options, throwOnError: true });
//   if (result.rules.length === 0) {
//     throw new Error(`No valid rules found in ${filePath}`);
//   }
//   return result.rules[0]!;
// }
