/**
 * Shared constants for the Trigger Editor Node Editor
 * 
 * This module re-exports and enhances the LSP constants from trigger_system
 * for use in the web-based node editor.
 */

// Import constants from trigger_system LSP module
// Since trigger_editor is a workspace package, it can import from trigger_system
// import type { 
//   FIELD_DOCS, 
//   OPERATOR_DOCS, 
//   CONDITION_FIELD_DOCS, 
//   ACTION_FIELD_DOCS, 
//   ACTION_TYPE_DOCS 
// } from '../../src';

// Re-export for use in the node editor components
export { 
  FIELD_DOCS, 
  OPERATOR_DOCS, 
  CONDITION_FIELD_DOCS, 
  ACTION_FIELD_DOCS, 
  ACTION_TYPE_DOCS 
} from '../../src';

import i18n from './i18n.ts';

/**
 * Operator options for the Condition Node dropdown
 * Derived from OPERATOR_DOCS for use in the UI
 */
export interface OperatorOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Generate operator options for dropdown UI
 */
export function getOperatorOptions(): OperatorOption[] {
  const options = [
    { value: 'EQ', label: 'Equals (==)', description: 'Equal to' },
    { value: 'NEQ', label: 'Not Equals (!=)', description: 'Not equal to' },
    { value: 'GT', label: 'Greater Than (>)', description: 'Greater than' },
    { value: 'GTE', label: 'Greater Than or Equal (>=)', description: 'Greater than or equal to' },
    { value: 'LT', label: 'Less Than (<)', description: 'Less than' },
    { value: 'LTE', label: 'Less Than or Equal (<=)', description: 'Less than or equal to' },
    { value: 'IN', label: 'In List', description: 'Value is in the given list' },
    { value: 'NOT_IN', label: 'Not In List', description: 'Value is not in the given list' },
    { value: 'CONTAINS', label: 'Contains', description: 'String contains substring or array includes item' },
    { value: 'NOT_CONTAINS', label: 'Not Contains', description: 'String does not contain or array does not include' },
    { value: 'STARTS_WITH', label: 'Starts With', description: 'String starts with prefix' },
    { value: 'ENDS_WITH', label: 'Ends With', description: 'String ends with suffix' },
    { value: 'IS_EMPTY', label: 'Is Empty', description: 'Value is empty (string, array, object, or null)' },
    { value: 'IS_NULL', label: 'Is Null', description: 'Value is null or undefined' },
    { value: 'HAS_KEY', label: 'Has Key', description: 'Object has the specified key' },
    { value: 'MATCHES', label: 'Matches Regex', description: 'Value matches the regular expression pattern' },
    { value: 'RANGE', label: 'In Range', description: 'Value is within the specified range [min, max]' },
  ];
  return options.map(opt => ({
    ...opt,
    label: i18n.t(`shared.operators.${opt.value}`, { defaultValue: opt.label }) as string,
    description: i18n.t(`shared.operators.descriptions.${opt.value}`, { defaultValue: opt.description }) as string
  }));
}

/**
 * Get operator label for display
 */
export function getOperatorLabel(operator: string): string {
  const options = getOperatorOptions();
  const found = options.find(opt => opt.value === operator);
  return found ? found.label : operator;
}

/**
 * Get operator description for tooltip/hover
 */
export function getOperatorDescription(operator: string): string | undefined {
  const options = getOperatorOptions();
  const found = options.find(opt => opt.value === operator);
  return found?.description;
}

/**
 * Action type options for the Action Node dropdown
 * Derived from ACTION_TYPE_DOCS
 */
export interface ActionTypeOption {
  value: string;
  label: string;
  description: string;
  params: string[];
}

/**
 * Generate action type options for dropdown UI
 */
