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

export const defaultIsEventNode = (n: SDKGraphNode) => n.type === NodeType.EVENT;
export const defaultIsCondNode = (n: SDKGraphNode) => n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP;
export const defaultIsActNode = (n: SDKGraphNode) => n.type === NodeType.ACTION || n.type === NodeType.ACTION_GROUP || n.type === NodeType.DO;

// Check if a node is a DO node
export const defaultIsDoNode = (n: SDKGraphNode) => n.type === NodeType.DO;

// Get the branch type (do or else) from a DO node
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

/**
 * Collect all conditions that belong to a condition group (directly or via chaining).
 * Returns the conditions and the operator of the group.
 */
function collectConditionsForGroup(
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
    
    // Build condition from node data
    const d = condNode.data;
    const condition: RuleCondition = {
      field: d.field || 'data',
      operator: (d.operator as ComparisonOperator) || 'EQ',
      value: d.value !== undefined ? d.value : ''
    };
    conditions.push(condition);
    
    // Follow chaining edges (condition-output or output)
    const chainEdges = ctx.edges.filter(e => 
      e.source === condId && 
      (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === HandleId.CONDITION_OUTPUT_LEGACY) &&
      ctx.nodes.find(n => n.id === e.target && isCond(n))
    );
    for (const edge of chainEdges) {
      collectFromCondition(edge.target);
    }
  }

  // Start from conditions directly connected to the group
  const directEdges = ctx.edges.filter(e => 
    e.source === groupId && 
    e.sourceHandle?.startsWith(HandleId.CONDITION_GROUP_OUTPUT) &&
    ctx.nodes.find(n => n.id === e.target && isCond(n))
  );
  
  for (const edge of directEdges) {
    collectFromCondition(edge.target);
  }

  return { conditions, operator };
}

/**
 * Collect all actions that belong to an action group (directly or via chaining).
 * Returns the actions and the mode of the group.
 */
function collectActionsForGroup(
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
    
    // Build action from node data
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
    
    // Follow chaining edges (action-output or action-group-output for backward compatibility)
    const chainEdges = ctx.edges.filter(e => 
      e.source === actionId && 
      (e.sourceHandle === HandleId.ACTION_OUTPUT || e.sourceHandle === HandleId.ACTION_OUTPUT_LEGACY) &&
      ctx.nodes.find(n => n.id === e.target && isAct(n))
    );
    for (const edge of chainEdges) {
      collectFromAction(edge.target);
    }
  }

  // Start from actions directly connected to the group
  // Support both action-output and action-group-output handles
  const directEdges = ctx.edges.filter(e => 
    e.source === groupId && 
    (e.sourceHandle === HandleId.ACTION_OUTPUT || e.sourceHandle === HandleId.ACTION_OUTPUT_LEGACY) &&
    ctx.nodes.find(n => n.id === e.target && isAct(n))
  );
  
  for (const edge of directEdges) {
    collectFromAction(edge.target);
  }

  return { actions, mode };
}

/**
 * Check if a DO node has a Condition connected via DO_CONDITION_OUTPUT handle.
 * If so, build an inline conditional action.
 * This supports "after do allow conditions" feature.
 * 
 * NEW: Also handles the case where a condition connects to DO nodes (then/else branches)
 * and we need to build an inline conditional from the condition + DO branch actions.
 */
