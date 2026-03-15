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
