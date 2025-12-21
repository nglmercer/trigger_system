// src/trigger_system/types.ts

/**
 * Agnostic Trigger System Types
 * Designed to be generic and extensible for any event-driven application.
 */

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

export interface Condition {
  field: string;         // Path to variable in context (e.g. "data.amount" or "user.role")
  operator: ComparisonOperator;
  value: any;            // The value to compare against
}

export interface ConditionGroup {
  // Logic grouping
  operator: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

export type RuleCondition = Condition | ConditionGroup;

// --- Actions ---

export interface Action {
  type: string;          // Action identifier (e.g. "DROP", "SEND_WEBHOOK")
  params?: Record<string, any>; // Arguments for the action
  delay?: number;        // Delay in ms before execution
  probability?: number;  // 0-1 probability of execution (for randomized behaviors)
}

export type ExecutionMode = 
  | 'ALL'        // Execute all actions (Default)
  | 'EITHER'     // Execute exactly one action randomly (uniform distribution unless probability set)
  | 'SEQUENCE';  // Execute in order, waiting for previous to complete (if async)

export interface ActionGroup {
  mode: ExecutionMode;
  actions: Action[];
}

// --- The Rule ---

export interface TriggerRule extends RuleMetadata {
  on: string; // The Event Name to listen for (e.g. "Donation", "HttpRequest")
  if?: RuleCondition | RuleCondition[]; // Conditions. If array, implicit AND.
  do: Action | Action[] | ActionGroup; // What to do
}

// --- Engine Context ---

export interface TriggerContext {
  event: string;
  // Valid timestamps
  timestamp: number;
  // The data payload of the event
  data: Record<string, any>;
  id?: string;
  // Global variables (env vars, server state)
  globals?: Record<string, any>;
  // Dynamic State (counters, flags, goals)
  state?: Record<string, any>;
  // Helper for computing derived values
  helpers?: Record<string, Function>;
}

export interface TriggerResult {
  ruleId: string;
  success: boolean;
  executedActions: {
    type: string;
    result?: any;
    error?: any;
    timestamp: number;
  }[];
  error?: Error;
}

export interface RuleEngineConfig {
  rules: TriggerRule[];
  globalSettings: {
    debugMode?: boolean;
    evaluateAll?: boolean; // If false, stop after first successful rule
    strictActions?: boolean; // If true, throws error on unknown actions instead of warning
  };
}

// Aliases for compatibility with engines that might import these
export type TriggerCondition = Condition;
export type TriggerAction = Action;
