/**
 * Trigger Editor Builder
 * Re-exports and utilities for building trigger rules using the core builder
 */

// Import builders from the local SDK source (relative path for monorepo)
import { RuleBuilder, ConditionBuilder, ActionBuilder } from '../../src/sdk/builder';

// Re-export for convenience
export { RuleBuilder, ConditionBuilder, ActionBuilder };

// Import types for type-safe usage
import type {
  TriggerRule,
  RuleCondition,
  Condition,
  ConditionGroup,
  Action,
  ActionGroup,
  ComparisonOperator,
  ExecutionMode,
  ConditionValue,
  ActionParams
} from './types.js';

export type {
  TriggerRule,
  RuleCondition,
  Condition,
  ConditionGroup,
  Action,
  ActionGroup,
  ComparisonOperator,
  ExecutionMode,
  ConditionValue,
  ActionParams
};

/**
 * Create a new RuleBuilder instance
 */
export function createRuleBuilder(): RuleBuilder {
  return new RuleBuilder();
}

/**
 * Create a new ConditionBuilder instance
 */
export function createConditionBuilder(operator: 'AND' | 'OR' = 'AND'): ConditionBuilder {
  return new ConditionBuilder(operator);
}

/**
 * Create a new ActionBuilder instance
 */
export function createActionBuilder(): ActionBuilder {
  return new ActionBuilder();
}

/**
 * Helper to create a condition
 */
export function createCondition(
  field: string,
  operator: ComparisonOperator,
  value?: ConditionValue
): Condition {
  return { field, operator, value };
}

/**
 * Helper to create a condition group
 */
export function createConditionGroup(
  operator: 'AND' | 'OR',
  conditions: (Condition | ConditionGroup)[]
): ConditionGroup {
  return { operator, conditions };
}

/**
 * Helper to create an action
 */
export function createAction(
  type: string,
  params?: ActionParams,
  options?: { delay?: number; probability?: number; name?: string }
): Action {
  return { type, params, ...options };
}

/**
 * Helper to create an action group
 */
export function createActionGroup(
  mode: ExecutionMode,
  actions: Action[]
): ActionGroup {
  return { mode, actions };
}
