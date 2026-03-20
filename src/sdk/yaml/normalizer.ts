/**
 * YAML Rule Normalizer
 * 
 * This module normalizes raw YAML objects to proper TriggerRule structures.
 * It handles aliases, defaults, and type conversions.
 */

import type { 
  TriggerRule, 
  RuleCondition, 
  Action, 
  ActionGroup, 
  ComparisonOperator,
  ExecutionMode,
  InlineConditionalAction,
  ConditionValue,
  ActionParams 
} from '../../types';
import { 
  isObject, 
  isNonEmptyString, 
  isValidNumber, 
  isBoolean,
  isValidExecutionMode,
  isConditionGroup,
  isActionGroup
} from './utils';

// ============================================================================
// Normalize Rule
// ============================================================================

/**
 * Normalize a raw YAML object to a proper TriggerRule structure
 * This handles aliases, defaults, and type conversions
 */
export function normalizeRule(
  raw: unknown, 
  index: number, 
  filename?: string,
  autoId?: boolean | string
): Record<string, unknown> {
  if (!isObject(raw)) {
    throw new Error(`Rule at index ${index} is not an object`);
  }
  
  const rule: Record<string, unknown> = { ...raw };
  
  // Normalize 'actions' -> 'do' alias
  if ('actions' in rule && !('do' in rule)) {
    rule.do = rule.actions;
    delete rule.actions;
  }
  
  // Ensure required fields have defaults
  if (!('enabled' in rule)) {
    rule.enabled = true;
  }
  
  if (!('priority' in rule)) {
    rule.priority = 0;
  }
  
  // Auto-generate ID if requested
  if (!rule.id) {
    if (autoId === true && filename) {
      const base = filename.replace(/\.(ya?ml)$/i, '');
      rule.id = base;
    } else if (typeof autoId === 'string') {
      rule.id = `${autoId}-${index}`;
    }
  }
  
  // Normalize 'if' field
  if ('if' in rule && rule.if !== undefined) {
    rule.if = normalizeConditions(rule.if);
  }
  
  // Normalize 'do' field
  if ('do' in rule && rule.do !== undefined) {
    rule.do = normalizeDoField(rule.do);
  }
  
  // Normalize 'else' field
  if ('else' in rule && rule.else !== undefined) {
    rule.else = normalizeElseField(rule.else);
  }
  
  return rule;
}

// ============================================================================
// Normalize Conditions
// ============================================================================

/**
 * Normalize conditions from raw YAML to RuleCondition
 */
export function normalizeConditions(
  raw: unknown
): RuleCondition | RuleCondition[] {
  if (!raw) return [];
  
  // Single condition object
  if (isObject(raw)) {
    return normalizeSingleCondition(raw);
  }
  
  // Array of conditions
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (isObject(item)) {
        return normalizeSingleCondition(item);
      }
      throw new Error(`Invalid condition at index ${idx}: expected object`);
    });
  }
  
  throw new Error('Invalid condition format: expected object or array');
}

/**
 * Normalize a single condition
 */
function normalizeSingleCondition(raw: Record<string, unknown>): RuleCondition {
  // Check if it's a condition group (has operator and conditions)
  const hasOperator = 'operator' in raw && (raw.operator === 'AND' || raw.operator === 'OR');
  const hasConditions = 'conditions' in raw && Array.isArray(raw.conditions);
  
  if (hasOperator && hasConditions) {
    // This is a condition group
    const operator = raw.operator as 'AND' | 'OR';
    const conditions = normalizeConditions(raw.conditions!);
    
    return {
      operator,
      conditions: Array.isArray(conditions) ? conditions : [conditions]
    };
  }
  
  // Simple condition
  const field = raw.field as string | undefined;
  const op = raw.operator as string | undefined;
  const value = raw.value as ConditionValue | undefined;
  
  return {
    field: field || 'data',
    operator: (op as ComparisonOperator) || 'EQ',
    value
  };
}

// ============================================================================
// Normalize Do Field
// ============================================================================

/**
 * Normalize the 'do' field of a rule
 */
export function normalizeDoField(
  raw: unknown
): Action | Action[] | ActionGroup | (Action | ActionGroup)[] | InlineConditionalAction {
  if (!raw) return [];
  
  // ActionGroup object (has mode and actions)
  if (isObject(raw) && 'mode' in raw && 'actions' in raw) {
    return normalizeActionGroup(raw);
  }
  
  // Single action object
  if (isObject(raw)) {
    return normalizeAction(raw);
  }
  
  // Array of actions
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (isObject(item)) {
        // Check if it's an action group
        if ('mode' in item && 'actions' in item) {
          return normalizeActionGroup(item);
        }
        return normalizeAction(item);
      }
      throw new Error(`Invalid action at index ${idx}: expected object`);
    });
  }
  
  throw new Error('Invalid do field format: expected object or array');
}

// ============================================================================
// Normalize Else Field
// ============================================================================

/**
 * Normalize the 'else' field of a rule
 */
