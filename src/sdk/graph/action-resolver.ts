/**
 * Action Resolver - Handles action collection and resolution
 * Provides utilities for converting graph action nodes to Action/ActionGroup objects
 */

import { NodeType, HandleId, BranchType } from '../constants';
import { findEdgesBySource, HandleFilters, type HandleArray } from './traversal';
import { nodeToAction, parseActionParams } from './converters';
import { getDoBranchType, defaultIsActNode } from './node-filters';
import { findTerminalConditions } from './condition-resolver';
import type { 
  SDKGraphNode, 
  SDKGraphEdge, 
  Action, 
  ActionGroup,
  ExecutionMode,
  TriggerRule,
  RuleCondition
} from '../../types';

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
    resolveCondition?: (id: string, ctx: any) => RuleCondition | null;
    resolveAction?: (id: string, ctx: any) => Action | ActionGroup | null;
  };
  transformers?: {
    condition?: (cond: RuleCondition, node: SDKGraphNode) => RuleCondition | null;
    action?: (act: Action | ActionGroup, node: SDKGraphNode) => Action | ActionGroup | null;
  };
}

/**
 * Context for action resolution - compatible with GraphParserContext
 */
export interface ActionResolverContext extends GraphResolverContextBase {
  visitedActs?: Set<string>;
  visitedConds?: Set<string>;
}

/**
 * Options for action resolution
 */
export interface ActionResolverOptions {
  /** Custom predicate for detecting action nodes */
  isActNode?: (node: SDKGraphNode) => boolean;
  /** Custom function to resolve an action from ID */
  resolveAction?: (id: string, ctx: ActionResolverContext) => Action | ActionGroup | null;
}

/**
 * Transformer for actions during resolution
 */
export interface ActionTransformer {
  /** Transform an action after resolution */
  action?: (act: Action | ActionGroup, node: SDKGraphNode) => Action | ActionGroup | null;
}

/**
 * Result of collecting actions for a group
 */
export interface CollectedActions {
  actions: (Action | ActionGroup)[];
  mode: ExecutionMode;
}

/**
 * Collect all actions that belong to an action group (directly or via chaining).
 * Returns the actions and the mode of the group.
 */
export function collectActionsForGroup(
  groupId: string,
  ctx: ActionResolverContext
): CollectedActions {
  const isAct = ctx.options.isActNode || defaultIsActNode;
  const groupNode = ctx.nodes.find(n => n.id === groupId);
  
  if (!groupNode || groupNode.type !== NodeType.ACTION_GROUP) {
    return { actions: [], mode: 'ALL' as ExecutionMode };
  }

  const mode = (groupNode.data.mode || 'ALL') as ExecutionMode;
  const actions: (Action | ActionGroup)[] = [];
  const visited = new Set<string>();

  function collectFromAction(actionId: string) {
    if (visited.has(actionId)) return;
    visited.add(actionId);
    
    const actionNode = ctx.nodes.find(n => n.id === actionId);
    if (!actionNode || !isAct(actionNode) || actionNode.type === NodeType.ACTION_GROUP) return;
    
    const action = nodeToAction(actionNode);
    actions.push(action);
    
    // Follow chaining edges
    const chainEdges = findEdgesBySource(ctx, actionId, HandleFilters.ACTION_OUTPUT)
      .filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target && isAct(target);
      });
    
    for (const edge of chainEdges) {
      collectFromAction(edge.target);
    }
  }

  // Start from actions directly connected to the group
  // Note: Also search for DO_OUTPUT since some imports may use that handle
  const directEdges = findEdgesBySource(ctx, groupId, [
    HandleId.ACTION_GROUP_OUTPUT,
    HandleId.DO_OUTPUT,
    'do-output',
    'action-output',
    'action-group-output'
  ])
    .filter(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && isAct(target);
    });
  
  for (const edge of directEdges) {
    collectFromAction(edge.target);
  }

  // Also collect conditions for inline if/then/else within the group
  const conditionEdges = findEdgesBySource(ctx, groupId, [
    HandleId.ACTION_GROUP_CONDITION_OUTPUT,
    'condition-output'
  ]);

  for (const edge of conditionEdges) {
    const action = resolveAction(edge.target, ctx);
    
    if (action) {
      actions.push(action);
    }
  }

  return { actions, mode };
}

