import { RuleBuilder, type OptimizeOptions } from './builder';
import { HandleId, BranchType, NodeType, ConditionOperator } from './constants';
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
        const doToActionEdges = ctx.edges.filter(e => 
          e.source === targetNode.id &&
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
        continue;
      }
      
      // Regular action nodes
      if (!isAct(targetNode)) continue;
      
      if (edge.sourceHandle === HandleId.ELSE_OUTPUT || edge.sourceHandle === HandleId.DO_OUTPUT) {
        // Check if it's actually an else by looking at the branchType of the DO node
        const targetDoNode = ctx.nodes.find(n => n.id === edge.target);
        if (targetDoNode?.data?.branchType === BranchType.ELSE) {
          elseActionId = edge.target;
        } else {
          thenActionId = edge.target;
        }
      } else {
        // then-output, condition-output, or output (implicit then)
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
      
      // Find terminal actions for this condition group
      // We need to find actions connected to any condition in the group
      // For simplicity, we'll check the first condition's terminal actions
      // In a real implementation, you'd need to track which condition connects to actions
      const firstConditionId = ctx.edges.find(e => 
        e.source === groupId && 
        e.sourceHandle?.startsWith('cond')
      )?.target;
      
      if (firstConditionId) {
        const { thenActionId, elseActionId } = findTerminalActions(firstConditionId, ctx);
        
        if (thenActionId) {
          const thenAct = resolveAction(thenActionId, ctx);
          if (thenAct) builder.withDo(thenAct);
        }
        
        if (elseActionId) {
          const elseAct = resolveAction(elseActionId, ctx);
          if (elseAct) builder.elseRule(elseAct);
        }
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
    const thenAct = thenActionId ? resolveAction(thenActionId, ctx) : null;
    const elseAct = elseActionId ? resolveAction(elseActionId, ctx) : null;
    
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
