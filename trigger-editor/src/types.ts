/**
 * Trigger Editor Types
 * Type definitions for the browser-based rule editor
 * 
 * Imports core types from trigger_system and extends with editor-specific types
 */

// Import core types from the main SDK
import type {
  TriggerRule,
  RuleCondition,
  Condition,
  ConditionGroup,
  ComparisonOperator,
  ConditionValue,
  Action,
  ActionGroup,
  ExecutionMode,
  ActionParams,
  ActionParamValue
} from '../../src/types';

// Re-export core types
export type {
  TriggerRule,
  RuleCondition,
  Condition,
  ConditionGroup,
  ComparisonOperator,
  ConditionValue,
  Action,
  ActionGroup,
  ExecutionMode,
  ActionParams,
  ActionParamValue
};

// --- Editor Types ---

export interface EditorConfig {
  /** Initial rules to load */
  initialRules?: TriggerRule[];
  /** Enable dark mode */
  darkMode?: boolean;
  /** Show YAML preview */
  showYamlPreview?: boolean;
  /** Available action types for autocomplete */
  availableActions?: string;
  /** Available events for autocomplete */
  availableEvents?: string;
  /** Custom validation function */
  validateRule?: (rule: TriggerRule) => EditorValidationError[];
  /** Called when rules are exported */
  onExport?: (rules: TriggerRule[], format: 'yaml' | 'json') => void;
  /** Called when rules are changed */
  onChange?: (rules: TriggerRule[]) => void;
}

export interface EditorValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface EditorEventMap {
  'rule-added': CustomEvent<TriggerRule>;
  'rule-updated': CustomEvent<{ old: TriggerRule; new: TriggerRule }>;
  'rule-deleted': CustomEvent<TriggerRule>;
  'rules-exported': CustomEvent<{ rules: TriggerRule[]; format: 'yaml' | 'json' }>;
  'rules-changed': CustomEvent<TriggerRule[]>;
  'validation-error': CustomEvent<EditorValidationError[]>;
}

// --- Form Types ---

export interface RuleFormData {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  cooldown: number;
  tags: string[];
  on: string;
  if: RuleCondition | RuleCondition[] | undefined;
  do: any[];
}

export const COMPARISON_OPERATORS: { value: ComparisonOperator; label: string }[] = [
  { value: 'EQ', label: 'Equals (==)' },
  { value: 'NEQ', label: 'Not Equals (!=)' },
  { value: 'GT', label: 'Greater Than (>)' },
  { value: 'GTE', label: 'Greater Than or Equal (>=)' },
  { value: 'LT', label: 'Less Than (<)' },
  { value: 'LTE', label: 'Less Than or Equal (<=)' },
  { value: 'IN', label: 'In Array' },
  { value: 'NOT_IN', label: 'Not In Array' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Not Contains' },
  { value: 'STARTS_WITH', label: 'Starts With' },
  { value: 'ENDS_WITH', label: 'Ends With' },
  { value: 'IS_EMPTY', label: 'Is Empty' },
  { value: 'IS_NULL', label: 'Is Null' },
  { value: 'HAS_KEY', label: 'Has Key' },
  { value: 'MATCHES', label: 'Matches (Regex)' },
];

export const EXECUTION_MODES: { value: ExecutionMode; label: string }[] = [
  { value: 'ALL', label: 'Execute All' },
  { value: 'EITHER', label: 'Execute Either' },
  { value: 'SEQUENCE', label: 'Execute in Sequence' },
];