function resolveDoInlineCondition(
  doNodeId: string,
  ctx: GraphParserContext,
  sourceConditionId?: string // The condition that connects to this DO node
): { inlineCondition?: InlineConditionalAction; actionId?: string } | null {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const isAct = ctx.options.isActNode || defaultIsActNode;
  const isDo = (n: SDKGraphNode) => n.type === NodeType.DO;
  const getDoBranchType = (n: SDKGraphNode): BranchType => n.data?.branchType === BranchType.ELSE ? BranchType.ELSE : BranchType.DO;
  
  // Find condition connected via DO_CONDITION_OUTPUT
  const conditionEdge = ctx.edges.find(e => 
    e.source === doNodeId && 
    e.sourceHandle === HandleId.DO_CONDITION_OUTPUT &&
    ctx.nodes.find(n => n.id === e.target && isCond(n))
  );
  
  // If we have a source condition (the condition that connects to this DO node),
  // we should use that condition instead of the one after the DO
  let conditionToUse: string | undefined;
  
  if (sourceConditionId) {
    // Use the source condition that connects to this DO node
    conditionToUse = sourceConditionId;
  } else if (conditionEdge) {
    // Fall back to the condition after the DO node (legacy behavior)
    conditionToUse = conditionEdge.target;
  }
  
  if (!conditionToUse) {
    return null; // No inline condition
  }
  
  // Get the condition from the condition node
  // Note: We need to temporarily clear visitedConds because the condition might have been
  // visited during findTerminalActions traversal but we still need to resolve it for the inline case
  const savedVisited = new Set(ctx.visitedConds);
  ctx.visitedConds.clear();
  const condition = resolveCondition(conditionToUse, ctx);
  ctx.visitedConds = savedVisited;
  if (!condition) {
    return null;
  }
  
  // Find terminal actions for this condition
  let { thenActionId, elseActionId } = findTerminalActions(conditionToUse, ctx);
  
  // If we have a source condition, also check for DO nodes connected from that condition
  // that might provide then/else actions (handles then/else branch DO nodes)
  if (sourceConditionId) {
    // Find all DO nodes connected from the source condition
    const doEdgesFromCondition = ctx.edges.filter(e =>
      e.source === sourceConditionId &&
      (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === 'output' || !e.sourceHandle) &&
      ctx.nodes.find(n => n.id === e.target && isDo(n))
    );
    
    for (const doEdge of doEdgesFromCondition) {
      const doNode = ctx.nodes.find(n => n.id === doEdge.target);
      if (!doNode || !isDo(doNode)) continue;
      
      const branchType = getDoBranchType(doNode);
      
      // Find actions connected from this DO node
      const doToActionEdges = ctx.edges.filter(e =>
        e.source === doNode.id &&
        (e.sourceHandle === HandleId.DO_OUTPUT || !e.sourceHandle) &&
        ctx.nodes.find(n => n.id === e.target && isAct(n))
      );
      
      for (const actionEdge of doToActionEdges) {
        if (branchType === BranchType.ELSE) {
          // This is an else branch
          if (!elseActionId) {
            elseActionId = actionEdge.target;
          }
        } else {
          // This is a then/do branch
          if (!thenActionId) {
            thenActionId = actionEdge.target;
          }
        }
      }
    }
  }
  
  // If no else action found yet, check if the DO node has a direct do-condition-output to an action
  // This handles the case where do-condition-output goes directly to an action (not through a condition)
  const sourceDoNodeId = doNodeId;
  const directDoConditionToAction = ctx.edges.find(e =>
    e.source === sourceDoNodeId &&
    e.sourceHandle === HandleId.DO_CONDITION_OUTPUT &&
    isAct(ctx.nodes.find(n => n.id === e.target)!)
  );
  
  if (directDoConditionToAction && !elseActionId) {
    elseActionId = directDoConditionToAction.target;
  }
  
  const thenAction = thenActionId ? resolveAction(thenActionId, ctx) : undefined;
  const elseAction = elseActionId ? resolveAction(elseActionId, ctx) : undefined;
  
  // Build inline conditional action
  // Note: Only use 'do' property, not both 'do' and 'then' since they are aliases
  const inlineCondition: InlineConditionalAction = {
    if: condition,
    do: thenAction ?? undefined,
    else: elseAction ?? undefined
  };
  
  return { inlineCondition };
}

/**
 * Find the terminal condition(s) in a condition chain (where actions connect).
 * Returns then/else action IDs.
 */
