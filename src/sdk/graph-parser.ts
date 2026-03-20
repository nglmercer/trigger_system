/**
 * Graph Parser - Main entry point for parsing graph structures into rules
 * This module coordinates the conversion of SDKGraphNode/SDKGraphEdge to TriggerRule
 */

import { RuleBuilder } from './builder';
import { HandleId, BranchType, NodeType } from './constants';
import type { 
  TriggerRule,
  RuleCondition,
  Action,
  ActionGroup,
  ExecutionMode,
  SDKGraphNode,
  SDKGraphEdge,
  InlineConditionalAction
} from '../types';

// Import from graph utilities
import {
  defaultIsEventNode,
  defaultIsCondNode,
  defaultIsActNode,
  defaultIsDoNode,
  getDoBranchType,
  extractEventData,
  findEdgesBySource,
  HandleFilters,
  resolveCondition as resolveConditionInternal,
  collectConditionsForGroup,
  resolveAction as resolveActionInternal,
  collectActionsForGroup,
  categorizeDoNodesByBranch,
} from './graph';
import type { GraphParserOptions,GraphParserContext } from './graph/types';
// Re-export for external use
export type { GraphParserOptions, GraphParserContext } from './graph/types';

// ============================================================================
// Factory Functions
// ============================================================================

export function createParserContext(
  nodes: SDKGraphNode[], 
  edges: SDKGraphEdge[],
  options: GraphParserOptions = {},
  transformers?: GraphParserContext['transformers']
): GraphParserContext {
  // Ensure default resolvers are available in options for recursive calls
  const contextOptions = {
    ...options,
    resolveCondition: options.resolveCondition || resolveConditionInternal,
    resolveAction: options.resolveAction || resolveActionInternal,
  };

  return { 
    nodes, 
    edges, 
    visitedConds: new Set(), 
    visitedActs: new Set(), 
    options: contextOptions,
    transformers 
  };
}

// ============================================================================
// Default Type Checkers (re-exported from graph module)
// ============================================================================

// Re-export for convenience - uses functions from graph module
export const defaultGetDoBranchType = getDoBranchType;
export const defaultExtractEventData = extractEventData;

// ============================================================================
// Inline Conditional Builder
// ============================================================================

/**
 * Build an inline conditional from a DO node and its connected condition
 */
function buildInlineConditional(
  doNodeId: string,
  ctx: GraphParserContext,
  sourceConditionId?: string
): InlineConditionalAction | null {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const isDo = defaultIsDoNode;
  
  // Find condition connected via DO_CONDITION_OUTPUT
  const conditionEdge = findEdgesBySource(ctx, doNodeId, [HandleId.DO_CONDITION_OUTPUT])
    .find(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && isCond(target);
    });
  
  // Determine which condition to use - only use explicit do-condition-output edge
  // Do NOT fall back to sourceConditionId for inline conditionals
  // (sourceConditionId is only used for finding terminal actions, not for creating inline conditionals)
  let conditionToUse: string | undefined;
  
  if (conditionEdge) {
    conditionToUse = conditionEdge.target;
  }
  
  if (!conditionToUse) {
    return null;
  }
  
  // Get the condition (clear visited to allow resolution)
  const savedVisited = new Set(ctx.visitedConds);
  ctx.visitedConds!.clear();
  
  const condition = resolveConditionInternal(conditionToUse, ctx);
  ctx.visitedConds = savedVisited;
  
  if (!condition) {
    return null;
  }
  
  // Use local findTerminalActions to properly handle DO nodes
  let { thenActionId, elseActionId } = findTerminalActions(conditionToUse, ctx);
  
  // NOTE: We no longer check for DO nodes from source condition here.
  // The inline conditional should only include actions reachable from the 
  // condition connected via do-condition-output, not from sibling DO branches.
  // The rule's else should be handled separately at a higher level.
  
  // Check for direct do-condition-output to action
  const directToAction = findEdgesBySource(ctx, doNodeId, [HandleId.DO_CONDITION_OUTPUT])
    .find(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && (ctx.options.isActNode?.(target) ?? defaultIsActNode(target));
    });
  
  if (directToAction && !elseActionId) {
    elseActionId = directToAction.target;
  }
  
  const thenAction = thenActionId ? resolveActionInternal(thenActionId, ctx) : undefined;
  const elseAction = elseActionId ? resolveActionInternal(elseActionId, ctx) : undefined;
  
  return {
    if: condition,
    do: thenAction ?? undefined,
    else: elseAction ?? undefined
  };
}

