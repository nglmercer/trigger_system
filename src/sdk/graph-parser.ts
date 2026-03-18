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

export function resolveCondition(id: string, ctx: GraphParserContext): RuleCondition | null {
  if (ctx.options.resolveCondition) {
    return ctx.options.resolveCondition(id, ctx);
  }

  if (ctx.visitedConds.has(id)) return null; // Prevent cycles
  ctx.visitedConds.add(id);

  const node = ctx.nodes.find(n => n.id === id);
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  if (!node || !isCond(node)) return null;

  let result: RuleCondition | null = null;

  if (node.type === 'condition') {
    const d = node.data;
    const res: RuleCondition = { 
      field: d.field || 'data', 
      operator: (d.operator as ComparisonOperator) || 'EQ', 
      value: d.value !== undefined ? d.value : '' 
    };

    // Condition nodes don't typically chain into other conditions directly in this builder map, 
    // but if they do, we treat them as AND.
    const condChildrenEdges = ctx.edges.filter(e => e.source === id && isCond(ctx.nodes.find(n => n.id === e.target)!));
    const children = condChildrenEdges.map(e => resolveCondition(e.target, ctx)).filter((c): c is RuleCondition => c !== null);

    if (children.length > 0) {
      result = { operator: 'AND', conditions: [res, ...children] };
    } else {
      result = res;
    }
  } else {
    const d = node.data;
    // Condition group branches are labeled with handles containing 'cond'
    const condChildrenEdges = ctx.edges.filter(e => e.source === id && e.sourceHandle?.startsWith('cond') && isCond(ctx.nodes.find(n => n.id === e.target)!));
    const children = condChildrenEdges.map(e => resolveCondition(e.target, ctx)).filter((c): c is RuleCondition => c !== null);
    
    if (children.length > 0) {
      result = { operator: (d.operator || 'AND') as 'AND' | 'OR', conditions: children };
    }
  }

  if (result && ctx.transformers?.condition) {
    return ctx.transformers.condition(result, node);
  }

  return result;
}

export function resolveAction(id: string, ctx: GraphParserContext): (Action | ActionGroup) | null {
  if (ctx.options.resolveAction) {
    return ctx.options.resolveAction(id, ctx);
  }

  if (ctx.visitedActs.has(id)) return null; // Prevent cycles
  ctx.visitedActs.add(id);

  const node = ctx.nodes.find(n => n.id === id);
  const isAct = ctx.options.isActNode || defaultIsActNode;
  if (!node || !isAct(node)) return null;

  let result: Action | ActionGroup | null = null;

  let params = {}; 
  try { 
    params = node.data.params ? (typeof node.data.params === 'string' ? JSON.parse(node.data.params) : node.data.params) : {}; 
  } catch { params = {}; }

  if (node.type === 'action') {
    // Build base action
    const baseAction: Action = { type: node.data.type || 'log', params };
    
    // Check if this action is connected from a Condition's then/else output
    const parentCondEdge = ctx.edges.find(e => 
      e.target === id && 
      (e.sourceHandle === 'then-output' || e.sourceHandle === 'else-output')
    );
    
    if (parentCondEdge) {
      // This action is part of a conditional branch - it will be processed by the condition
      // Just return the base action without children
      result = baseAction;
    } else {
      // Regular action - handle children (chaining)
      const childrenEdges = ctx.edges.filter(e => 
        e.source === id && 
        isAct(ctx.nodes.find(n => n.id === e.target)!)
      );
      const children = childrenEdges.map(e => resolveAction(e.target, ctx)).filter((a): a is Action | ActionGroup => a !== null);
      
      if (children.length > 0) {
        result = { mode: 'ALL', actions: [baseAction, ...children] };
      } else {
        result = baseAction;
      }
    }
  } else {
    const childrenEdges = ctx.edges.filter(e => e.source === id && isAct(ctx.nodes.find(n => n.id === e.target)!));
    const children = childrenEdges.map(e => resolveAction(e.target, ctx)).filter((a): a is Action | ActionGroup => a !== null);
    
    if (children.length > 0) {
      result = { mode: (node.data.mode || 'ALL') as ExecutionMode, actions: children };
    }
  }

  if (result && ctx.transformers?.action) {
    return ctx.transformers.action(result, node);
  }

  return result;
}

