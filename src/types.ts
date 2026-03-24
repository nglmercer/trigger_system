// src/trigger_system/types.ts

/**
 * Agnostic Trigger System Types
 * Designed to be generic and extensible for any event-driven application.
 */

// --- Core Types ---

export interface RuleMetadata {
  id: string;
  name?: string;
  description?: string;
  priority?: number; // Higher number = Higher priority
  enabled?: boolean;
  cooldown?: number; // Milliseconds to wait before this rule can trigger again
  tags?: string[];
}

// --- Conditions ---

// Constants for validation - arrays of valid operators
/** List of all equality operators */
export const EQUALITY_OPERATORS = ['EQ', '==', 'NEQ', '!='] as const;
/** List of all comparison operators */
export const COMPARISON_OPERATORS = ['GT', '>', 'GTE', '>=', 'LT', '<', 'LTE', '<='] as const;
/** List of list/collection operators */
export const LIST_OPERATORS = ['IN', 'NOT_IN', 'RANGE'] as const;
/** List of string matching operators */
export const STRING_OPERATORS = ['CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH'] as const;
/** List of null-checking operators */
export const NULL_OPERATORS = ['IS_NULL', 'IS_NONE'] as const;
/** List of all valid operators */
export const ALL_OPERATORS = [
  ...EQUALITY_OPERATORS,
  ...COMPARISON_OPERATORS,
  ...LIST_OPERATORS,
  ...STRING_OPERATORS,
  'IS_EMPTY',
  'HAS_KEY',
  'MATCHES',
  'SINCE', 'AFTER',
  'BEFORE', 'UNTIL',
  'RANGE'
] as const;

/** Condition group operators */
export const CONDITION_GROUP_OPERATORS = ['AND', 'OR'] as const;

/** Action group execution modes */
export const EXECUTION_MODES = ['ALL', 'EITHER', 'SEQUENCE'] as const;

export type ComparisonOperator =
  | 'EQ' | '=='    // Equal
  | 'NEQ' | '!='   // Not Equal
  | 'GT' | '>'     // Greater Than
  | 'GTE' | '>='   // Greater Than or Equal
  | 'LT' | '<'     // Less Than
  | 'LTE' | '<='   // Less Than or Equal
  | 'IN'           // Value in Array
  | 'NOT_IN'       // Value not in Array
  | 'CONTAINS'     // String/Array contains
  | 'NOT_CONTAINS' // String/Array does not contain
  | 'STARTS_WITH'  // String starts with prefix
  | 'ENDS_WITH'    // String ends with suffix
  | 'IS_EMPTY'     // Value is empty (string/array/object)
  | 'IS_NULL' | 'IS_NONE'  // Value is null or undefined
  | 'HAS_KEY'      // Object has the specified key
  | 'MATCHES'      // Regex match
  | 'SINCE' | 'AFTER'   // Date >= Value
  | 'BEFORE' | 'UNTIL'  // Date < Value
  | 'RANGE';       // Number in range [min, max]

export type ConditionValue = string | number | boolean | Date | string[] | number[] | null;

export interface Condition {
  field: string;         // Path to variable in context (e.g. "data.amount" or "user.role")
  operator: ComparisonOperator;
  value?: ConditionValue; // The value to compare against (optional for IS_NULL, IS_EMPTY, IS_NONE)
}

export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

export type RuleCondition = Condition | ConditionGroup;

// --- Actions ---

export interface ActionParams {
  [key: string]: ActionParamValue;
}

export type ActionParamValue = string | number | boolean | null | ActionParamValue[] | ActionParams;

export interface Action {
  name?: string;
  type?: string; // Optional for conditional actions
  params?: ActionParams;
  delay?: number;
  probability?: number;
  // --- Control Flow ---
  if?: RuleCondition | RuleCondition[];  // Conditional execution
  then?: Action | Action[] | ActionGroup; // Actions to run if condition is true
  do?: Action | Action[] | ActionGroup; // Alias for then
  else?: Action | Action[] | ActionGroup; // Actions to run if condition is false
  break?: boolean; // Break out of action execution
  continue?: boolean; // Skip remaining actions
  // Shorthand support
  [key: string]: unknown;
}

export type ExecutionMode = 'ALL' | 'EITHER' | 'SEQUENCE';
export type HelperFunction = (...args: unknown[]) => unknown;
export interface ActionGroup {
  mode: ExecutionMode;
  actions: (Action | ActionGroup)[];
}

// --- Inline Conditional Action ---
// Used in do field for inline if/then/else logic
// Note: Includes index signature for compatibility with Action type
export interface InlineConditionalAction {
  if: RuleCondition | RuleCondition[];
  then?: Action | Action[] | ActionGroup;
  do?: Action | Action[] | ActionGroup; // Alias for then
  else?: Action | Action[] | ActionGroup;
  break?: boolean;
  continue?: boolean;
  // Index signature for compatibility with Action
  [key: string]: unknown;
}

// --- The Rule ---

export interface TriggerRule extends RuleMetadata {
  on: string;
  if?: RuleCondition | RuleCondition[];
  // Allow inline conditional actions in do field
  do: Action | Action[] | ActionGroup | (Action | ActionGroup)[] | InlineConditionalAction;
  // Optional else clause: actions to run when rule's 'if' condition is false
  else?: Action | Action[] | ActionGroup | (Action | ActionGroup)[];
}

// --- Engine Context ---

export interface TriggerContext {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
  id?: string;
  vars?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

export interface ExecutedAction {
  type: string;
  result?: unknown;
  error?: unknown;
  timestamp: number;
}

export interface TriggerResult {
  ruleId: string;
  success: boolean;
  executedActions: ExecutedAction[];
  error?: Error;
}

export interface GlobalSettings {
  debugMode?: boolean;
  evaluateAll?: boolean;
  strictActions?: boolean;
}

export interface StateLifecycle {
  reset?: string; // cron-like or "00:00 UTC"
  ttl?: string | number; // "1h", "30m", or ms
}

export interface StateDefinition {
  value: unknown;
  lifecycle?: StateLifecycle;
}

export interface RuleEngineConfig {
  rules: TriggerRule[];
  globalSettings: GlobalSettings;
}

// --- Rule Update Events ---

export interface RuleUpdateData {
  count: number;
  added: number;
  removed: number;
  unchanged: number;
  timestamp: number;
}

export interface RuleAddedData {
  ruleId: string;
  timestamp: number;
}

export interface RuleRemovedData {
  ruleId: string;
  timestamp: number;
}

export interface RuleParseErrorData {
  filename: string;
  error: string;
  timestamp: number;
}

export type RuleEventData = RuleUpdateData | RuleAddedData | RuleRemovedData | RuleParseErrorData;

// --- Action Handler Types ---

export type EngineActionHandler = (params: ActionParams, context: TriggerContext) => Promise<unknown> | unknown;

// --- Aliases for compatibility ---
export type TriggerCondition = Condition;
export type TriggerAction = Action;
export type TriggerConditionGroup = ConditionGroup;

// --- Graph Building Types ---

export interface SDKGraphNode {
  id: string;
  type: string;
  data: any;
}

export interface SDKGraphEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}
