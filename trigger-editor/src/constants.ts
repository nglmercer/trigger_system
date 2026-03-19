export enum NodeType {
  EVENT = 'event',
  CONDITION = 'condition',
  CONDITION_GROUP = 'condition_group',
  ACTION = 'action',
  ACTION_GROUP = 'action_group',
  DO = 'do',
}

export const DRAG_DATA_FORMAT = 'application/reactflow';

export const INITIAL_HINT = 'Add an Event Trigger node to start building a rule...';

export enum StorageKey {
  NODES = 'trigger-editor-nodes',
  EDGES = 'trigger-editor-edges',
}

export enum NodeField {
  ID = 'id',
  NAME = 'name',
  DESCRIPTION = 'description',
  EVENT = 'event',
  PRIORITY = 'priority',
  FIELD = 'field',
  OPERATOR = 'operator',
  VALUE = 'value',
  TYPE = 'type',
  PARAMS = 'params',
  MODE = 'mode',
  BRANCH_TYPE = 'branchType',
}

// Handle IDs for node connections
export enum NodeHandle {
  // Event node handles
  EVENT_OUTPUT = 'event-output',
  
  // Condition node handles
  CONDITION_INPUT = 'condition-input',
  CONDITION_OUTPUT = 'output',
  
  // ConditionGroup node handles
  CONDITION_GROUP_INPUT = 'input',
  CONDITION_GROUP_OUTPUT = 'cond-output',
  
  // Action node handles
  ACTION_INPUT = 'action-input',
  ACTION_OUTPUT = 'action-output',
  
  // ActionGroup node handles
  ACTION_GROUP_INPUT = 'input',
  ACTION_GROUP_OUTPUT = 'action-output',
  ACTION_GROUP_CONDITION_OUTPUT = 'condition-output',
  
  // DoNode handles
  DO_INPUT = 'do-input',
  DO_OUTPUT = 'do-output',
  // DO node can connect to condition for inline conditionals (after do allow conditions)
  DO_CONDITION_OUTPUT = 'do-condition-output',
}

// Branch types for DoNode
export enum BranchType {
  DO = 'do',
  ELSE = 'else',
}

// Comparison operators for conditional actions
export const COMPARISON_OPERATORS = [
  { value: 'EQ', label: 'Equals (==)' },
  { value: 'NEQ', label: 'Not Equals (!=)' },
  { value: 'GT', label: 'Greater Than (>)' },
  { value: 'GTE', label: 'Greater or Equal (>=)' },
  { value: 'LT', label: 'Less Than (<)' },
  { value: 'LTE', label: 'Less or Equal (<=)' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Not Contains' },
  { value: 'STARTS_WITH', label: 'Starts With' },
  { value: 'ENDS_WITH', label: 'Ends With' },
  { value: 'IN', label: 'In List' },
  { value: 'NOT_IN', label: 'Not In List' },
  { value: 'IS_EMPTY', label: 'Is Empty' },
  { value: 'IS_NULL', label: 'Is Null' },
  { value: 'HAS_KEY', label: 'Has Key' },
  { value: 'MATCHES', label: 'Matches (Regex)' },
];