function findTerminalActions(
  startConditionId: string,
  ctx: GraphParserContext
): { thenActionId?: string; elseActionId?: string } {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const isAct = ctx.options.isActNode || defaultIsActNode;
  const isDo = (n: SDKGraphNode) => n.type === NodeType.DO;
  const getDoBranchType = (n: SDKGraphNode): BranchType => n.data?.branchType === BranchType.ELSE ? BranchType.ELSE : BranchType.DO;
  
  let thenActionId: string | undefined;
  let elseActionId: string | undefined;
  
  function traverse(condId: string) {
    const condNode = ctx.nodes.find(n => n.id === condId);
    if (!condNode || !isCond(condNode)) return;
    
    // Check for action connections from this condition
    // If sourceHandle is not specified, treat all edges from this condition as then-output
    const actionEdges = ctx.edges.filter(e => 
      e.source === condId && 
      (!e.sourceHandle || e.sourceHandle === HandleId.THEN_OUTPUT || e.sourceHandle === HandleId.ELSE_OUTPUT || e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === HandleId.CONDITION_OUTPUT_LEGACY || e.sourceHandle === HandleId.DO_OUTPUT)
    );
    
    for (const edge of actionEdges) {
      const targetNode = ctx.nodes.find(n => n.id === edge.target);
      if (!targetNode) continue;
      
      // Handle DO nodes - they are intermediaries for then/else paths
      if (isDo(targetNode)) {
        // Find the action connected to this DO node
        // Accept both DO_OUTPUT handle and legacy edges without handle
        const doToActionEdges = ctx.edges.filter(e => 
          e.source === targetNode.id &&
          (e.sourceHandle === HandleId.DO_OUTPUT || !e.sourceHandle) &&
          isAct(ctx.nodes.find(n => n.id === e.target)!)
        );
        
        const branchType = getDoBranchType(targetNode);
        for (const doEdge of doToActionEdges) {
          if (branchType === 'else') {
            elseActionId = doEdge.target;
          } else {
            thenActionId = doEdge.target;
          }
        }
        
        // Also check for DO -> Condition OR DO -> Action connections (inline conditionals - "after do allow conditions")
        // DO -> Condition: inline condition that evaluates to then/else actions
        // DO -> Action: direct else action from the inline condition
        const allDoEdges = ctx.edges.filter(e => 
          e.source === targetNode.id && 
          e.sourceHandle === HandleId.DO_CONDITION_OUTPUT
        );
        
        // Check if the do-condition-output goes to a condition (inline conditional) or an action (direct else)
        const doToConditionEdge = allDoEdges.find(e => isCond(ctx.nodes.find(n => n.id === e.target)!));
        const doToActionEdge = allDoEdges.find(e => isAct(ctx.nodes.find(n => n.id === e.target)!));
        
        if (doToActionEdge && !elseActionId) {
          // Direct else action - do-condition-output goes directly to an action
          elseActionId = doToActionEdge.target;
        } else if (doToConditionEdge) {
          // Inline conditional - do-condition-output goes to a condition
          // This will be handled by resolveDoInlineCondition in the main flow
        }
        
        if (doToConditionEdge) {
          // Find the inline condition and its actions
          // Note: We don't need to call findTerminalActions here because the main flow
          // will handle inline conditions via resolveDoInlineCondition
          // The inline condition will be properly converted to an InlineConditionalAction there
        }
        continue;
      }
      
      // Regular action nodes
      if (!isAct(targetNode)) continue;
      
      // Check if this is an else path by looking at the sourceHandle
      if (edge.sourceHandle === HandleId.ELSE_OUTPUT) {
        // This is an else action
        elseActionId = edge.target;
      } else {
        // then-output, condition-output, output (implicit then), or DO_OUTPUT
        thenActionId = edge.target;
      }
    }
    
    // Follow chain to other conditions
    const chainEdges = ctx.edges.filter(e => 
      e.source === condId && 
      (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === HandleId.CONDITION_OUTPUT_LEGACY) &&
      ctx.nodes.find(n => n.id === e.target && isCond(n))
    );
    
    for (const edge of chainEdges) {
      traverse(edge.target);
    }
  }
  
  traverse(startConditionId);
  return { thenActionId, elseActionId };
}

