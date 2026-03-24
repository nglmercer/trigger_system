/**
 * Condition Resolver - Handles condition collection and resolution
 * Provides utilities for converting graph condition nodes to RuleCondition objects
 */

import { NodeType, HandleId, ConditionOperator } from '../constants';
import { 
  findEdgesBySource, 
  HandleFilters 
} from './traversal';
import { nodeToCondition } from './converters';
import { defaultIsCondNode } from './node-filters';
import type { 
  SDKGraphNode, 
  SDKGraphEdge, 
  RuleCondition,
  TriggerRule,
  Action,
  ActionGroup
} from '../../types';
import type { GraphParserContext,GraphParserOptions } from './types';
/**
 * Base context interface for graph resolution
 */
export interface GraphResolverContextBase {
  nodes: SDKGraphNode[];
  edges: SDKGraphEdge[];
  options: {
    isCondNode?: (node: SDKGraphNode) => boolean;
    isActNode?: (node: SDKGraphNode) => boolean;
    isEventNode?: (node: SDKGraphNode) => boolean;
    extractEventData?: (node: SDKGraphNode) => Partial<TriggerRule>;
    resolveCondition?: (id: string, ctx: GraphParserContext) => RuleCondition | null;
    resolveAction?: (id: string, ctx: any) => Action | ActionGroup | null;
  };
  transformers?: {
    condition?: (cond: RuleCondition, node: SDKGraphNode) => RuleCondition | null;
    action?: (act: Action | ActionGroup, node: SDKGraphNode) => Action | ActionGroup | null;
  };
}

/**
 * Context for condition resolution - compatible with GraphParserContext
 */
export interface ConditionResolverContext extends GraphResolverContextBase {
  visitedConds?: Set<string>;
  visitedActs?: Set<string>;
}
/**
 * Transformer for conditions during resolution
 */
export interface ConditionTransformer {
  /** Transform a condition after resolution */
  condition?: (cond: RuleCondition, node: SDKGraphNode) => RuleCondition | null;
}

/**
 * Result of collecting conditions for a group
 */
export interface CollectedConditions {
  conditions: RuleCondition[];
  operator: 'AND' | 'OR';
}

/**
 * Collect all conditions that belong to a condition group (directly or via chaining).
 * Returns the conditions and the operator of the group.
 */
export function collectConditionsForGroup(
  groupId: string,
  ctx: ConditionResolverContext
): CollectedConditions {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const groupNode = ctx.nodes.find(n => n.id === groupId);
  
  if (!groupNode || groupNode.type !== NodeType.CONDITION_GROUP) {
    return { conditions: [], operator: ConditionOperator.AND };
  }

  const operator = (groupNode.data.operator || ConditionOperator.AND) as 'AND' | 'OR';
  const conditions: RuleCondition[] = [];
  const visited = new Set<string>();

  function collectFromCondition(condId: string) {
    if (visited.has(condId)) return;
    visited.add(condId);
    
    const condNode = ctx.nodes.find(n => n.id === condId);
    if (!condNode || !isCond(condNode) || condNode.type === NodeType.CONDITION_GROUP) return;
    
    const condition = nodeToCondition(condNode);
    conditions.push(condition);
    
    // Follow chaining edges - include THEN_OUTPUT for condition→do connections
    const chainEdges = findEdgesBySource(ctx, condId, [...HandleFilters.CONDITION_OUTPUT, HandleId.THEN_OUTPUT])
      .filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target && isCond(target);
      });
    
    for (const edge of chainEdges) {
      collectFromCondition(edge.target);
    }
  }

  // Start from conditions directly connected to the group
  const directEdges = findEdgesBySource(ctx, groupId, [HandleId.CONDITION_GROUP_OUTPUT])
    .filter(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && isCond(target);
    });
  
  for (const edge of directEdges) {
    collectFromCondition(edge.target);
  }

  return { conditions, operator };
}

/**
 * Resolve a condition from a condition node ID
 */