/**
 * Resolve an action from an action node ID
 */
export function resolveAction(
  id: string, 
  ctx: ActionResolverContext
): Action | ActionGroup | null {
  if (ctx.options.resolveAction && ctx.options.resolveAction !== resolveAction) {
    return ctx.options.resolveAction(id, ctx);
  }

  const node = ctx.nodes.find(n => n.id === id);
  if (!node) return null;

  // Handle Action Groups
  if (node.type === NodeType.ACTION_GROUP) {
    if (ctx.visitedActs?.has(id)) return null;
    ctx.visitedActs?.add(id);

    const { actions, mode } = collectActionsForGroup(id, ctx);
    if (actions.length === 0) return null;
    return { mode, actions };
  }

  // Handle Condition nodes (Inline Conditional Actions)
  if (node.type === NodeType.CONDITION) {
    // We need to resolve the condition and its branches
    if (ctx.options.resolveCondition) {
      const condition = ctx.options.resolveCondition(id, ctx);
      if (condition) {
        // Find DO nodes connected to this condition
        const { doBranches, elseBranches } = categorizeDoNodesByBranch(id, ctx);
        
        let thenAct: Action | ActionGroup | null = null;
        let elseAct: Action | ActionGroup | null = null;
        
        // Resolve then branch
        if (doBranches.length > 0) {
          const firstDoId = doBranches[0]!;
          const actions = collectActionsFromDoNode(firstDoId, ctx);
          if (actions.length > 0) {
            thenAct = actions.length === 1 ? actions[0]! : { mode: 'ALL' as ExecutionMode, actions: actions as Action[] };
          }
        }
        
        // Resolve else branch
        if (elseBranches.length > 0) {
          const firstElseId = elseBranches[0]!;
          const actions = collectActionsFromDoNode(firstElseId, ctx);
          if (actions.length > 0) {
            elseAct = actions.length === 1 ? actions[0]! : { mode: 'ALL' as ExecutionMode, actions: actions as Action[] };
          }
        }
        
        // Fallback to direct actions if no DO branches found
        if (!thenAct && !elseAct) {
          const terminal = findTerminalConditions(id, ctx);
          if (terminal.thenActionId) {
            thenAct = resolveAction(terminal.thenActionId, ctx);
          }
          if (terminal.elseActionId) {
            elseAct = resolveAction(terminal.elseActionId, ctx);
          }
        }
        
        if (thenAct || elseAct) {
          return {
            if: condition,
            then: thenAct ?? undefined,
            do: thenAct ?? undefined,
            else: elseAct ?? undefined
          } as any;
        }
      }
    }
  }

  const isAct = ctx.options.isActNode || defaultIsActNode;
  if (!isAct(node)) return null;

  if (ctx.visitedActs?.has(id)) return null;
  ctx.visitedActs?.add(id);

  const action = nodeToAction(node);

  if (ctx.transformers?.action) {
    const transformed = ctx.transformers.action(action, node);
    if (transformed === null) return null;
    return transformed;
  }

  return action;
}

/**
 * Helper to collect all actions from a DO node
 */
export function collectActionsFromDoNode(
  doNodeId: string,
  ctx: ActionResolverContext
): (Action | ActionGroup)[] {
  const isAct = ctx.options.isActNode || defaultIsActNode;
  const actions: (Action | ActionGroup)[] = [];
  
  const directEdges = findEdgesBySource(ctx, doNodeId, [
    HandleId.DO_OUTPUT,
    HandleId.ELSE_OUTPUT,
    'do-output',
    'else-output',
    'action-output',
    ''
  ])
    .filter(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && isAct(target);
    });
  
  for (const edge of directEdges) {
    const action = resolveAction(edge.target, ctx);
    if (action) {
      actions.push(action);
    }
  }
  
  return actions;
}