// ============================================================================
// DO Actions Collector
// ============================================================================

/**
 * Collect all actions from a DO node, including:
 * - Direct actions via do-output
 * - Inline conditionals via do-condition-output
 * Returns an array of actions that should be executed in order (mode: ALL)
 */
export function collectDoActions(
  doNodeId: string,
  ctx: GraphParserContext,
  sourceConditionId?: string
): (Action | ActionGroup | InlineConditionalAction)[] {
  const isAct = ctx.options.isActNode || defaultIsActNode;
  const actions: (Action | ActionGroup | InlineConditionalAction)[] = [];
  
  // Find direct actions via do-output
  const directActionEdges = findEdgesBySource(ctx, doNodeId, HandleFilters.DO_OUTPUT)
    .filter(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && isAct(target);
    });
  
  for (const edge of directActionEdges) {
    const action = resolveActionInternal(edge.target, ctx);
    if (action) {
      actions.push(action);
    }
  }
  
  // Find inline conditional via do-condition-output
  const inlineCondition = buildInlineConditional(doNodeId, ctx, sourceConditionId);
  if (inlineCondition) {
    actions.push(inlineCondition);
  }
  
  return actions;
}
// ============================================================================
// Terminal Actions Finder
// ============================================================================

/**
 * Find the terminal condition(s) in a condition chain (where actions connect).
 * Returns then/else action IDs.
 */