export function normalizeElseField(
  raw: unknown
): Action | Action[] | ActionGroup | (Action | ActionGroup)[] {
  if (!raw) return [];
  
  // ActionGroup object (has mode and actions)
  if (isObject(raw) && 'mode' in raw && 'actions' in raw) {
    return normalizeActionGroup(raw);
  }
  
  // Single action object
  if (isObject(raw)) {
    return normalizeAction(raw);
  }
  
  // Array of actions
  if (Array.isArray(raw)) {
    return raw.map((item, idx) => {
      if (isObject(item)) {
        // Check if it's an action group
        if ('mode' in item && 'actions' in item) {
          return normalizeActionGroup(item);
        }
        return normalizeAction(item);
      }
      throw new Error(`Invalid action at index ${idx}: expected object`);
    });
  }
  
  throw new Error('Invalid else field format: expected object or array');
}

// ============================================================================
// Normalize Action
// ============================================================================

/**
 * Normalize a single action (including conditional actions)
 */
export function normalizeAction(raw: Record<string, unknown>): Action | InlineConditionalAction {
  const action: Record<string, unknown> = { ...raw };
  
  // Handle aliases: 'do' -> 'then'
  if ('do' in action && !('then' in action)) {
    action.then = action.do;
    delete action.do;
  }
  
  // Normalize conditional actions
  if ('if' in action && action.if !== undefined) {
    // This is an inline conditional action
    const conditional: InlineConditionalAction = {
      if: normalizeConditions(action.if),
    };
    
    // Normalize 'then' branch
    if ('then' in action && action.then !== undefined) {
      conditional.then = normalizeActionBranch(action.then);
    }
    
    // Normalize 'else' branch  
    if ('else' in action && action.else !== undefined) {
      conditional.else = normalizeActionBranch(action.else);
    }
    
    // Copy other fields
    if ('break' in action) conditional.break = action.break as boolean;
    if ('continue' in action) conditional.continue = action.continue as boolean;
    
    return conditional;
  }
  
  // Regular action - copy fields as-is
  const result: Action = {
    type: action.type as string | undefined,
    params: action.params as ActionParams | undefined,
    run: action.run as string | undefined,
    delay: action.delay as number | undefined,
    probability: action.probability as number | undefined,
    name: action.name as string | undefined,
  };
  
  // Copy any other known action fields
  if ('break' in action) result.break = action.break as boolean;
  if ('continue' in action) result.continue = action.continue as boolean;
  
  return result;
}

/**
 * Normalize an action branch (then/else) which can be single action, array, or group
 * @returns The normalized action, or array of actions, or action group
 */
function normalizeActionBranch(raw: unknown): Action | Action[] | ActionGroup {
  if (!raw) return [];
  
  // ActionGroup
  if (isObject(raw) && 'mode' in raw && 'actions' in raw) {
    return normalizeActionGroup(raw);
  }
  
  // Single action (including inline conditional)
  if (isObject(raw)) {
    return normalizeAction(raw) as Action;
  }
  
  // Array of actions
  if (Array.isArray(raw)) {
    const result: Action[] = [];
    for (let idx = 0; idx < raw.length; idx++) {
      const item = raw[idx];
      if (isObject(item)) {
        if ('mode' in item && 'actions' in item) {
          // Spread the actions from nested group
          const nested = normalizeActionGroup(item);
          for (const a of nested.actions) {
            result.push(a as Action);
          }
        } else {
          result.push(normalizeAction(item) as Action);
        }
      } else {
        throw new Error(`Invalid action in branch at index ${idx}: expected object`);
      }
    }
    return result;
  }
  
  throw new Error('Invalid action branch format: expected object or array');
}

// ============================================================================
// Normalize Action Group
// ============================================================================

/**
 * Normalize an action group
 */
function normalizeActionGroup(raw: Record<string, unknown>): ActionGroup {
  const mode = (raw.mode as ExecutionMode) || 'ALL';
  
  if (!isValidExecutionMode(mode)) {
    throw new Error(`Invalid execution mode: ${mode}`);
  }
  
  const actionsRaw = raw.actions;
  if (!actionsRaw || !Array.isArray(actionsRaw)) {
    throw new Error('Action group must have an actions array');
  }
  
  const actions = actionsRaw.map((item, idx) => {
    if (isObject(item)) {
      // Check for nested action group
      if ('mode' in item && 'actions' in item) {
        return normalizeActionGroup(item);
      }
      return normalizeAction(item);
    }
    throw new Error(`Invalid action in group at index ${idx}: expected object`);
  });
  
  return {
    mode,
    actions
  };
}

// ============================================================================
// Advanced Normalization - Support for Complex YAML Structures
// ============================================================================

/**
 * Normalize a complete rule with all advanced features:
 * - Nested conditions
 * - Inline conditionals in actions
 * - Sub-do/sub-else blocks
 * - DO nodes
 */
export function normalizeRuleAdvanced(
  raw: unknown,
  index: number,
  filename?: string,
  autoId?: boolean | string
): TriggerRule {
  const normalized = normalizeRule(raw, index, filename, autoId);
  
  // Additional validation and transformations for advanced features
  
  // Ensure 'on' field exists
  if (!normalized.on) {
    throw new Error(`Rule at index ${index} missing required field: on`);
  }
  
  // Return as TriggerRule (type assertion for now)
  return normalized as unknown as TriggerRule;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a normalized rule has required fields
 */
export function validateRule(rule: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!rule.on) {
    errors.push('Missing required field: on');
  }
  
  if (!rule.do && rule.do !== '') {
    errors.push('Missing required field: do');
  }
  
  // Validate else is only present with if
  if (rule.else && !rule.if) {
    errors.push('Field "else" requires "if" to be present');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