/**
 * DO node category result
 */
export interface DoBranches {
  doBranches: string[];
  elseBranches: string[];
}

/**
 * Categorize DO nodes by their branch type (do vs else)
 */
export function categorizeDoNodesByBranch(
  startConditionId: string,
  ctx: ActionResolverContext
): DoBranches {
  const isCond = ctx.options.isActNode ? (n: SDKGraphNode) => n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP : 
    ((n: SDKGraphNode) => n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP);
  const isDo = (n: SDKGraphNode) => n.type === NodeType.DO;
  
  const doBranches: string[] = [];
  const elseBranches: string[] = [];
  const visited = new Set<string>();
  
  function traverse(condId: string) {
    if (visited.has(condId)) return;
    visited.add(condId);
    
    // Find DO nodes directly connected to this condition
    // Include THEN_OUTPUT for condition→do connections (inline conditionals)
    const doEdges = findEdgesBySource(ctx, condId, [...HandleFilters.CONDITION_OUTPUT, HandleId.THEN_OUTPUT])
      .filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target && isDo(target);
      });
    
    for (const edge of doEdges) {
      const doNode = ctx.nodes.find(n => n.id === edge.target);
      if (!doNode) continue;
      
      const branchType = getDoBranchType(doNode);
      
      if (branchType === BranchType.ELSE) {
        if (!elseBranches.includes(edge.target)) {
        //  console.log(`[DEBUG] Found ELSE branch ${edge.target} for condition ${condId}`);
          elseBranches.push(edge.target);
        }
      } else {
        if (!doBranches.includes(edge.target)) {
        //  console.log(`[DEBUG] Found DO branch ${edge.target} for condition ${condId}`);
          doBranches.push(edge.target);
        }
      }
    }
    
    // Follow condition chain edges
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
  
  return { doBranches, elseBranches };
}

/**
 * ActionResolver class - Fluent interface for action resolution
 */
export class ActionResolver {
  private ctx: ActionResolverContext;
  private isAct: (node: SDKGraphNode) => boolean;

  constructor(
    nodes: SDKGraphNode[],
    edges: SDKGraphEdge[],
    visitedActs: Set<string>,
    options: ActionResolverOptions = {},
    transformers?: ActionTransformer
  ) {
    this.ctx = { nodes, edges, visitedActs, options, transformers };
    this.isAct = options.isActNode || defaultIsActNode;
  }

  /** Get the resolution context */
  getContext(): ActionResolverContext {
    return this.ctx;
  }

  /** Check if a node is an action */
  isAction(node: SDKGraphNode): boolean {
    return this.isAct(node);
  }

  /** Check if a node is a DO node */
  isDo(node: SDKGraphNode): boolean {
    return node.type === NodeType.DO;
  }

  /** Resolve an action by ID */
  resolve(id: string): Action | ActionGroup | null {
    return resolveAction(id, this.ctx);
  }

  /** Collect actions for a group */
  collectForGroup(groupId: string): CollectedActions {
    return collectActionsForGroup(groupId, this.ctx);
  }

  /** Categorize DO nodes by branch type */
  categorizeDoNodes(conditionId: string): DoBranches {
    return categorizeDoNodesByBranch(conditionId, this.ctx);
  }

  /** Create a new resolver with additional options */
  withOptions(options: Partial<ActionResolverOptions>): ActionResolver {
    return new ActionResolver(
      this.ctx.nodes,
      this.ctx.edges,
      this.ctx.visitedActs!,
      { ...this.ctx.options, ...options },
      this.ctx.transformers
    );
  }

  /** Create a new resolver with transformers */
  withTransformers(transformers: ActionTransformer): ActionResolver {
    return new ActionResolver(
      this.ctx.nodes,
      this.ctx.edges,
      this.ctx.visitedActs!,
      this.ctx.options,
      transformers
    );
  }
}