export function resolveCondition(
  id: string, 
  ctx: ConditionResolverContext
): RuleCondition | null {
  if (ctx.options.resolveCondition && ctx.options.resolveCondition !== resolveCondition) {
    return ctx.options.resolveCondition(id, ctx);
  }

  if (ctx.visitedConds!.has(id)) return null;
  ctx.visitedConds!.add(id);

  const node = ctx.nodes.find(n => n.id === id);
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  if (!node || !isCond(node)) return null;

  if (node.type === NodeType.CONDITION_GROUP) {
    const { conditions, operator } = collectConditionsForGroup(id, ctx);
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;
    return { operator, conditions };
  }

  const condition = nodeToCondition(node);
  
  if (ctx.transformers?.condition) {
    const transformed = ctx.transformers.condition(condition, node);
    if (transformed === null) return null;
    return transformed;
  }

  // Check for chained conditions
  const chainEdges = findEdgesBySource(ctx, id, HandleFilters.CONDITION_OUTPUT)
    .filter(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && isCond(target);
    });
  
  if (chainEdges.length > 0) {
    const children = chainEdges
      .map(e => resolveCondition(e.target, ctx))
      .filter((c): c is RuleCondition => c !== null);
    
    if (children.length > 0) {
      return { operator: 'AND', conditions: [condition, ...children] };
    }
  }
  
  return condition;
}

/**
 * Find terminal condition(s) in a condition chain (where actions connect).
 * Returns then/else action IDs.
 */
export interface TerminalActions {
  thenActionId?: string;
  elseActionId?: string;
}

export function findTerminalConditions(
  startConditionId: string,
  ctx: ConditionResolverContext
): TerminalActions {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  
  let thenActionId: string | undefined;
  let elseActionId: string | undefined;
  
  function traverse(condId: string) {
    const condNode = ctx.nodes.find(n => n.id === condId);
    if (!condNode || !isCond(condNode)) return;
    
    // Find all edges from this condition to other nodes
    const allEdges = ctx.edges.filter(e => e.source === condId);
    
    for (const edge of allEdges) {
      const targetNode = ctx.nodes.find(n => n.id === edge.target);
      if (!targetNode) continue;
      
      // Track action connections
      if (targetNode.type === NodeType.ACTION || 
          targetNode.type === NodeType.ACTION_GROUP ||
          targetNode.type === NodeType.DO) {
        
        // If it's a DO node, use its branchType to decide
        const isElse = targetNode.type === NodeType.DO 
          ? (targetNode.data?.branchType === 'else')
          : (edge.sourceHandle === HandleId.ELSE_OUTPUT);

        if (isElse) {
          elseActionId = edge.target;
        } else {
          thenActionId = edge.target;
        }
      }
    }
    
    // Follow chain to other conditions
    const chainEdges = findEdgesBySource(ctx, condId, HandleFilters.CONDITION_OUTPUT)
      .filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target && isCond(target);
      });
    
    for (const edge of chainEdges) {
      traverse(edge.target);
    }
  }
  
  traverse(startConditionId);
  return { thenActionId, elseActionId };
}

/**
 * ConditionResolver class - Fluent interface for condition resolution
 */
export class ConditionResolver {
  private ctx: ConditionResolverContext;
  private isCond: (node: SDKGraphNode) => boolean;

  constructor(
    nodes: SDKGraphNode[],
    edges: SDKGraphEdge[],
    visitedConds: Set<string>,
    options: GraphParserOptions = {},
    transformers?: ConditionTransformer
  ) {
    this.ctx = { nodes, edges, visitedConds, options, transformers };
    this.isCond = options.isCondNode || defaultIsCondNode;
  }

  /** Get the resolution context */
  getContext(): ConditionResolverContext {
    return this.ctx;
  }

  /** Check if a node is a condition */
  isCondition(node: SDKGraphNode): boolean {
    return this.isCond(node);
  }

  /** Resolve a condition by ID */
  resolve(id: string): RuleCondition | null {
    return resolveCondition(id, this.ctx);
  }

  /** Collect conditions for a group */
  collectForGroup(groupId: string): CollectedConditions {
    return collectConditionsForGroup(groupId, this.ctx);
  }

  /** Find terminal actions from a condition */
  findTerminals(conditionId: string): TerminalActions {
    return findTerminalConditions(conditionId, this.ctx);
  }

  /** Create a new resolver with additional options */
  withOptions(options: Partial<GraphParserOptions>): ConditionResolver {
    return new ConditionResolver(
      this.ctx.nodes,
      this.ctx.edges,
      this.ctx.visitedConds!,
      { ...this.ctx.options, ...options },
      this.ctx.transformers
    );
  }

  /** Create a new resolver with transformers */
  withTransformers(transformers: ConditionTransformer): ConditionResolver {
    return new ConditionResolver(
      this.ctx.nodes,
      this.ctx.edges,
      this.ctx.visitedConds!,
      this.ctx.options,
      transformers
    );
  }
}
