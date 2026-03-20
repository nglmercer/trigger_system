/**
 * YAML Parser Module
 * 
 * This is the main entry point for the modularized YAML parser.
 * It provides:
 * - Type definitions (types.ts)
 * - Utility functions (utils.ts)
 * - Rule normalization (normalizer.ts)
 * - Node/edge conversion (converter.ts)
 * 
 * Re-exports from the main yaml-parser.ts for backward compatibility.
 */

import { parseAllDocuments, parse as parseYaml } from 'yaml';
import type { TriggerRule, RuleCondition, Action, ActionGroup, ComparisonOperator, ExecutionMode } from '../../types';
import { TriggerValidator } from '../../domain/validator';

// Import types locally for use
import type { YamlParserOptions, YamlParserResult, YamlParserError } from './types';

// Import normalizer functions locally
import { normalizeRule } from './normalizer';

// Re-export types
export type { 
  YamlParserOptions, 
  YamlParserResult, 
  YamlParserError,
  EditorNodeType,
  EditorNode,
  EditorEdge,
  TriggerRuleToNodesResult,
  RawCondition,
  RawAction,
  RawRule
} from './types';

export type { ComparisonOperator, ExecutionMode } from '../../types';

// Re-export utilities
export { 
  isObject, 
  isNonEmptyString, 
  isValidNumber, 
  isBoolean,
  isConditionGroup,
  isSimpleCondition,
  isActionGroup,
  hasConditionalExecution,
  isSimpleAction,
  isValidExecutionMode,
  isValidConditionOperator,
  isValidComparisonOperator,
  getActionType,
  getActionParams,
  getConditionField,
  getConditionOperator,
  getConditionValue,
  createNodeIdGenerator,
  createEdgeIdGenerator,
  createPositionCalculator,
  ensureArray,
  normalizeActions,
  normalizeConditions as normalizeConditionsUtils,
  generateRuleIdFromFilename,
  normalizeOperator,
  requireField,
  validateFieldType,
  validateFieldValue
} from './utils';

// Re-export normalizer
export { 
  normalizeRule, 
  normalizeConditions,
  normalizeDoField,
  normalizeElseField,
  normalizeAction,
  normalizeRuleAdvanced,
  validateRule
} from './normalizer';

// Re-export converter
export { 
  triggerRuleToNodes,
  buildEventNode,
  buildConditionGroupNode,
  buildConditionNode,
  buildDoNode,
  buildActionNode,
  buildActionGroupNode,
  buildEdge
} from './converter';

// ============================================================================
// Main Parser (copied from yaml-parser.ts for backward compatibility)
// ============================================================================

/**
 * Parse a YAML string into TriggerRule objects
 */
export function parseYamlRules(
  yamlContent: string,
  options: {
    autoId?: boolean | string;
    filename?: string;
    throwOnError?: boolean;
    multiDocument?: boolean;
  } = {}
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
          normalized = normalizeRule(doc, index, filename, autoId);
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
