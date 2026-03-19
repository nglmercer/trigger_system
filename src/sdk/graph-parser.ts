import { RuleBuilder, type OptimizeOptions } from './builder';
import { HandleId, BranchType, NodeType, ConditionOperator } from './constants';
import type { InlineConditionalAction } from '../types';
import type {
  TriggerRule,
  RuleCondition,
  Action,
  ActionGroup,
  ComparisonOperator,
  ExecutionMode,
  SDKGraphNode,
  SDKGraphEdge
} from '../types';

export interface GraphParserOptions {
  isEventNode?: (n: SDKGraphNode) => boolean;
  isCondNode?: (n: SDKGraphNode) => boolean;
  isActNode?: (n: SDKGraphNode) => boolean;
  extractEventData?: (n: SDKGraphNode) => Partial<TriggerRule>;
  resolveCondition?: (id: string, ctx: GraphParserContext) => RuleCondition | null;
  resolveAction?: (id: string, ctx: GraphParserContext) => Action | ActionGroup | null;
  /**
   * Options to control deduplication behavior.
   * Use this to keep intentional duplicates (for templates) or use uniqueIdField
   * to differentiate items that should not be merged.
   */
  optimizeOptions?: OptimizeOptions;
}

export interface GraphParserContext {
  nodes: SDKGraphNode[];
  edges: SDKGraphEdge[];
  visitedConds: Set<string>;
  visitedActs: Set<string>;
  options: GraphParserOptions;
  transformers?: {
    condition?: (cond: RuleCondition, node: SDKGraphNode) => RuleCondition | null;
    action?: (act: Action | ActionGroup, node: SDKGraphNode) => Action | ActionGroup | null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createParserContext(
  nodes: SDKGraphNode[], 
  edges: SDKGraphEdge[],
  options: GraphParserOptions = {},
  transformers?: GraphParserContext['transformers']
): GraphParserContext {
  return { 
    nodes, 
    edges, 
    visitedConds: new Set(), 
    visitedActs: new Set(), 
    options,
    transformers 
  };
}

// ============================================================================
// Default Type Checkers
// ============================================================================

export const defaultIsEventNode = (n: SDKGraphNode) => n.type === NodeType.EVENT;
export const defaultIsCondNode = (n: SDKGraphNode) => n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP;
export const defaultIsActNode = (n: SDKGraphNode) => n.type === NodeType.ACTION || n.type === NodeType.ACTION_GROUP || n.type === NodeType.DO;
export const defaultIsDoNode = (n: SDKGraphNode) => n.type === NodeType.DO;

export const defaultGetDoBranchType = (n: SDKGraphNode): BranchType => {
  return n.data?.branchType === BranchType.ELSE ? BranchType.ELSE : BranchType.DO;
};

export function defaultExtractEventData(n: SDKGraphNode): Partial<TriggerRule> {
  const d = n.data || {};
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

// ============================================================================
// Graph Traversal Utilities
// ============================================================================

/**
 * Find edges matching a specific source node and handle
 */
function findEdgesBySource(
  ctx: GraphParserContext,
  sourceId: string,
  handles: string[]
): SDKGraphEdge[] {
  return ctx.edges.filter(e => 
    e.source === sourceId && 
    handles.includes(e.sourceHandle || '')
  );
}

/**
 * Find all nodes of a specific type connected from a source node
 */
function findConnectedNodes<T extends SDKGraphNode>(
  ctx: GraphParserContext,
  sourceId: string,
  handles: string[],
  typeFilter: (node: SDKGraphNode) => boolean
): T[] {
  return findEdgesBySource(ctx, sourceId, handles)
    .map(e => ctx.nodes.find(n => n.id === e.target))
    .filter((n): n is T => n !== undefined && typeFilter(n));
}

/**
 * Get the branch type for a DO node
 */
function getDoBranchType(ctx: GraphParserContext, doNode: SDKGraphNode): BranchType {
  return defaultGetDoBranchType(doNode);
}

// ============================================================================
// Condition Collection
// ============================================================================

/**
 * Collect all conditions that belong to a condition group (directly or via chaining).
 * Returns the conditions and the operator of the group.
 */
export function collectConditionsForGroup(
  groupId: string,
  ctx: GraphParserContext
): { conditions: RuleCondition[]; operator: 'AND' | 'OR' } {
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
    if (!condNode || !isCond(condNode) || condNode.type === 'condition_group') return;
    
    const d = condNode.data;
    const condition: RuleCondition = {
      field: d.field || 'data',
      operator: (d.operator as ComparisonOperator) || 'EQ',
      value: d.value !== undefined ? d.value : ''
    };
    conditions.push(condition);
    
    // Follow chaining edges
    const chainEdges = findEdgesBySource(ctx, condId, [HandleId.CONDITION_OUTPUT, HandleId.CONDITION_OUTPUT_LEGACY])
      .filter(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
    
    for (const edge of chainEdges) {
      collectFromCondition(edge.target);
    }
  }

  // Start from conditions directly connected to the group
  const directEdges = findEdgesBySource(ctx, groupId, [HandleId.CONDITION_GROUP_OUTPUT])
    .filter(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
  
  for (const edge of directEdges) {
    collectFromCondition(edge.target);
  }

  return { conditions, operator };
}

// ============================================================================
// Action Collection
// ============================================================================

/**
 * Collect all actions that belong to an action group (directly or via chaining).
 * Returns the actions and the mode of the group.
 */
export function collectActionsForGroup(
  groupId: string,
  ctx: GraphParserContext
): { actions: (Action | ActionGroup)[]; mode: ExecutionMode } {
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
    if (!actionNode || !isAct(actionNode) || actionNode.type === 'action_group') return;
    
    const d = actionNode.data;
    let params = {};
    try {
      params = d.params ? (typeof d.params === 'string' ? JSON.parse(d.params) : d.params) : {};
    } catch { params = {}; }
    
    const action: Action = {
      type: d.type || 'log',
      params
    };
    actions.push(action);
    
    // Follow chaining edges
    const chainEdges = findEdgesBySource(ctx, actionId, [HandleId.ACTION_OUTPUT, HandleId.ACTION_OUTPUT_LEGACY])
      .filter(e => isAct(ctx.nodes.find(n => n.id === e.target)!));
    
    for (const edge of chainEdges) {
      collectFromAction(edge.target);
    }
  }

  // Start from actions directly connected to the group
  const directEdges = findEdgesBySource(ctx, groupId, [HandleId.ACTION_OUTPUT, HandleId.ACTION_OUTPUT_LEGACY])
    .filter(e => isAct(ctx.nodes.find(n => n.id === e.target)!));
  
  for (const edge of directEdges) {
    collectFromAction(edge.target);
  }

  return { actions, mode };
}

// ============================================================================
// Condition Resolution
// ============================================================================

/**
 * Resolve a condition from a condition node ID
 */
export function resolveCondition(id: string, ctx: GraphParserContext): RuleCondition | null {
  if (ctx.options.resolveCondition) {
    return ctx.options.resolveCondition(id, ctx);
  }

  if (ctx.visitedConds.has(id)) return null;
  ctx.visitedConds.add(id);

  const node = ctx.nodes.find(n => n.id === id);
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  if (!node || !isCond(node)) return null;

  if (node.type === 'condition_group') {
    const { conditions, operator } = collectConditionsForGroup(id, ctx);
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;
    return { operator, conditions };
  }

  const d = node.data;
  let condition: RuleCondition = {
    field: d.field || 'data',
    operator: (d.operator as ComparisonOperator) || 'EQ',
    value: d.value !== undefined ? d.value : ''
  };
  
  if (ctx.transformers?.condition) {
    const transformed = ctx.transformers.condition(condition, node);
    if (transformed === null) return null;
    condition = transformed;
  }

  // Check for chained conditions
  const chainEdges = findEdgesBySource(ctx, id, [HandleId.CONDITION_OUTPUT, 'condition-output', 'output'])
    .filter(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
  
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

// ============================================================================
// Action Resolution
// ============================================================================

/**
 * Resolve an action from an action node ID
 */
export function resolveAction(id: string, ctx: GraphParserContext): (Action | ActionGroup) | null {
  if (ctx.options.resolveAction) {
    return ctx.options.resolveAction(id, ctx);
  }

  if (ctx.visitedActs.has(id)) return null;
  ctx.visitedActs.add(id);

  const node = ctx.nodes.find(n => n.id === id);
  const isAct = ctx.options.isActNode || defaultIsActNode;
  if (!node || !isAct(node)) return null;

  if (node.type === 'action_group') {
    const { actions, mode } = collectActionsForGroup(id, ctx);
    if (actions.length === 0) return null;
    return { mode, actions };
  }

  const d = node.data;
  let params = {};
  try {
    params = d.params ? (typeof d.params === 'string' ? JSON.parse(d.params) : d.params) : {};
  } catch { params = {}; }

  const action: Action = {
    type: d.type || 'log',
    params
  };

  if (ctx.transformers?.action) {
    const transformed = ctx.transformers.action(action, node);
    if (transformed === null) return null;
    return transformed;
  }

  return action;
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
          .filter(e => isAct(ctx.nodes.find(n => n.id === e.target)!));
        
        const branchType = getDoBranchType(ctx, targetNode);
        for (const doEdge of doToActionEdges) {
          if (branchType === BranchType.ELSE) {
            elseActionId = doEdge.target;
          } else {
            thenActionId = doEdge.target;
          }
        }
        
        // Check for DO -> Condition OR DO -> Action connections
        const allDoEdges = findEdgesBySource(ctx, targetNode.id, [HandleId.DO_CONDITION_OUTPUT]);
        
        const doToConditionEdge = allDoEdges.find(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
        const doToActionEdge = allDoEdges.find(e => isAct(ctx.nodes.find(n => n.id === e.target)!));
        
        if (doToActionEdge && !elseActionId) {
          elseActionId = doToActionEdge.target;
        }
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
    const chainEdges = findEdgesBySource(ctx, condId, [HandleId.CONDITION_OUTPUT, HandleId.CONDITION_OUTPUT_LEGACY])
      .filter(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
    
    for (const edge of chainEdges) {
      traverse(edge.target);
    }
  }
  
  traverse(startConditionId);
  return { thenActionId, elseActionId };
}

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
    .find(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
  
  // Determine which condition to use
  let conditionToUse: string | undefined;
  
  if (conditionEdge) {
    conditionToUse = conditionEdge.target;
  } else if (sourceConditionId) {
    conditionToUse = sourceConditionId;
  }
  
  if (!conditionToUse) {
    return null;
  }
  
  // Get the condition (clear visited to allow resolution)
  const savedVisited = new Set(ctx.visitedConds);
  ctx.visitedConds.clear();
  const condition = resolveCondition(conditionToUse, ctx);
  ctx.visitedConds = savedVisited;
  
  if (!condition) {
    return null;
  }
  
  // Find terminal actions
  let { thenActionId, elseActionId } = findTerminalActions(conditionToUse, ctx);
  
  // Also check for DO nodes from source condition
  if (sourceConditionId) {
    const doEdgesFromCondition = findEdgesBySource(ctx, sourceConditionId, [HandleId.CONDITION_OUTPUT, 'output', ''])
      .filter(e => isDo(ctx.nodes.find(n => n.id === e.target)!));
    
    for (const doEdge of doEdgesFromCondition) {
      const doNode = ctx.nodes.find(n => n.id === doEdge.target);
      if (!doNode || !isDo(doNode)) continue;
      
      const branchType = getDoBranchType(ctx, doNode);
      
      const doToActionEdges = findEdgesBySource(ctx, doNode.id, [HandleId.DO_OUTPUT, ''])
        .filter(e => {
          const target = ctx.nodes.find(n => n.id === e.target);
          return target && (ctx.options.isActNode?.(target) ?? defaultIsActNode(target));
        });
      
      for (const actionEdge of doToActionEdges) {
        if (branchType === BranchType.ELSE && !elseActionId) {
          elseActionId = actionEdge.target;
        } else if (branchType === BranchType.DO && !thenActionId) {
          thenActionId = actionEdge.target;
        }
      }
    }
  }
  
  // Check for direct do-condition-output to action
  const directToAction = findEdgesBySource(ctx, doNodeId, [HandleId.DO_CONDITION_OUTPUT])
    .find(e => {
      const target = ctx.nodes.find(n => n.id === e.target);
      return target && (ctx.options.isActNode?.(target) ?? defaultIsActNode(target));
    });
  
  if (directToAction && !elseActionId) {
    elseActionId = directToAction.target;
  }
  
  const thenAction = thenActionId ? resolveAction(thenActionId, ctx) : undefined;
  const elseAction = elseActionId ? resolveAction(elseActionId, ctx) : undefined;
  
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
  const directActionEdges = findEdgesBySource(ctx, doNodeId, [HandleId.DO_OUTPUT, ''])
    .filter(e => isAct(ctx.nodes.find(n => n.id === e.target)!));
  
  for (const edge of directActionEdges) {
    const action = resolveAction(edge.target, ctx);
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
// DO Node Categorization
// ============================================================================

/**
 * Categorize DO nodes by their branch type (do vs else)
 */
export function categorizeDoNodesByBranch(
  startConditionId: string,
  ctx: GraphParserContext
): { doBranches: string[]; elseBranches: string[] } {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const isDo = defaultIsDoNode;
  const doBranches: string[] = [];
  const elseBranches: string[] = [];
  const visited = new Set<string>();
  
  function traverse(condId: string) {
    if (visited.has(condId)) return;
    visited.add(condId);
    
    // Find DO nodes directly connected to this condition
    const doEdges = findEdgesBySource(ctx, condId, [HandleId.CONDITION_OUTPUT, 'output', ''])
      .filter(e => isDo(ctx.nodes.find(n => n.id === e.target)!));
    
    for (const edge of doEdges) {
      const doNode = ctx.nodes.find(n => n.id === edge.target);
      if (!doNode) continue;
      
      const branchType = getDoBranchType(ctx, doNode);
      
      if (branchType === BranchType.ELSE) {
        if (!elseBranches.includes(edge.target)) {
          elseBranches.push(edge.target);
        }
      } else {
        if (!doBranches.includes(edge.target)) {
          doBranches.push(edge.target);
        }
      }
    }
    
    // Follow condition chain edges
    const chainEdges = findEdgesBySource(ctx, condId, [HandleId.CONDITION_OUTPUT, HandleId.CONDITION_OUTPUT_LEGACY])
      .filter(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
    
    for (const edge of chainEdges) {
      traverse(edge.target);
    }
  }
  
  traverse(startConditionId);
  
  return { doBranches, elseBranches };
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
    
    if (targetNode.type === 'condition_group') {
      rootConditionGroups.push(edge.target);
    } else if (isCond(targetNode)) {
      rootConditions.push(edge.target);
    } else if (targetNode.type === 'action_group') {
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
        // Categorize DO nodes by branch type
        const { doBranches, elseBranches } = categorizeDoNodesByBranch(condId, ctx);
        
        // Collect actions from do branches
        const doActions: (Action | ActionGroup | InlineConditionalAction)[] = [];
        for (const doNodeId of doBranches) {
          const actions = collectDoActions(doNodeId, ctx, condId);
          doActions.push(...actions);
        }
        
        if (doActions.length > 0) {
          thenAct = doActions.length === 1 
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
          elseAct = elseActions.length === 1 
            ? elseActions[0] as Action | ActionGroup | InlineConditionalAction
            : { mode: 'ALL' as ExecutionMode, actions: elseActions as Action[] };
        }
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
      const condition = resolveCondition(condId, ctx);
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
        : (thenActionId ? resolveAction(thenActionId, ctx) : null);
    
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
        : (elseActionId ? resolveAction(elseActionId, ctx) : null);
    
    if (thenAct) {
      builder.withDo(thenAct);
    }
    
    if (elseAct) {
      builder.elseRule(elseAct);
    }
    
    // Also check for ActionGroup connections directly from conditions
    for (const condId of rootConditions) {
      const actionGroupEdges = findEdgesBySource(ctx, condId, [
        HandleId.CONDITION_OUTPUT, 
        'condition-output', 
        'output', 
        ''
      ]).filter(e => {
        const target = ctx.nodes.find(n => n.id === e.target);
        return target?.type === 'action_group';
      });
      
      for (const agEdge of actionGroupEdges) {
        const { actions, mode } = collectActionsForGroup(agEdge.target, ctx);
        if (actions.length > 0) {
          const actionGroup: ActionGroup = { mode, actions };
          if (!thenActionId) {
            builder.withDo(actionGroup);
          }
        }
      }
    }
  }

  // Process action groups
  if (rootActionGroups.length > 0) {
    for (const groupId of rootActionGroups) {
      const conditionEdges = findEdgesBySource(ctx, groupId, [
        HandleId.ACTION_GROUP_CONDITION_OUTPUT, 
        'condition-output'
      ]).filter(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
      
      if (conditionEdges.length > 0) {
        const actionGroupActions = collectActionsForGroup(groupId, ctx);
        
        for (const condEdge of conditionEdges) {
          const condition = resolveCondition(condEdge.target, ctx);
          if (!condition) continue;
          
          const terminal = findTerminalActions(condEdge.target, ctx);
          
          const inlineConditional: InlineConditionalAction = {
            if: condition,
            do: terminal.thenActionId ? resolveAction(terminal.thenActionId, ctx) ?? undefined : undefined,
            else: terminal.elseActionId ? resolveAction(terminal.elseActionId, ctx) ?? undefined : undefined
          };
          
          builder.withDo(inlineConditional);
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
      const action = resolveAction(actionId, ctx);
      if (action) {
        builder.withDo(action);
      }
    }
  }

  return builder;
}