export function findTerminalActions(
  startConditionId: string,
  ctx: GraphParserContext
): { thenActionId?: string; elseActionId?: string } {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const isAct = ctx.options.isActNode || defaultIsActNode;
  const isDo = defaultIsDoNode;
  
  let thenActionId: string | undefined;
  let elseActionId: string | undefined;
  
  function traverse(condId: string) {
    const condNode = ctx.nodes.find(n => n.id === condId);
    if (!condNode || !isCond(condNode)) return;
    
    // Check for action connections from this condition
    const actionEdges = findEdgesBySource(ctx, condId, [
      HandleId.THEN_OUTPUT, 
      HandleId.ELSE_OUTPUT, 
      HandleId.CONDITION_OUTPUT, 
      HandleId.CONDITION_OUTPUT_LEGACY,
      HandleId.DO_OUTPUT,
      ''
    ]);
    
    for (const edge of actionEdges) {
      const targetNode = ctx.nodes.find(n => n.id === edge.target);
      if (!targetNode) continue;
      
      // Handle DO nodes - they are intermediaries for then/else paths
      if (isDo(targetNode)) {
        const doToActionEdges = findEdgesBySource(ctx, targetNode.id, [HandleId.DO_OUTPUT, ''])
          .filter(e => {
            const target = ctx.nodes.find(n => n.id === e.target);
            return target && isAct(target);
          });
        
        const branchType = getDoBranchType(targetNode);
        for (const doEdge of doToActionEdges) {
          if (branchType === BranchType.ELSE) {
            elseActionId = doEdge.target;
          } else {
            thenActionId = doEdge.target;
          }
        }
        
        // Check for DO -> Condition OR DO -> Action connections
        const allDoEdges = findEdgesBySource(ctx, targetNode.id, [HandleId.DO_CONDITION_OUTPUT]);
        
        const doToConditionEdge = allDoEdges.find(e => {
          const target = ctx.nodes.find(n => n.id === e.target);
          return target && isCond(target);
        });
        const doToActionEdge = allDoEdges.find(e => {
          const target = ctx.nodes.find(n => n.id === e.target);
          return target && isAct(target);
        });
        
        if (doToActionEdge && !elseActionId) {
          elseActionId = doToActionEdge.target;
        }
        continue;
      }
      
      // Handle ActionGroup nodes
      if (targetNode.type === NodeType.ACTION_GROUP) {
        thenActionId = edge.target;
        continue;
      }
      
      // Regular action nodes
      if (!isAct(targetNode)) continue;
      
      if (edge.sourceHandle === HandleId.ELSE_OUTPUT) {
        elseActionId = edge.target;
      } else {
        thenActionId = edge.target;
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

// ============================================================================
// Main Parser
// ============================================================================

export function parseGraph(
  nodes: SDKGraphNode[], 
  edges: SDKGraphEdge[],
  options: GraphParserOptions = {},
  transformers?: GraphParserContext['transformers']
): RuleBuilder {
  const builder = new RuleBuilder();
  
  if (options.optimizeOptions) {
    builder.withOptimizeOptions(options.optimizeOptions);
  }

  const isEvent = options.isEventNode || defaultIsEventNode;
  const isCond = options.isCondNode || defaultIsCondNode;
  const isAct = options.isActNode || defaultIsActNode;
  const extractEvent = options.extractEventData || defaultExtractEventData;

  const eventNode = nodes.find(n => isEvent(n));
  if (!eventNode) throw new Error("Missing Event Trigger node");
  
  const ed = extractEvent(eventNode);
  if (!ed.id || !ed.on) {
    throw new Error("Rule ID and Event Name are required");
  }

  builder.id(ed.id as string).on(ed.on as string);
  if (ed.name) builder.name(ed.name);
  if (ed.description) builder.description(ed.description);
  if (ed.priority !== undefined) builder.priority(Number(ed.priority));
  if (ed.enabled !== undefined) builder.enabled(!!ed.enabled);
  if (ed.cooldown !== undefined) builder.cooldown(Number(ed.cooldown));
  if (ed.tags) builder.tags(ed.tags);

  const ctx = createParserContext(nodes, edges, options, transformers);

  // Find root elements connected directly to the event
  const rootEdges = edges.filter(e => e.source === eventNode.id);
  
  const rootConditionGroups: string[] = [];
  const rootConditions: string[] = [];
  const rootActionGroups: string[] = [];
  const rootActions: string[] = [];
  
  for (const edge of rootEdges) {
    const targetNode = ctx.nodes.find(n => n.id === edge.target);
    if (!targetNode) continue;
    
    if (targetNode.type === NodeType.CONDITION_GROUP) {
      rootConditionGroups.push(edge.target);
    } else if (isCond(targetNode)) {
      rootConditions.push(edge.target);
    } else if (targetNode.type === NodeType.ACTION_GROUP) {
      rootActionGroups.push(edge.target);
    } else if (isAct(targetNode)) {
      rootActions.push(edge.target);
    }
  }

  // Process condition groups
  for (const groupId of rootConditionGroups) {
    const { conditions, operator } = collectConditionsForGroup(groupId, ctx);
    
    if (conditions.length > 0) {
      const conditionGroup: RuleCondition = {
        operator,
        conditions
      };
      builder.withIf(conditionGroup);
      
      // Find all conditions in this group that have terminal actions
      const conditionIdsInGroup = ctx.edges
        .filter(e => e.source === groupId && e.sourceHandle?.startsWith('cond'))
        .map(e => e.target);
      
      let thenAct: Action | ActionGroup | InlineConditionalAction | null = null;
      let elseAct: Action | ActionGroup | InlineConditionalAction | null = null;
      
      for (const condId of conditionIdsInGroup) {
        // Find terminal actions via traditional connections
        const terminal = findTerminalActions(condId, ctx);
        let currThenAct = terminal.thenActionId ? resolveActionInternal(terminal.thenActionId, ctx) : null;
        let currElseAct = terminal.elseActionId ? resolveActionInternal(terminal.elseActionId, ctx) : null;

        // Categorize DO nodes by branch type
        const { doBranches, elseBranches } = categorizeDoNodesByBranch(condId, ctx);
        
        // Collect actions from do branches
        const doActions: (Action | ActionGroup | InlineConditionalAction)[] = [];
        for (const doNodeId of doBranches) {
          const actions = collectDoActions(doNodeId, ctx, condId);
          doActions.push(...actions);
        }
        
        if (doActions.length > 0) {
          currThenAct = doActions.length === 1 
            ? doActions[0] as Action | ActionGroup | InlineConditionalAction
            : { mode: 'ALL' as ExecutionMode, actions: doActions as Action[] };
        }
        
        // Collect actions from else branches
        const elseActions: (Action | ActionGroup | InlineConditionalAction)[] = [];
        for (const elseNodeId of elseBranches) {
          const actions = collectDoActions(elseNodeId, ctx, condId);
          elseActions.push(...actions);
        }
        
        if (elseActions.length > 0) {
          currElseAct = elseActions.length === 1 
            ? elseActions[0] as Action | ActionGroup | InlineConditionalAction
            : { mode: 'ALL' as ExecutionMode, actions: elseActions as Action[] };
        }

        if (currThenAct) thenAct = currThenAct;
        if (currElseAct) elseAct = currElseAct;
      }
      
      if (thenAct) {
        builder.withDo(thenAct);
      }
      
      if (elseAct) {
        builder.elseRule(elseAct);
      }
    }
  }

  // Process standalone conditions (no condition group)
  if (rootConditions.length > 0 && rootConditionGroups.length === 0) {
    const conditions: RuleCondition[] = [];
    let thenActionId: string | undefined;
    let elseActionId: string | undefined;
    
    for (const condId of rootConditions) {
      const condition = resolveConditionInternal(condId, ctx);
      if (condition) conditions.push(condition);
      
      const terminal = findTerminalActions(condId, ctx);
      if (terminal.thenActionId) thenActionId = terminal.thenActionId;
      if (terminal.elseActionId) elseActionId = terminal.elseActionId;
    }
    
    if (conditions.length === 1) {
      builder.withIf(conditions[0]!);
    } else if (conditions.length > 1) {
      builder.withIf({ operator: 'AND', conditions });
    }
    
    // Categorize DO nodes
    const firstCondId = rootConditions[0];
    if (!firstCondId) return builder;
    
    const { doBranches, elseBranches } = categorizeDoNodesByBranch(firstCondId, ctx);
    
    // Collect do actions
    const doActions: (Action | ActionGroup | InlineConditionalAction)[] = [];
    for (const doNodeId of doBranches) {
      const actions = collectDoActions(doNodeId, ctx, firstCondId);
      doActions.push(...actions);
    }
    
    let thenAct: Action | ActionGroup | InlineConditionalAction | null = doActions.length === 1 
      ? doActions[0] as Action | ActionGroup | InlineConditionalAction
      : doActions.length > 1 
        ? { mode: 'ALL' as ExecutionMode, actions: doActions as Action[] }
        : (thenActionId ? resolveActionInternal(thenActionId, ctx) : null);
    
    // Collect else actions
    const elseActions: (Action | ActionGroup | InlineConditionalAction)[] = [];
    for (const elseNodeId of elseBranches) {
      const actions = collectDoActions(elseNodeId, ctx, firstCondId);
      elseActions.push(...actions);
    }
    
    let elseAct: Action | ActionGroup | InlineConditionalAction | null = elseActions.length === 1 
      ? elseActions[0] as Action | ActionGroup | InlineConditionalAction
      : elseActions.length > 1 
        ? { mode: 'ALL' as ExecutionMode, actions: elseActions as Action[] }
        : (elseActionId ? resolveActionInternal(elseActionId, ctx) : null);
    
    if (thenAct) {
      builder.withDo(thenAct);
    }
    
    if (elseAct) {
      builder.elseRule(elseAct);
    }
    
    // Also check for ActionGroup connections directly from conditions
    // Only process if we haven't already set do actions from DO nodes
    if (!thenActionId && !doActions.length) {
      for (const condId of rootConditions) {
        const actionGroupEdges = findEdgesBySource(ctx, condId, [
          HandleId.THEN_OUTPUT,
          HandleId.CONDITION_OUTPUT, 
          'condition-output', 
          'then-output',
          'output', 
          ''
        ]).filter(e => {
          const target = ctx.nodes.find(n => n.id === e.target);
          return target?.type === NodeType.ACTION_GROUP;
        });
        
        for (const agEdge of actionGroupEdges) {
          const { actions, mode } = collectActionsForGroup(agEdge.target, ctx);
          if (actions.length > 0) {
            const actionGroup: ActionGroup = { mode, actions };
            builder.withDo(actionGroup);
            break; // Only process first action group to avoid duplicates
          }
        }
      }
    }
  }

  // Process action groups
  // Only process if not already processed from conditions
  const processedActionGroupIds = new Set<string>();
  
  // Track action groups already processed from conditions
  if (rootConditions.length > 0 && rootConditionGroups.length === 0) {
    for (const condId of rootConditions) {
      const actionGroupEdges = findEdgesBySource(ctx, condId, [
        HandleId.THEN_OUTPUT,
        HandleId.CONDITION_OUTPUT, 
        'condition-output',
        'then-output', 
        'output', 
        ''
      ]).filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target?.type === NodeType.ACTION_GROUP;
      });
      
      for (const agEdge of actionGroupEdges) {
        processedActionGroupIds.add(agEdge.target);
      }
    }
  }
  
  // Filter out already processed action groups
  const unprocessedRootActionGroups = rootActionGroups.filter(id => !processedActionGroupIds.has(id));
  
  if (unprocessedRootActionGroups.length > 0) {
    for (const groupId of unprocessedRootActionGroups) {
      const conditionEdges = findEdgesBySource(ctx, groupId, [
        HandleId.ACTION_GROUP_CONDITION_OUTPUT, 
        'condition-output'
      ]).filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target && isCond(target);
      });
      
      if (conditionEdges.length > 0) {
        const { actions, mode } = collectActionsForGroup(groupId, ctx);
        if (actions.length > 0) {
          const actionGroup: ActionGroup = { mode, actions };
          builder.withDo(actionGroup);
        }
      } else {
        const { actions, mode } = collectActionsForGroup(groupId, ctx);
        if (actions.length > 0) {
          builder.withDo({ mode, actions });
        }
      }
    }
  }

  // Process root actions (no conditions)
  if (rootActions.length > 0 && rootConditions.length === 0 && rootConditionGroups.length === 0) {
    for (const actionId of rootActions) {
      const action = resolveActionInternal(actionId, ctx);
      if (action) {
        builder.withDo(action);
      }
    }
  }

  return builder;
}