export function parseGraph(
  nodes: SDKGraphNode[], 
  edges: SDKGraphEdge[],
  options: GraphParserOptions = {},
  transformers?: GraphParserContext['transformers']
): RuleBuilder {
  const builder = new RuleBuilder();
  
  // Apply optimization options if provided
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
  
  // Separate condition groups, conditions, action groups, and actions
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
      // Create condition group with collected conditions
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
      let elseAct: Action | ActionGroup | null = null;
      
      // Helper function to find all DO nodes reachable from a condition (including through chaining)
      function findDoNodesFromCondition(startCondId: string): string[] {
        const doNodeIds: string[] = [];
        const visited = new Set<string>();
        
        function traverse(condId: string) {
          if (visited.has(condId)) return;
          visited.add(condId);
          
          // Find DO nodes directly connected to this condition
          const directDoEdges = ctx.edges.filter(e =>
            e.source === condId &&
            (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === 'output' || !e.sourceHandle) &&
            ctx.nodes.find(n => n.id === e.target && n.type === NodeType.DO)
          );
          for (const edge of directDoEdges) {
            doNodeIds.push(edge.target);
          }
          
          // Follow condition chain edges
          const chainEdges = ctx.edges.filter(e =>
            e.source === condId &&
            (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === HandleId.CONDITION_OUTPUT_LEGACY) &&
            ctx.nodes.find(n => n.id === e.target && isCond(n))
          );
          for (const edge of chainEdges) {
            traverse(edge.target);
          }
        }
        
        traverse(startCondId);
        return doNodeIds;
      }
      
      for (const condId of conditionIdsInGroup) {
        // Find all DO nodes reachable from this condition (including through chaining)
        const doNodeIds = findDoNodesFromCondition(condId);
        
        // Check each DO node for inline conditions first
        for (const doNodeId of doNodeIds) {
          // Pass the source condition ID so resolveDoInlineCondition can use it
          const inlineResult = resolveDoInlineCondition(doNodeId, ctx, condId);
          if (inlineResult?.inlineCondition && !thenAct) {
            // This DO node has an inline condition - use it directly as the then action
            // The inline conditional already has its own if/then/else from the DO -> Condition chain
            thenAct = inlineResult.inlineCondition as Action;
            
            // Also get else action from DO_OUTPUT if available
            const doOutputEdge = ctx.edges.find(e =>
              e.source === doNodeId &&
              e.sourceHandle === HandleId.DO_OUTPUT &&
              ctx.nodes.find(n => n.id === e.target && isAct(n))
            );
            if (doOutputEdge && !elseAct) {
              const resolvedElseAct = resolveAction(doOutputEdge.target, ctx);
              if (resolvedElseAct) elseAct = resolvedElseAct;
            }
          }
        }
        
        // Also check for regular terminal actions (if no inline condition was found)
        const { thenActionId, elseActionId } = findTerminalActions(condId, ctx);
        
        if (thenActionId && !thenAct) {
          const resolvedThenAct = resolveAction(thenActionId, ctx);
          if (resolvedThenAct) thenAct = resolvedThenAct;
        }
        
        if (elseActionId && !elseAct) {
          const resolvedElseAct = resolveAction(elseActionId, ctx);
          if (resolvedElseAct) elseAct = resolvedElseAct;
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
    // Build condition chain from root conditions
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
    
    // Check if then/else actions are ActionGroups
    let thenAct = thenActionId ? resolveAction(thenActionId, ctx) : null;
    let elseAct = elseActionId ? resolveAction(elseActionId, ctx) : null;
    
    // Check for DO -> Condition connections (inline conditionals - "after do allow conditions")
    // For each condition that connects to a DO node, check if that DO has an inline condition
    for (const condId of rootConditions) {
      const doEdges = ctx.edges.filter(e =>
        e.source === condId &&
        (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === 'output' || !e.sourceHandle) &&
        ctx.nodes.find(n => n.id === e.target && n.type === NodeType.DO)
      );
      
      for (const doEdge of doEdges) {
        // Pass the source condition ID so resolveDoInlineCondition can use it
        const inlineResult = resolveDoInlineCondition(doEdge.target, ctx, condId);
        if (inlineResult?.inlineCondition) {
          // This DO node has an inline condition - use it directly as the then action
          // The inline conditional already has its own if/then/else from the DO -> Condition chain
          thenAct = inlineResult.inlineCondition as Action;
        }
      }
    }
    
    if (thenAct) {
      builder.withDo(thenAct);
    }
    
    if (elseAct) {
      builder.elseRule(elseAct);
    }
    
    // Also check for ActionGroup connections directly from conditions
    // This handles Condition → ActionGroup connections
    for (const condId of rootConditions) {
      const actionGroupEdges = ctx.edges.filter(e => 
        e.source === condId && 
        (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === 'condition-output' || e.sourceHandle === 'output' || !e.sourceHandle) &&
        ctx.nodes.find(n => n.id === e.target && n.type === 'action_group')
      );
      
      for (const agEdge of actionGroupEdges) {
        const { actions, mode } = collectActionsForGroup(agEdge.target, ctx);
        if (actions.length > 0) {
          const actionGroup: ActionGroup = { mode, actions };
          // Add as do action (could be multiple)
          if (!thenActionId) {
            builder.withDo(actionGroup);
          }
        }
      }
    }
  }

  // Process action groups
  // Action groups can now be connected to conditions for inline conditionals
  if (rootActionGroups.length > 0) {
    for (const groupId of rootActionGroups) {
      // Check if this ActionGroup is connected to a Condition (inline conditional)
      // Support condition-output handle from ActionGroup
      const conditionEdges = ctx.edges.filter(e => 
        e.source === groupId && 
        (e.sourceHandle === HandleId.ACTION_GROUP_CONDITION_OUTPUT || e.sourceHandle === 'condition-output') &&
        ctx.nodes.find(n => n.id === e.target && isCond(n))
      );
      
      if (conditionEdges.length > 0) {
        // This ActionGroup is connected to conditions - build inline conditional
        const actionGroupActions = collectActionsForGroup(groupId, ctx);
        
        for (const condEdge of conditionEdges) {
          const condition = resolveCondition(condEdge.target, ctx);
          if (!condition) continue;
          
          // Find terminal actions for this condition
          const { thenActionId, elseActionId } = findTerminalActions(condEdge.target, ctx);
          
          // Build inline conditional action
          const thenAction = thenActionId ? resolveAction(thenActionId, ctx) : null;
          const elseAction = elseActionId ? resolveAction(elseActionId, ctx) : null;
          
          const inlineConditional: Action = {
            if: condition,
            then: thenAction ?? undefined,
            else: elseAction ?? undefined
          };
          
          // Add to do with the action group
          if (actionGroupActions.actions.length > 0 || inlineConditional.then || inlineConditional.else) {
            const doActions: (Action | ActionGroup)[] = [];
            
            // Add the action group actions first
            if (actionGroupActions.actions.length > 0) {
              doActions.push({ mode: actionGroupActions.mode, actions: actionGroupActions.actions });
            }
            
            // Add inline conditional
            doActions.push(inlineConditional);
            
            if (doActions.length === 1) {
              builder.withDo(doActions[0]!);
            } else {
              builder.withDo(doActions);
            }
          }
        }
      } else {
        // Regular action group without condition connections
        // Only process if no conditions were processed
        if (rootConditionGroups.length === 0 && rootConditions.length === 0) {
          const { actions, mode } = collectActionsForGroup(groupId, ctx);
          
          if (actions.length > 0) {
            const actionGroup: ActionGroup = {
              mode,
              actions
            };
            builder.withDo(actionGroup);
          }
        }
      }
    }
  }

  // Process standalone actions (if nothing else was processed)
  if (rootActions.length > 0 && rootConditionGroups.length === 0 && rootConditions.length === 0 && rootActionGroups.length === 0) {
    const actions: (Action | ActionGroup)[] = [];
    
    for (const actionId of rootActions) {
      const action = resolveAction(actionId, ctx);
      if (action) actions.push(action);
    }
    
    if (actions.length === 1) {
      builder.withDo(actions[0]!);
    } else if (actions.length > 1) {
      builder.withDo(actions);
    }
  }

  // If nothing was processed, throw error
  if (!builder['rule'].if && !builder['rule'].do) {
    throw new Error("No valid conditions or actions connected to the flow.");
  }

  return builder;
}

// Keep existing helper functions for backward compatibility
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
    // For condition groups, use collectConditionsForGroup
    const { conditions, operator } = collectConditionsForGroup(id, ctx);
    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;
    return { operator, conditions };
  } else {
    // Regular condition
    const d = node.data;
    let condition: RuleCondition = {
      field: d.field || 'data',
      operator: (d.operator as ComparisonOperator) || 'EQ',
      value: d.value !== undefined ? d.value : ''
    };
    
    // Apply condition transformer if provided
    if (ctx.transformers?.condition) {
      const transformed = ctx.transformers.condition(condition, node);
      if (transformed === null) return null;
      condition = transformed;
    }
    
    // Check for chained conditions
    const chainEdges = ctx.edges.filter(e => 
      e.source === id && 
      (e.sourceHandle === HandleId.CONDITION_OUTPUT || e.sourceHandle === 'condition-output' || e.sourceHandle === 'output') &&
      ctx.nodes.find(n => n.id === e.target && isCond(n))
    );
    
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
}

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
    // For action groups, use collectActionsForGroup
    const { actions, mode } = collectActionsForGroup(id, ctx);
    if (actions.length === 0) return null;
    if (actions.length === 1 && mode === 'ALL') return actions[0]!;
    return { mode, actions };
  } else {
    // Regular action
    const d = node.data;
    let params = {};
    try {
      params = d.params ? (typeof d.params === 'string' ? JSON.parse(d.params) : d.params) : {};
    } catch { params = {}; }
    
    let action: Action = {
      type: d.type || 'log',
      params
    };
    
    // Apply action transformer if provided
    if (ctx.transformers?.action) {
      const transformed = ctx.transformers.action(action, node);
      if (transformed === null) return null;
      action = transformed as Action;
    }
    
    // Check for chained actions
    const chainEdges = ctx.edges.filter(e => 
      e.source === id && 
      e.sourceHandle === 'action-output' &&
      ctx.nodes.find(n => n.id === e.target && isAct(n))
    );
    
    if (chainEdges.length > 0) {
      const children = chainEdges
        .map(e => resolveAction(e.target, ctx))
        .filter((a): a is Action | ActionGroup => a !== null);
      
      if (children.length > 0) {
        return { mode: 'ALL', actions: [action, ...children] };
      }
    }
    
    return action;
  }
}
