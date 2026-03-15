/**
 * Trigger Editor Enums
 * Type-safe enumerated values for the editor
 */

import type { ComparisonOperator, ExecutionMode } from './types.js';

// ======================
// Comparison Operators
// ======================

export enum ComparisonOperatorEnum {
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IS_EMPTY = 'IS_EMPTY',
  IS_NULL = 'IS_NULL',
  HAS_KEY = 'HAS_KEY',
  MATCHES = 'MATCHES',
}

export interface OperatorOption {
  value: ComparisonOperatorEnum | ComparisonOperator;
  label: string;
  symbol?: string;
  hasValue: boolean;
}

export const OPERATORS: OperatorOption[] = [
  { value: 'EQ', label: 'Equals', symbol: '==', hasValue: true },
  { value: 'NEQ', label: 'Not Equals', symbol: '!=', hasValue: true },
  { value: 'GT', label: 'Greater Than', symbol: '>', hasValue: true },
  { value: 'GTE', label: 'Greater Than or Equal', symbol: '>=', hasValue: true },
  { value: 'LT', label: 'Less Than', symbol: '<', hasValue: true },
  { value: 'LTE', label: 'Less Than or Equal', symbol: '<=', hasValue: true },
  { value: 'IN', label: 'In Array', symbol: 'in', hasValue: true },
  { value: 'NOT_IN', label: 'Not In Array', symbol: 'not in', hasValue: true },
  { value: 'CONTAINS', label: 'Contains', symbol: '~', hasValue: true },
  { value: 'NOT_CONTAINS', label: 'Not Contains', symbol: '!~', hasValue: true },
  { value: 'STARTS_WITH', label: 'Starts With', symbol: '^=', hasValue: true },
  { value: 'ENDS_WITH', label: 'Ends With', symbol: '$=', hasValue: true },
  { value: 'IS_EMPTY', label: 'Is Empty', symbol: 'empty', hasValue: false },
  { value: 'IS_NULL', label: 'Is Null', symbol: 'null', hasValue: false },
  { value: 'HAS_KEY', label: 'Has Key', symbol: '?', hasValue: true },
  { value: 'MATCHES', label: 'Matches (Regex)', symbol: '=~', hasValue: true },
];

// ======================
// Execution Modes
// ======================

export enum ExecutionModeEnum {
  ALL = 'ALL',
  EITHER = 'EITHER',
  SEQUENCE = 'SEQUENCE',
}

export interface ExecutionModeOption {
  value: ExecutionModeEnum | ExecutionMode;
  label: string;
  description: string;
}

export const EXECUTION_MODES: ExecutionModeOption[] = [
  { value: 'ALL', label: 'Execute All', description: 'Execute all conditions and actions' },
  { value: 'EITHER', label: 'Execute Either', description: 'Execute if any condition matches' },
  { value: 'SEQUENCE', label: 'Execute in Sequence', description: 'Execute actions in order' },
];

// ======================
// Action Types
// ======================

export enum ActionTypeEnum {
  LOG = 'log',
  HTTP = 'http',
  NOTIFY = 'notify',
  TRANSFORM = 'transform',
  DELAY = 'delay',
  SET_STATE = 'set_state',
  BROADCAST = 'broadcast',
  EMIT = 'emit',
  SCRIPT = 'script',
}

export interface ActionTypeOption {
  value: ActionTypeEnum | string;
  label: string;
  icon?: string;
  description: string;
  hasParams: boolean;
}

export const ACTION_TYPES: ActionTypeOption[] = [
  { value: 'log', label: 'Log', icon: '📝', description: 'Log a message', hasParams: true },
  { value: 'http', label: 'HTTP Request', icon: '🌐', description: 'Make an HTTP request', hasParams: true },
  { value: 'notify', label: 'Notify', icon: '🔔', description: 'Send a notification', hasParams: true },
  { value: 'transform', label: 'Transform', icon: '🔄', description: 'Transform event data', hasParams: true },
  { value: 'delay', label: 'Delay', icon: '⏱️', description: 'Delay execution', hasParams: true },
  { value: 'set_state', label: 'Set State', icon: '💾', description: 'Update internal state', hasParams: true },
  { value: 'broadcast', label: 'Broadcast', icon: '📡', description: 'Broadcast to other triggers', hasParams: true },
  { value: 'emit', label: 'Emit', icon: '📤', description: 'Emit a new event', hasParams: true },
  { value: 'script', label: 'Script', icon: '📜', description: 'Run custom script', hasParams: true },
];

// ======================
// Validation Severity
// ======================

export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
}

// ======================
// Export Formats
// ======================

export enum ExportFormat {
  YAML = 'yaml',
  JSON = 'json',
}

// ======================
// Editor Modes
// ======================

export enum EditorMode {
  VIEW = 'view',
  EDIT = 'edit',
  CREATE = 'create',
}

// ======================
// Theme
// ======================

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

// ======================
// Field Types (for form builder)
// ======================

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi-select',
  TAGS = 'tags',
  JSON = 'json',
  CONDITION = 'condition',
  ACTION = 'action',
}

// ======================
// Condition/Action Item States
// ======================

export enum ItemState {
  DEFAULT = 'default',
  EDITING = 'editing',
  ERROR = 'error',
  DISABLED = 'disabled',
}

// ======================
// Operator Category
// ======================

export enum OperatorCategory {
  COMPARISON = 'comparison',
  STRING = 'string',
  ARRAY = 'array',
  LOGICAL = 'logical',
  REGEX = 'regex',
}

export const OPERATOR_CATEGORIES: Record<OperatorCategory, string[]> = {
  [OperatorCategory.COMPARISON]: ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE'],
  [OperatorCategory.STRING]: ['CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH'],
  [OperatorCategory.ARRAY]: ['IN', 'NOT_IN', 'IS_EMPTY'],
  [OperatorCategory.LOGICAL]: ['IS_NULL', 'IS_EMPTY', 'HAS_KEY'],
  [OperatorCategory.REGEX]: ['MATCHES'],
};

// ======================
// Helper Functions
// ======================

/**
 * Get operator option by value
 */
export function getOperatorByValue(value: string): OperatorOption | undefined {
  return OPERATORS.find(op => op.value === value);
}

/**
 * Get action type option by value
 */
export function getActionTypeByValue(value: string): ActionTypeOption | undefined {
  return ACTION_TYPES.find(act => act.value === value);
}

/**
 * Get execution mode option by value
 */
export function getExecutionModeByValue(value: string): ExecutionModeOption | undefined {
  return EXECUTION_MODES.find(mode => mode.value === value);
}

/**
 * Check if operator requires a value
 */
export function operatorRequiresValue(operator: string): boolean {
  const op = getOperatorByValue(operator);
  return op?.hasValue ?? true;
}

/**
 * Get operators by category
 */
export function getOperatorsByCategory(category: OperatorCategory): OperatorOption[] {
  const operatorValues = OPERATOR_CATEGORIES[category];
  return OPERATORS.filter(op => operatorValues.includes(op.value as string));
}
