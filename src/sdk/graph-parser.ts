import { RuleBuilder } from './builder';
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
    const res: Action = { type: node.data.type || 'log', params };
    
    const childrenEdges = ctx.edges.filter(e => e.source === id && isAct(ctx.nodes.find(n => n.id === e.target)!));
    const children = childrenEdges.map(e => resolveAction(e.target, ctx)).filter((a): a is Action | ActionGroup => a !== null);
    
    if (children.length > 0) {
      result = { mode: 'ALL', actions: [res, ...children] };
    } else {
      result = res;
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

export function parseGraph(
  nodes: SDKGraphNode[], 
  edges: SDKGraphEdge[],
  options: GraphParserOptions = {},
  transformers?: GraphParserContext['transformers']
): RuleBuilder {
  const builder = new RuleBuilder();

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
  
  const rootConds = rootCondEdges.map(e => resolveCondition(e.target, ctx)).filter((c): c is RuleCondition => c !== null);
  if (rootConds.length > 0) {
    builder.withIf(rootConds.length === 1 ? rootConds[0]! : { operator: 'AND', conditions: rootConds });
  }

  // Find root actions. 
  const actionSourceEdges = edges.filter(e => {
    const srcNode = ctx.nodes.find(n => n.id === e.source);
    const tgtNode = ctx.nodes.find(n => n.id === e.target);
    return tgtNode && isAct(tgtNode) && srcNode && !isAct(srcNode);
  });

  const rootActs = actionSourceEdges.map(e => resolveAction(e.target, ctx)).filter((a): a is Action | ActionGroup => a !== null);
  
  if (rootActs.length > 0) {
    builder.withDo(rootActs.length === 1 ? rootActs[0]! : rootActs);
  } else {
    throw new Error("No actions connected to the flow.");
  }

  return builder;
}
