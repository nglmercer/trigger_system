/**
 * YAML Parser Types
 * 
 * Type definitions for the YAML parser module.
 * These types are shared between the parser, normalizer, and converter.
 */

import type { 
  TriggerRule, 
  RuleCondition, 
  Action, 
  ActionGroup, 
  ComparisonOperator, 
  ExecutionMode,
  InlineConditionalAction
} from '../../types';

// Re-export core types for convenience
export type {
  TriggerRule,
  RuleCondition,
  Action,
  ActionGroup,
  ComparisonOperator,
  ExecutionMode,
  InlineConditionalAction
} from '../../types';

// Re-export node types from constants
export { NodeType, HandleId, BranchType } from '../constants';
import type { NodeType, HandleId, BranchType } from '../constants';

// ============================================================================
// Parser Options
// ============================================================================

export interface YamlParserOptions {
  /**
   * Assign an ID to rules that don't have one.
   * If false, rules without IDs will fail validation.
   * If string, that string will be used as a prefix.
   * If true, a default ID will be generated from the filename (requires filename option).
   */
  autoId?: boolean | string;
  
  /**
   * Filename to use for generating rule IDs and error messages.
   * Useful when parsing from a file.
   */
  filename?: string;
  
  /**
   * Whether to throw on validation errors or return them.
   * @default false (return errors)
   */
  throwOnError?: boolean;
  
  /**
   * Whether to support multi-document YAML.
   * @default true
   */
  multiDocument?: boolean;
}

// ============================================================================
// Parser Result
// ============================================================================

export interface YamlParserResult {
  /**
   * The parsed and validated rules
   */
  rules: TriggerRule[];
  
  /**
   * Validation errors (empty if all rules are valid)
   */
  errors: YamlParserError[];
  
  /**
   * Whether all rules are valid
   */
  valid: boolean;
}

export interface YamlParserError {
  /**
   * Index of the rule in the document (0-based)
   */
  index: number;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Path to the problematic field
   */
  path?: string;
  
  /**
   * Validation issues from TriggerValidator
   */
  issues?: Array<{
    path: string;
    message: string;
    suggestion?: string;
  }>;
}

// ============================================================================
// Editor Node/Edge Types (for React Flow conversion)
// ============================================================================

/**
 * Node types for the React Flow editor
 */
export type EditorNodeType = 'event' | 'condition' | 'condition_group' | 'action' | 'action_group' | 'do';

/**
 * Basic node structure for the editor
 */
export interface EditorNode {
  id: string;
  type: EditorNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/**
 * Basic edge structure for the editor
 */
export interface EditorEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * Result of converting a TriggerRule to nodes and edges
 */
export interface TriggerRuleToNodesResult {
  nodes: EditorNode[];
  edges: EditorEdge[];
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Condition Types (for parsing)
// ============================================================================

/**
 * Raw condition object from YAML (before normalization)
 */
export interface RawCondition {
  field?: string;
  operator?: string; // Comparison operator (EQ, GT, etc.) or group operator (AND, OR)
  value?: unknown;
  conditions?: RawCondition[];
}

/**
 * Raw action object from YAML (before normalization)
 */
export interface RawAction {
  type?: string;
  params?: Record<string, unknown>;
  run?: string;
  delay?: number;
  probability?: number;
  if?: RawCondition | RawCondition[];
  then?: RawAction | RawAction[];
  do?: RawAction | RawAction[]; // Alias for then
  else?: RawAction | RawAction[];
  mode?: ExecutionMode;
  actions?: RawAction[];
  break?: boolean;
  continue?: boolean;
  [key: string]: unknown;
}

/**
 * Raw rule object from YAML (before normalization)
 */
export interface RawRule {
  id?: string;
  name?: string;
  description?: string;
  on: string;
  if?: RawCondition | RawCondition[];
  do?: RawAction | RawAction[] | { mode: ExecutionMode; actions: RawAction[] };
  else?: RawAction | RawAction[] | { mode: ExecutionMode; actions: RawAction[] };
  actions?: RawAction | RawAction[]; // Alias for do
  priority?: number;
  enabled?: boolean;
  cooldown?: number;
  tags?: string[];
  [key: string]: unknown;
}

// ============================================================================
// Graph Node Types (for graph-based parsing)
// ============================================================================

export interface GraphParserOptions {
  /**
   * Custom function to check if a node is an event node
   */
  isEventNode?: (node: unknown) => boolean;
  
  /**
   * Custom function to check if a node is a condition node
   */
  isCondNode?: (node: unknown) => boolean;
  
  /**
   * Custom function to check if a node is an action node
   */
  isActNode?: (node: unknown) => boolean;
  
  /**
   * Custom function to check if a node is a DO node
   */
  isDoNode?: (node: unknown) => boolean;
  
  /**
   * Custom function to extract event data from an event node
   */
  extractEventData?: (node: unknown) => Record<string, unknown>;
  
  /**
   * Optimization options
   */
  optimizeOptions?: {
    enabled?: boolean;
    maxDepth?: number;
  };
}

export interface GraphParserContext {
  nodes: unknown[];
  edges: unknown[];
  visitedConds: Set<string>;
  visitedActs: Set<string>;
  options: GraphParserOptions;
  transformers?: {
    condition?: (cond: RuleCondition) => RuleCondition;
    action?: (action: Action) => Action;
  };
}

// Re-export from graph module
export type { GraphParserOptions as GraphParserOptionsInternal, GraphParserContext as GraphParserContextInternal } from '../graph/types';
