/**
 * Node Filters - Type checking utilities for graph nodes
 * Provides centralized node type detection for the graph parser
 */

import { NodeType, BranchType, HandleId } from '../constants';
import type { SDKGraphNode, TriggerRule } from '../../types';

/**
 * Type predicates for node classification
 */
export type NodePredicate = (node: SDKGraphNode) => boolean;

/**
 * Configuration for node type detection
 */
export interface NodeFilterConfig {
  /** Custom predicate for event nodes */
  isEventNode?: NodePredicate;
  /** Custom predicate for condition nodes */
  isCondNode?: NodePredicate;
  /** Custom predicate for action nodes */
  isActNode?: NodePredicate;
  /** Custom function to extract event data */
  extractEventData?: (node: SDKGraphNode) => Partial<TriggerRule>;
}

/**
 * Default event node detector
 */
export const defaultIsEventNode: NodePredicate = (n: SDKGraphNode) => 
  n.type === NodeType.EVENT;

/**
 * Default condition node detector (single condition or condition group)
 */
export const defaultIsCondNode: NodePredicate = (n: SDKGraphNode) => 
  n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP;

/**
 * Default action node detector (single action, action group, or DO node)
 */
export const defaultIsActNode: NodePredicate = (n: SDKGraphNode) => 
  n.type === NodeType.ACTION || n.type === NodeType.ACTION_GROUP || n.type === NodeType.DO;

/**
 * Default DO node detector
 */
export const defaultIsDoNode: NodePredicate = (n: SDKGraphNode) => 
  n.type === NodeType.DO;

/**
 * Check if a node is a condition group
 */
export const isConditionGroup = (node: SDKGraphNode): boolean =>
  node.type === NodeType.CONDITION_GROUP;

/**
 * Check if a node is an action group
 */
export const isActionGroup = (node: SDKGraphNode): boolean =>
  node.type === NodeType.ACTION_GROUP;

/**
 * Get the branch type for a DO node
 */
export const getDoBranchType = (node: SDKGraphNode): BranchType => {
  return node.data?.branchType === BranchType.ELSE ? BranchType.ELSE : BranchType.DO;
};

/**
 * Check if a DO node is an else branch
 */
export const isElseBranch = (node: SDKGraphNode): boolean =>
  getDoBranchType(node) === BranchType.ELSE;

/**
 * Check if a DO node is a do branch (then path)
 */
export const isDoBranch = (node: SDKGraphNode): boolean =>
  getDoBranchType(node) === BranchType.DO;

/**
 * Default event data extractor
 */
export function extractEventData(node: SDKGraphNode): Partial<TriggerRule> {
  const d = node.data || {};
  return {
    id: d.id,
    on: d.event,
    name: d.name,
    description: d.description,
    priority: d.priority !== undefined ? Number(d.priority) : undefined,
    enabled: d.enabled !== undefined ? !!d.enabled : undefined,
    cooldown: d.cooldown !== undefined ? Number(d.cooldown) : undefined,
    tags: d.tags
  };
}

/**
 * Create a filter configuration with defaults
 */
export function createNodeFilterConfig(
  overrides?: NodeFilterConfig
): Required<NodeFilterConfig> {
  return {
    isEventNode: overrides?.isEventNode ?? defaultIsEventNode,
    isCondNode: overrides?.isCondNode ?? defaultIsCondNode,
    isActNode: overrides?.isActNode ?? defaultIsActNode,
    extractEventData: overrides?.extractEventData ?? extractEventData
  };
}

/**
 * NodeFilter class - Fluent interface for node type checking
 */
export class NodeFilter {
  private _isEvent: NodePredicate;
  private _isCond: NodePredicate;
  private _isAct: NodePredicate;
  private _extractEvent: (node: SDKGraphNode) => Partial<TriggerRule>;

  constructor(config?: NodeFilterConfig) {
    const defaults = createNodeFilterConfig(config);
    this._isEvent = defaults.isEventNode;
    this._isCond = defaults.isCondNode;
    this._isAct = defaults.isActNode;
    this._extractEvent = defaults.extractEventData;
  }

  /** Check if node is an event */
  isEvent(node: SDKGraphNode): boolean {
    return this._isEvent(node);
  }

  /** Check if node is a condition (single or group) */
  isCondition(node: SDKGraphNode): boolean {
    return this._isCond(node);
  }

  /** Check if node is an action (single or group or DO) */
  isAction(node: SDKGraphNode): boolean {
    return this._isAct(node);
  }

  /** Check if node is a DO node */
  isDo(node: SDKGraphNode): boolean {
    return defaultIsDoNode(node);
  }

  /** Extract event data from node */
  extractEvent(node: SDKGraphNode): Partial<TriggerRule> {
    return this._extractEvent(node);
  }

  /** Set custom event node predicate */
  withEventPredicate(predicate: NodePredicate): this {
    this._isEvent = predicate;
    return this;
  }

  /** Set custom condition node predicate */
  withConditionPredicate(predicate: NodePredicate): this {
    this._isCond = predicate;
    return this;
  }

  /** Set custom action node predicate */
  withActionPredicate(predicate: NodePredicate): this {
    this._isAct = predicate;
    return this;
  }

  /** Set custom event data extractor */
  withEventExtractor(extractor: (node: SDKGraphNode) => Partial<TriggerRule>): this {
    this._extractEvent = extractor;
    return this;
  }
}
