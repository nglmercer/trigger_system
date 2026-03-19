/**
 * Graph Converters - Interfaces for data transformation
 * Provides interfaces for converting between graph data and rule structures
 */

import type { 
  SDKGraphNode, 
  SDKGraphEdge, 
  TriggerRule, 
  RuleCondition, 
  Action, 
  ActionGroup,
  InlineConditionalAction,
  ComparisonOperator,
  ConditionValue,
  ActionParams
} from '../../types';

/**
 * Data transformation options
 */
export interface TransformOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Strict mode - throw on errors */
  strict?: boolean;
}

/**
 * Base converter interface for node data transformation
 */
export interface INodeConverter<TNodeData, TOutput> {
  /** Convert node data to output format */
  convert(nodeData: TNodeData, context: ConverterContext): TOutput;
  
  /** Validate the input data */
  validate?(nodeData: TNodeData): ValidationResult;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Context passed to converters
 */
export interface ConverterContext {
  /** All nodes in the graph */
  nodes: SDKGraphNode[];
  /** All edges in the graph */
  edges: SDKGraphEdge[];
  /** Current node being processed */
  currentNode?: SDKGraphNode;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Options for transformation */
  options?: TransformOptions;
}

/**
 * Condition data from a graph node
 */
export interface ConditionNodeData {
  field?: string;
  operator?: ComparisonOperator;
  value?: unknown;
}

/**
 * Action data from a graph node
 */
export interface ActionNodeData {
  type?: string;
  params?: Record<string, unknown> | string;
  delay?: number;
  probability?: number;
}

/**
 * Event data from a graph node
 */
export interface EventNodeData {
  id?: string;
  name?: string;
  description?: string;
  event?: string;
  priority?: number | string;
  enabled?: boolean;
  cooldown?: number | string;
  tags?: string[];
}

/**
 * Condition group data
 */
export interface ConditionGroupData {
  operator?: 'AND' | 'OR';
}

/**
 * Action group data
 */
export interface ActionGroupData {
  mode?: 'ALL' | 'FIRST' | 'RANDOM';
}

/**
 * DO node data
 */
export interface DoNodeData {
  branchType?: 'do' | 'else';
}

/**
 * Condition converter - converts condition nodes to RuleCondition
 */
export class ConditionConverter implements INodeConverter<ConditionNodeData, RuleCondition> {
  convert(nodeData: ConditionNodeData, _context: ConverterContext): RuleCondition {
    return {
      field: nodeData.field || 'data',
      operator: nodeData.operator || 'EQ',
      value: (nodeData.value !== undefined ? nodeData.value : '') as ConditionValue
    };
  }

  validate(nodeData: ConditionNodeData): ValidationResult {
    const errors: string[] = [];
    
    if (!nodeData.field && !nodeData.value) {
      errors.push('Condition must have at least a field or value');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

/**
 * Action converter - converts action nodes to Action
 */
export class ActionConverter implements INodeConverter<ActionNodeData, Action> {
  convert(nodeData: ActionNodeData, _context: ConverterContext): Action {
    let params: Record<string, unknown> = {};
    
    try {
      if (nodeData.params) {
        params = typeof nodeData.params === 'string' 
          ? JSON.parse(nodeData.params) 
          : nodeData.params;
      }
    } catch {
      params = {};
    }

    const action: Action = {
      type: nodeData.type || 'log',
      params: params as ActionParams
    };

    if (nodeData.delay !== undefined) {
      action.delay = Number(nodeData.delay);
    }
    
    if (nodeData.probability !== undefined) {
      action.probability = Number(nodeData.probability);
    }

    return action;
  }

  validate(nodeData: ActionNodeData): ValidationResult {
    const warnings: string[] = [];
    
    if (!nodeData.type) {
      warnings.push('Action type defaults to "log"');
    }
    
    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Event converter - converts event nodes to TriggerRule metadata
 */
export class EventConverter implements INodeConverter<EventNodeData, Partial<TriggerRule>> {
  convert(nodeData: EventNodeData, _context: ConverterContext): Partial<TriggerRule> {
    return {
      id: nodeData.id,
      on: nodeData.event,
      name: nodeData.name,
      description: nodeData.description,
      priority: nodeData.priority !== undefined ? Number(nodeData.priority) : undefined,
      enabled: nodeData.enabled !== undefined ? !!nodeData.enabled : undefined,
      cooldown: nodeData.cooldown !== undefined ? Number(nodeData.cooldown) : undefined,
      tags: nodeData.tags
    };
  }

  validate(nodeData: EventNodeData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!nodeData.id) {
      errors.push('Event must have an ID');
    }
    
    if (!nodeData.event) {
      errors.push('Event must have an event name');
    }
    
    if (!nodeData.name) {
      warnings.push('Event should have a name');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Factory for creating converters
 */
export class ConverterFactory {
  private conditionConverter = new ConditionConverter();
  private actionConverter = new ActionConverter();
  private eventConverter = new EventConverter();

  /** Get condition converter */
  getConditionConverter(): ConditionConverter {
    return this.conditionConverter;
  }

  /** Get action converter */
  getActionConverter(): ActionConverter {
    return this.actionConverter;
  }

  /** Get event converter */
  getEventConverter(): EventConverter {
    return this.eventConverter;
  }

  /** Create converter context */
  createContext(
    nodes: SDKGraphNode[],
    edges: SDKGraphEdge[],
    currentNode?: SDKGraphNode,
    options?: TransformOptions
  ): ConverterContext {
    return { nodes, edges, currentNode, options };
  }
}

/**
 * Default converter factory instance
 */
export const converterFactory = new ConverterFactory();

/**
 * Convert action params from string to object
 */
export function parseActionParams(
  params: Record<string, unknown> | string | undefined
): Record<string, unknown> {
  if (!params) return {};
  
  if (typeof params === 'string') {
    try {
      return JSON.parse(params);
    } catch {
      return {};
    }
  }
  
  return params;
}

/**
 * Convert node data to condition
 */
export function nodeToCondition(node: SDKGraphNode): RuleCondition {
  const d = node.data || {};
  return converterFactory.getConditionConverter().convert(d, { nodes: [], edges: [] });
}

/**
 * Convert node data to action
 */
export function nodeToAction(node: SDKGraphNode): Action {
  const d = node.data || {};
  return converterFactory.getActionConverter().convert(d, { nodes: [], edges: [] });
}

/**
 * Convert node data to event data
 */
export function nodeToEventData(node: SDKGraphNode): Partial<TriggerRule> {
  const d = node.data || {};
  return converterFactory.getEventConverter().convert(d, { nodes: [], edges: [] });
}
