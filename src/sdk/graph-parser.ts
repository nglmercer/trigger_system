import { RuleBuilder, type OptimizeOptions } from './builder';
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

export const defaultIsEventNode = (n: SDKGraphNode) => n.type === 'event';
export const defaultIsCondNode = (n: SDKGraphNode) => n.type === 'condition' || n.type === 'condition_group';
export const defaultIsActNode = (n: SDKGraphNode) => n.type === 'action' || n.type === 'action_group';

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
  if (!groupNode || groupNode.type !== 'condition_group') {
    return { conditions: [], operator: 'AND' };
  }

  const operator = (groupNode.data.operator || 'AND') as 'AND' | 'OR';
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
    
    // Follow chaining edges (condition-output)
    const chainEdges = ctx.edges.filter(e => 
      e.source === condId && 
      e.sourceHandle === 'condition-output' &&
      ctx.nodes.find(n => n.id === e.target && isCond(n))
    );
    for (const edge of chainEdges) {
      collectFromCondition(edge.target);
    }
  }

  // Start from conditions directly connected to the group
  const directEdges = ctx.edges.filter(e => 
    e.source === groupId && 
    e.sourceHandle?.startsWith('cond') &&
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
  if (!groupNode || groupNode.type !== 'action_group') {
    return { actions: [], mode: 'ALL' };
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
    
    // Follow chaining edges (action-output)
    const chainEdges = ctx.edges.filter(e => 
      e.source === actionId && 
      e.sourceHandle === 'action-output' &&
      ctx.nodes.find(n => n.id === e.target && isAct(n))
    );
    for (const edge of chainEdges) {
      collectFromAction(edge.target);
    }
  }

  // Start from actions directly connected to the group
  const directEdges = ctx.edges.filter(e => 
    e.source === groupId && 
    e.sourceHandle?.startsWith('action') &&
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
  
  let thenActionId: string | undefined;
  let elseActionId: string | undefined;
  
  function traverse(condId: string) {
    const condNode = ctx.nodes.find(n => n.id === condId);
    if (!condNode || !isCond(condNode)) return;
    
    // Check for action connections from this condition
    const actionEdges = ctx.edges.filter(e => 
      e.source === condId && 
      (e.sourceHandle === 'then-output' || e.sourceHandle === 'else-output' || e.sourceHandle === 'condition-output')
    );
    
    for (const edge of actionEdges) {
      const targetNode = ctx.nodes.find(n => n.id === edge.target);
      if (!targetNode || !isAct(targetNode)) continue;
      
      if (edge.sourceHandle === 'else-output') {
        elseActionId = edge.target;
      } else {
        // then-output or condition-output (implicit then)
        thenActionId = edge.target;
      }
    }
    
    // Follow chain to other conditions
    const chainEdges = ctx.edges.filter(e => 
      e.source === condId && 
      e.sourceHandle === 'condition-output' &&
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
    
    if (thenActionId) {
      const thenAct = resolveAction(thenActionId, ctx);
      if (thenAct) builder.withDo(thenAct);
    }
    
    if (elseActionId) {
      const elseAct = resolveAction(elseActionId, ctx);
      if (elseAct) builder.elseRule(elseAct);
    }
  }

  // Process action groups (if no conditions were processed)
  if (rootActionGroups.length > 0 && rootConditionGroups.length === 0 && rootConditions.length === 0) {
    for (const groupId of rootActionGroups) {
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
    const condition: RuleCondition = {
      field: d.field || 'data',
      operator: (d.operator as ComparisonOperator) || 'EQ',
      value: d.value !== undefined ? d.value : ''
    };
    
    // Check for chained conditions
    const chainEdges = ctx.edges.filter(e => 
      e.source === id && 
      e.sourceHandle === 'condition-output' &&
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
    
    const action: Action = {
      type: d.type || 'log',
      params
    };
    
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
