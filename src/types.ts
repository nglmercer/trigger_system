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
  | 'MATCHES'      // Regex match
  | 'SINCE' | 'AFTER'   // Date >= Value
  | 'BEFORE' | 'UNTIL'  // Date < Value
  | 'RANGE';       // Number in range [min, max]

export type ConditionValue = string | number | boolean | Date | string[] | number[] | null;

export interface Condition {
  field: string;         // Path to variable in context (e.g. "data.amount" or "user.role")
  operator: ComparisonOperator;
  value: ConditionValue; // The value to compare against
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
  type?: string; // Optional for conditional actions
  params?: ActionParams;
  delay?: number;
  probability?: number;
  // --- Control Flow ---
  if?: RuleCondition | RuleCondition[];  // Conditional execution
  then?: Action | Action[] | ActionGroup; // Actions to run if condition is true
  else?: Action | Action[] | ActionGroup; // Actions to run if condition is false
  break?: boolean; // Break out of action execution
  continue?: boolean; // Skip remaining actions
}

export type ExecutionMode = 'ALL' | 'EITHER' | 'SEQUENCE';

export interface ActionGroup {
  mode: ExecutionMode;
  actions: Action[];
}

// --- The Rule ---

export interface TriggerRule extends RuleMetadata {
  on: string;
  if?: RuleCondition | RuleCondition[];
  do: Action | Action[] | ActionGroup;
}

// --- Engine Context ---

export interface TriggerContext {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
  id?: string;
  vars?: Record<string, unknown>;
  state?: Record<string, unknown>;
  env?: Record<string, unknown>; // Dynamic variables for action flow
  helpers?: Record<string, (...args: unknown[]) => unknown>;
  lastResult?: unknown;
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