export function getActionTypeOptions(): ActionTypeOption[] {
  return [
    { 
      value: 'log', 
      label: 'Log', 
      description: 'Prints a message to the engine console for debugging',
      params: ['message: string (supports interpolation)']
    },
    { 
      value: 'math', 
      label: 'Math', 
      description: 'Expression to evaluate',
      params: ['expression: string (e.g. "1 + 2" or "\'Hello \' + data.name")']
    },
    { 
      value: 'execute', 
      label: 'Execute', 
      description: 'Runs a shell command on the host (Node.js only)',
      params: ['command: string', 'safe: boolean']
    },
    { 
      value: 'notify', 
      label: 'Notify', 
      description: 'Sends a notification to a specified target',
      params: ['message: string', 'target: string']
    },
    { 
      value: 'STATE_SET', 
      label: 'State Set', 
      description: 'Updates a value in the global state manager',
      params: ['key: string', 'value: any']
    },
    { 
      value: 'HTTP_REQUEST', 
      label: 'HTTP Request', 
      description: 'Makes an HTTP request to external service',
      params: ['url: string', 'method: string', 'headers?: object', 'body?: any']
    },
    { 
      value: 'DELAY', 
      label: 'Delay', 
      description: 'Waits for specified milliseconds before continuing',
      params: ['ms: number']
    },
    { 
      value: 'CONDITIONAL', 
      label: 'Conditional', 
      description: 'Execute actions based on a condition',
      params: ['condition: object', 'then: actions', 'else?: actions']
    },
  ];
}

/**
 * Get action type label for display
 */
export function getActionTypeLabel(actionType: string): string {
  const options = getActionTypeOptions();
  const found = options.find(opt => opt.value === actionType);
  return found ? found.label : actionType;
}

/**
 * Get action type description
 */
export function getActionTypeDescription(actionType: string): string {
  const options = getActionTypeOptions();
  const found = options.find(opt => opt.value === actionType);
  return found?.description || 'Unknown action type';
}

/**
 * Execution mode options for action groups
 */
export const EXECUTION_MODE_OPTIONS = [
  { value: 'ALL', label: 'All (ALL)', description: 'Execute all actions' },
  { value: 'SEQUENCE', label: 'Sequence (SEQUENCE)', description: 'Execute in order' },
  { value: 'EITHER', label: 'Either (EITHER)', description: 'Execute one randomly' },
] as const;

/**
 * Condition group operator options
 */
export const CONDITION_GROUP_OPTIONS = [
  { value: 'AND', label: 'And (AND)', description: 'All conditions must be true' },
  { value: 'OR', label: 'Or (OR)', description: 'At least one condition must be true' },
] as const;

/**
 * Field documentation for tooltips
 * Maps field names to their descriptions
 */
export const FIELD_TOOLTIPS: Record<string, string> = {
  id: 'Unique identifier for this rule',
  name: 'Human-readable name for the rule',
  description: 'Detailed description of what this rule does',
  on: 'The event name that triggers this rule (e.g., Donation, UserLogin)',
  priority: 'Execution priority (higher values execute first)',
  enabled: 'Whether this rule is active (true/false)',
  cooldown: 'Minimum time in milliseconds between executions',
  tags: 'Tags for categorizing and organizing rules',
  comment: 'Internal developer note (not used in execution)',
  field: 'The field path to check (e.g., data.amount, event.user.id)',
  operator: 'The comparison operator to use',
  value: 'The value to compare against',
  conditions: 'Array of sub-conditions for AND/OR groups',
  type: 'The type of action to perform',
  params: 'Parameters for the action (varies by action type)',
  delay: 'Delay in milliseconds before executing this action',
  probability: 'Probability of executing this action (0.0 to 1.0)',
  mode: 'Execution mode for action groups (ALL, SEQUENCE, EITHER)',
  actions: 'Array of sub-actions for action groups',
  then: 'Connect actions here to run when condition is TRUE (green handle)',
  else: 'Connect actions here to run when condition is FALSE (orange handle)',
};

/**
 * Get tooltip for a field
 */
export function getFieldTooltip(field: string): string | undefined {
  const fallback = FIELD_TOOLTIPS[field];
  if (!fallback) return undefined;
  return i18n.t(`shared.tooltips.${field}`, { defaultValue: fallback }) as string;
}