/**
 * Parse a graph with multiple event nodes and return multiple rules.
 * This allows editing multiple rules in a single editor view.
 * 
 * Each Event node in the graph becomes a separate TriggerRule.
 */
export function parseGraphToRules(
  nodes: SDKGraphNode[], 
  edges: SDKGraphEdge[],
  options: GraphParserOptions = {},
  transformers?: GraphParserContext['transformers']
): { rules: TriggerRule[]; errors: string[] } {
  const isEvent = options.isEventNode || defaultIsEventNode;
  
  // Find all event nodes
  const eventNodes = nodes.filter(n => isEvent(n));
  
  if (eventNodes.length === 0) {
    return { 
      rules: [], 
      errors: ['No Event nodes found in the graph'] 
    };
  }
  
  const rules: TriggerRule[] = [];
  const errors: string[] = [];
  
  // Process each event node as a separate rule
  for (const eventNode of eventNodes) {
    try {
      // Create subgraph with just this event node and its descendants
      const eventId = eventNode.id;
      
      // Find all nodes reachable from this event (for graph traversal)
      const reachableNodeIds = new Set<string>([eventId]);
      
      // BFS to find all reachable nodes
      const queue = [eventId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const outgoingEdges = edges.filter(e => e.source === currentId);
        for (const edge of outgoingEdges) {
          if (!reachableNodeIds.has(edge.target)) {
            reachableNodeIds.add(edge.target);
            queue.push(edge.target);
          }
        }
      }
      
      // Filter nodes and edges to only include reachable ones
      const subgraphNodes = nodes.filter(n => reachableNodeIds.has(n.id));
      const subgraphEdges = edges.filter(e => 
        reachableNodeIds.has(e.source) && reachableNodeIds.has(e.target)
      );
      
      // Build the rule for this event
      const builder = parseGraph(subgraphNodes, subgraphEdges, options, transformers);
      const rule = builder.build();
      rules.push(rule);
      
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Failed to parse rule for event ${eventNode.id}: ${msg}`);
    }
  }
  
  return { rules, errors };
}
