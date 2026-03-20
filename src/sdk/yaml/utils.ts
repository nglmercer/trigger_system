/**
 * YAML Parser Utilities
 * 
 * Utility functions for the YAML parser including type guards,
 * helpers, and normalization functions.
 */

import type { 
  RuleCondition, 
  Action, 
  ActionGroup, 
  ComparisonOperator, 
  ExecutionMode,
  InlineConditionalAction,
  ConditionValue 
} from '../../types';
import { 
  EQUALITY_OPERATORS, 
  COMPARISON_OPERATORS, 
  LIST_OPERATORS, 
  STRING_OPERATORS, 
  NULL_OPERATORS,
  ALL_OPERATORS,
  CONDITION_GROUP_OPERATORS,
  EXECUTION_MODES
} from '../../types';

// Re-export type guards from types
export type { ComparisonOperator, ExecutionMode } from '../../types';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a plain object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if a condition is a condition group (has operator and nested conditions)
 */
export function isConditionGroup(cond: RuleCondition): cond is { operator: 'AND' | 'OR'; conditions: RuleCondition[] } {
  return 'operator' in cond && 'conditions' in cond && 
    (cond.operator === 'AND' || cond.operator === 'OR');
}

/**
 * Check if a condition is a simple condition (has field and operator)
 */
export function isSimpleCondition(cond: RuleCondition): cond is { field: string; operator: ComparisonOperator; value?: ConditionValue } {
  return 'field' in cond && 'operator' in cond;
}

/**
 * Check if an action is an action group (has mode and nested actions)
 */
export function isActionGroup(action: unknown): action is ActionGroup {
  return typeof action === 'object' && action !== null && 
    'mode' in action && 'actions' in action && 
    Array.isArray((action as ActionGroup).actions);
}

/**
 * Check if an action object has conditional execution (if/then/else)
 */
export function hasConditionalExecution(action: unknown): action is InlineConditionalAction {
  return typeof action === 'object' && action !== null && 'if' in action;
}

/**
 * Check if an action is a simple action (has type)
 */
export function isSimpleAction(action: unknown): action is Action {
  return typeof action === 'object' && action !== null && 'type' in action;
}

/**
 * Check if value is a valid execution mode
 */
export function isValidExecutionMode(value: unknown): value is ExecutionMode {
  return typeof value === 'string' && EXECUTION_MODES.includes(value as ExecutionMode);
}

/**
 * Check if value is a valid condition group operator
 */
export function isValidConditionOperator(value: unknown): value is 'AND' | 'OR' {
  return typeof value === 'string' && CONDITION_GROUP_OPERATORS.includes(value as 'AND' | 'OR');
}

/**
 * Check if value is a valid comparison operator
 */
export function isValidComparisonOperator(value: unknown): value is ComparisonOperator {
  return typeof value === 'string' && arrayIncludes(ALL_OPERATORS, value);
}

// ============================================================================
// Safe Extractors
// ============================================================================

/**
 * Safely extract action type
 */
export function getActionType(action: Action): string {
  return action.type || 'log';
}

/**
 * Safely extract and stringify action params
 */
export function getActionParams(action: Action): string {
  if (!action.params) return '{}';
  return typeof action.params === 'string' ? action.params : JSON.stringify(action.params);
}

/**
 * Safely extract condition field
 */
export function getConditionField(cond: RuleCondition): string {
  if (isSimpleCondition(cond)) {
    return cond.field || 'data';
  }
  return 'data';
}

/**
 * Safely extract condition operator
 */
export function getConditionOperator(cond: RuleCondition): string {
  if (isSimpleCondition(cond)) {
    return cond.operator || 'EQ';
  }
  if (isConditionGroup(cond)) {
    return cond.operator === 'OR' ? 'OR' : 'AND';
  }
  return 'EQ';
}

/**
 * Safely extract condition value
 */
export function getConditionValue(cond: RuleCondition): unknown {
  if (isSimpleCondition(cond)) {
    return cond.value;
  }
  return undefined;
}

// ============================================================================
// ID Generators
// ============================================================================

/**
 * Creates a sequential node ID generator
 */
export function createNodeIdGenerator(start: number = 0): () => string {
  let counter = start;
  return () => `node_${counter++}`;
}

/**
 * Creates an edge ID generator
 */
export function createEdgeIdGenerator(): () => string {
  let counter = 0;
  return () => `edge_${Date.now()}_${counter++}`;
}

// ============================================================================
// Position Calculator
// ============================================================================

/**
 * Creates a position calculator for node layout
 */
export function createPositionCalculator(
  baseX: number = 100,
  baseY: number = 100,
  levelSpacing: number = 300,
  nodeSpacing: number = 150
) {
  return (level: number, index: number, total: number): { x: number; y: number } => ({
    x: baseX + level * levelSpacing,
    y: baseY + index * nodeSpacing - (total * nodeSpacing) / 2,
  });
}

// ============================================================================
// Array Helpers
// ============================================================================

/**
 * Ensure a value is an array
 */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Normalize action to array format
 */
export function normalizeActions(action: Action | Action[] | undefined): Action[] {
  if (!action) return [];
  if (Array.isArray(action)) return action;
  return [action];
}

/**
 * Normalize condition to array format
 */
export function normalizeConditions(condition: RuleCondition | RuleCondition[] | undefined): RuleCondition[] {
  if (!condition) return [];
  if (Array.isArray(condition)) return condition;
  return [condition];
}

// ============================================================================
// String Helpers
// ============================================================================

/**
 * Generate a rule ID from filename
 */
export function generateRuleIdFromFilename(filename: string): string {
  return filename.replace(/\.(ya?ml)$/i, '');
}

/**
 * Normalize operator to canonical form
 */
export function normalizeOperator(operator: string): ComparisonOperator {
  const operatorMap: Record<string, ComparisonOperator> = {
    '==': 'EQ',
    '!=': 'NEQ',
    '>': 'GT',
    '>=': 'GTE',
    '<': 'LT',
    '<=': 'LTE',
  };
  return operatorMap[operator] as ComparisonOperator || operator as ComparisonOperator;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a required field is present
 */
export function requireField(obj: Record<string, unknown>, field: string): void {
  if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
    throw new Error(`Missing required field: ${field}`);
  }
}

/**
 * Type-safe array includes check
 */
function arrayIncludes<T extends string>(arr: readonly T[], value: unknown): value is T {
  return arr.includes(value as T);
}

/**
 * Validate field type
 */
export function validateFieldType(value: unknown, expectedType: string, fieldName: string): void {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(`Field "${fieldName}" expected type "${expectedType}", got "${actualType}"`);
  }
}

/**
 * Validate field is one of allowed values
 */
export function validateFieldValue<T extends string>(
  value: unknown, 
  allowedValues: readonly T[], 
  fieldName: string
): asserts value is T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new Error(`Field "${fieldName}" must be one of: ${allowedValues.join(', ')}`);
  }
}
