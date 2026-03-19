/**
 * SDK Constants for handle IDs and node types
 * These constants are shared between the SDK and the trigger-editor
 */

// Node types
export const NodeType = {
  EVENT: 'event',
  CONDITION: 'condition',
  CONDITION_GROUP: 'condition_group',
  ACTION: 'action',
  ACTION_GROUP: 'action_group',
  DO: 'do',
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

// Handle IDs for node connections
export const HandleId = {
  // Event node handles
  EVENT_OUTPUT: 'event-output',
  
  // Condition node handles
  CONDITION_INPUT: 'condition-input',
  CONDITION_OUTPUT: 'output',
  CONDITION_OUTPUT_LEGACY: 'condition-output',
  THEN_OUTPUT: 'then-output',
  ELSE_OUTPUT: 'else-output',
  
  // ConditionGroup node handles
  CONDITION_GROUP_INPUT: 'input',
  CONDITION_GROUP_OUTPUT: 'cond-output',
  
  // Action node handles
  ACTION_INPUT: 'action-input',
  ACTION_OUTPUT: 'action-output',
  ACTION_OUTPUT_LEGACY: 'action-group-output',
  
  // ActionGroup node handles
  ACTION_GROUP_INPUT: 'input',
  ACTION_GROUP_OUTPUT: 'action-output',
  ACTION_GROUP_CONDITION_OUTPUT: 'condition-output',
  
  // DoNode handles
  DO_INPUT: 'do-input',
  DO_OUTPUT: 'do-output',
} as const;

export type HandleId = typeof HandleId[keyof typeof HandleId];

// Branch types for DoNode
export const BranchType = {
  DO: 'do',
  ELSE: 'else',
} as const;

export type BranchType = typeof BranchType[keyof typeof BranchType];

// Condition operators
export const ConditionOperator = {
  AND: 'AND',
  OR: 'OR',
} as const;

export type ConditionOperator = typeof ConditionOperator[keyof typeof ConditionOperator];
