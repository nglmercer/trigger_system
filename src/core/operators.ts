/**
 * Operator Constants
 * Centralized definitions of all valid operators used in conditions
 */

// --- Equality Operators ---
export const EQUALITY_OPERATORS = ['EQ', '==', 'NEQ', '!='] as const;
export type EqualityOperator = typeof EQUALITY_OPERATORS[number];

// --- Comparison Operators ---
export const COMPARISON_OPERATORS = ['GT', '>', 'GTE', '>=', 'LT', '<', 'LTE', '<='] as const;
export type ComparisonOperator = typeof COMPARISON_OPERATORS[number];

// --- List/Collection Operators ---
export const LIST_OPERATORS = ['IN', 'NOT_IN', 'RANGE'] as const;
export type ListOperator = typeof LIST_OPERATORS[number];

// --- String Matching Operators ---
export const STRING_OPERATORS = ['CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH'] as const;
export type StringOperator = typeof STRING_OPERATORS[number];

// --- Null-checking Operators ---
export const NULL_OPERATORS = ['IS_NULL', 'IS_NONE'] as const;
export type NullOperator = typeof NULL_OPERATORS[number];

// --- Special Operators ---
export const SPECIAL_OPERATORS = ['IS_EMPTY', 'HAS_KEY', 'MATCHES', 'SINCE', 'AFTER', 'BEFORE', 'UNTIL'] as const;
export type SpecialOperator = typeof SPECIAL_OPERATORS[number];

// --- All Operators Combined ---
export const ALL_OPERATORS = [
  ...EQUALITY_OPERATORS,
  ...COMPARISON_OPERATORS,
  ...LIST_OPERATORS,
  ...STRING_OPERATORS,
  ...NULL_OPERATORS,
  ...SPECIAL_OPERATORS
] as const;

export type AnyOperator = typeof ALL_OPERATORS[number];

// --- Condition Group Operators ---
export const CONDITION_GROUP_OPERATORS = ['AND', 'OR'] as const;
export type ConditionGroupOperator = typeof CONDITION_GROUP_OPERATORS[number];

// --- Action Group Execution Modes ---
export const EXECUTION_MODES = ['ALL', 'EITHER', 'SEQUENCE'] as const;
export type ExecutionMode = typeof EXECUTION_MODES[number];

// --- Operator Categories for Validation ---
export const OPERATOR_CATEGORIES = {
  equality: EQUALITY_OPERATORS,
  comparison: COMPARISON_OPERATORS,
  list: LIST_OPERATORS,
  string: STRING_OPERATORS,
  null: NULL_OPERATORS,
  special: SPECIAL_OPERATORS,
  group: CONDITION_GROUP_OPERATORS
} as const;

// --- Helper Functions ---

/**
 * Check if an operator is a list/collection operator
 */
export function isListOperator(op: string): op is ListOperator {
  return LIST_OPERATORS.includes(op as ListOperator);
}

/**
 * Check if an operator is a string operator
 */
export function isStringOperator(op: string): op is StringOperator {
  return STRING_OPERATORS.includes(op as StringOperator);
}

/**
 * Check if an operator is a comparison operator
 */
export function isComparisonOperator(op: string): op is ComparisonOperator {
  return COMPARISON_OPERATORS.includes(op as ComparisonOperator);
}

/**
 * Check if an operator is valid
 */
export function isValidOperator(op: string): op is AnyOperator {
  return ALL_OPERATORS.includes(op as AnyOperator);
}