// Build conditional action from a ConditionNode with implicit THEN (condition-output) and explicit ELSE (else-output)
function buildConditionalAction(condNodeId: string, ctx: GraphParserContext): Action | null {
  const isCond = ctx.options.isCondNode || defaultIsCondNode;
  const isAct = ctx.options.isActNode || defaultIsActNode;
  
  const condNode = ctx.nodes.find(n => n.id === condNodeId);
  if (!condNode || !isCond(condNode)) return null;
  
  // Get the condition
  const condition = resolveCondition(condNodeId, ctx);
  if (!condition) return null;
  
  // Build conditional action base
  const conditionalAction: Action = { if: condition };
  
  // Find implicit THEN branch (actions connected via condition-output)
  const thenEdges = ctx.edges.filter(e => 
    e.source === condNodeId && e.sourceHandle === 'condition-output' && isAct(ctx.nodes.find(n => n.id === e.target)!)
  );
  
  if (thenEdges.length > 0) {
    const thenActs = thenEdges.map(e => {
      const act = resolveAction(e.target, ctx);
      if (act) ctx.visitedActs.add(e.target);
      return act;
    }).filter((a): a is Action | ActionGroup => a !== null);
    
    if (thenActs.length === 1) {
      conditionalAction.then = thenActs[0]!;
    } else if (thenActs.length > 1) {
      conditionalAction.then = { mode: 'ALL', actions: thenActs };
    }
  }
  
  // Find explicit ELSE branch (actions connected via else-output)
  const elseEdges = ctx.edges.filter(e => 
    e.source === condNodeId && e.sourceHandle === 'else-output'
  );
  
  if (elseEdges.length > 0) {
    const elseActs = elseEdges.map(e => {
      const act = resolveAction(e.target, ctx);
      if (act) ctx.visitedActs.add(e.target);
      return act;
    }).filter((a): a is Action | ActionGroup => a !== null);
    
    if (elseActs.length === 1) {
      conditionalAction.else = elseActs[0]!;
    } else if (elseActs.length > 1) {
      conditionalAction.else = { mode: 'ALL', actions: elseActs };
    }
  }
  
  // Mark condition as visited
  ctx.visitedConds.add(condNodeId);
  
  return conditionalAction;
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

  // Find root conditions (connected directly from event)
  const rootCondEdges = edges.filter(e => e.source === eventNode.id && isCond(ctx.nodes.find(n => n.id === e.target)!));
  
  // Trace condition chains to find terminal conditions (those that have action outputs)
  const terminalConditions: Array<{
    condChain: string[];  // Chain of condition IDs from root to terminal
    thenActionId?: string;  // Action via condition-output
    elseActionId?: string;  // Action via else-output
  }> = [];
  
  function traceConditionChain(currentId: string, chain: string[]) {
    // Always include currentId in the chain from the start
    const newChain = chain.includes(currentId) ? [...chain] : [...chain, currentId];
    const condEdges = edges.filter(e => e.source === currentId);
    
    // DEBUG: Log the edges found
    console.log(`[DEBUG] traceConditionChain: currentId=${currentId}, newChain=[${newChain.join(',')}], found ${condEdges.length} edges`);
    
    let hasConditionOutput = false;
    let foundActionOutput = false;
    
    for (const edge of condEdges) {
      const tgtNode = ctx.nodes.find(n => n.id === edge.target);
      if (!tgtNode) continue;
      
      // DEBUG: Log each edge
      console.log(`[DEBUG]   edge: source=${edge.source}, target=${edge.target}, sourceHandle=${edge.sourceHandle}, targetType=${tgtNode.type}`);
      
      if (isCond(tgtNode) && edge.sourceHandle === 'condition-output') {
        // Continue tracing the chain
        hasConditionOutput = true;
        traceConditionChain(edge.target, newChain);
      } else if (isAct(tgtNode)) {
        // Found action output - this is a terminal condition
        foundActionOutput = true;
        // Find existing terminal condition with the same chain root
        const rootCondId = newChain[0]!;
        const existing = terminalConditions.find(tc => tc.condChain[0] === rootCondId);
        
        // DEBUG: Log terminal condition handling
        console.log(`[DEBUG]   -> Action found! rootCondId=${rootCondId}, existing=${existing ? 'yes' : 'no'}, sourceHandle=${edge.sourceHandle}`);
        
        if (existing) {
          // Add to existing terminal (multiple handles from same condition)
          if (edge.sourceHandle === 'else-output') {
            existing.elseActionId = edge.target;
            console.log(`[DEBUG]   -> Added elseActionId=${edge.target} to existing terminal`);
          } else {
            existing.thenActionId = edge.target;
            console.log(`[DEBUG]   -> Added thenActionId=${edge.target} to existing terminal`);
          }
        } else {
          const newTerminal = {
            condChain: newChain,
            thenActionId: edge.sourceHandle !== 'else-output' ? edge.target : undefined,
            elseActionId: edge.sourceHandle === 'else-output' ? edge.target : undefined
          };
          terminalConditions.push(newTerminal);
          console.log(`[DEBUG]   -> Created new terminal:`, newTerminal);
        }
      }
    }
    
    // If no outputs at all, this is a terminal condition with no actions
    if (!hasConditionOutput && !foundActionOutput && condEdges.length === 0) {
      terminalConditions.push({ condChain: newChain });
    }
  }
  
  // Start tracing from root conditions
  for (const edge of rootCondEdges) {
    traceConditionChain(edge.target, []);
  }
  
  // Process terminal conditions
  if (terminalConditions.length > 0) {
    // First, group by action ID - conditions pointing to same action become AND group
    const actionGroups = new Map<string, typeof terminalConditions>();
    
    for (const tc of terminalConditions) {
      // Use the action ID as key (then action takes precedence, then else action)
      const key = tc.thenActionId || tc.elseActionId || 'no-action';
      if (!actionGroups.has(key)) {
        actionGroups.set(key, []);
      }
      actionGroups.get(key)!.push(tc);
    }
    
    // Process the first action group
    const firstGroup = actionGroups.values().next().value as typeof terminalConditions;
    if (firstGroup && firstGroup.length > 0) {
      // Combine all condition chains from this group
      const allCondIds: string[] = [];
      // Merge then and else action IDs from all terminals in this group
      let thenActionId: string | undefined;
      let elseActionId: string | undefined;
      
      for (const tc of firstGroup) {
        allCondIds.push(...tc.condChain);
        if (tc.thenActionId) thenActionId = tc.thenActionId;
        if (tc.elseActionId) elseActionId = tc.elseActionId;
      }
      
      // Remove duplicates while preserving order
      const uniqueCondIds = [...new Set(allCondIds)];
      
      // Build conditions
      const allConditions = uniqueCondIds.map(id => resolveCondition(id, ctx)).filter((c): c is RuleCondition => c !== null);
      
      if (allConditions.length === 1) {
        builder.withIf(allConditions[0]!);
      } else if (allConditions.length > 1) {
        builder.withIf({ operator: 'AND', conditions: allConditions });
      }
      
      // Add THEN action (from condition-output)
      if (thenActionId) {
        const thenAct = resolveAction(thenActionId, ctx);
        if (thenAct) builder.withDo(thenAct);
      }
      
      // Add ELSE action (from else-output)
      if (elseActionId) {
        const elseAct = resolveAction(elseActionId, ctx);
        if (elseAct) builder.elseRule(elseAct);
      }
    }
  } else {
    // No conditions, just find actions connected from event
    const actionEdges = edges.filter(e => {
      const tgtNode = ctx.nodes.find(n => n.id === e.target);
      return e.source === eventNode.id && tgtNode && isAct(tgtNode);
    });
    
    const rootActs = actionEdges.map(e => resolveAction(e.target, ctx)).filter((a): a is Action | ActionGroup => a !== null);
    
    if (rootActs.length > 0) {
      builder.withDo(rootActs.length === 1 ? rootActs[0]! : rootActs);
    } else {
      throw new Error("No actions connected to the flow.");
    }
  }

  return builder;
}
