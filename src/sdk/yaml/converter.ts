/**
 * YAML to Editor Node/Edge Converter
 * 
 * This module converts TriggerRule objects to React Flow editor nodes and edges.
 * It supports all node types including:
 * - Event nodes
 * - Condition nodes (including groups)
 * - Action nodes (including inline conditionals)
 * - Action groups
 * - DO nodes (for graph-based representation)
 */

import type { 
  TriggerRule, 
  RuleCondition, 
  Action, 
  ActionGroup, 
  ComparisonOperator, 
  ExecutionMode,
  InlineConditionalAction,
  Condition
} from '../../types';
import { NodeType, HandleId, BranchType } from '../constants';
import { 
  isConditionGroup as utilsIsConditionGroup, 
  isActionGroup as utilsIsActionGroup, 
  hasConditionalExecution as utilsHasConditionalExecution,
  isSimpleCondition as utilsIsSimpleCondition
} from './utils';
import type { 
  EditorNode, 
  EditorEdge, 
  EditorNodeType,
  TriggerRuleToNodesResult 
} from './types';
import { 
  getActionType, 
  getActionParams,
  getConditionField,
  getConditionOperator,
  getConditionValue,
  createNodeIdGenerator,
  createEdgeIdGenerator,
  createPositionCalculator,
  ensureArray,
  isSimpleCondition
} from './utils';

// ============================================================================
// Node Builders
// ============================================================================

/**
 * Build an Event node from TriggerRule
 */
export function buildEventNode(
  rule: TriggerRule,
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: NodeType.EVENT,
    position,
    data: {
      id: rule.id || 'rule-1',
      name: rule.name || 'Imported Rule',
      description: rule.description || '',
      event: rule.on || '',
      priority: rule.priority || 0,
      enabled: rule.enabled !== false,
      cooldown: rule.cooldown,
      tags: rule.tags,
    },
  };
}

/**
 * Build a Condition Group node
 */
export function buildConditionGroupNode(
  operator: 'AND' | 'OR',
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: NodeType.CONDITION_GROUP,
    position,
    data: {
      operator,
    },
  };
}

/**
 * Build a single Condition node
 */
export function buildConditionNode(
  field: string,
  operator: string,
  value: unknown,
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: NodeType.CONDITION,
    position,
    data: {
      field: field || 'data',
      operator: (operator as ComparisonOperator) || 'EQ',
      value: value ?? '',
    },
  };
}

/**
 * Build a DO node (for inline conditionals in graph)
 */
export function buildDoNode(
  branchType: 'do' | 'else',
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: NodeType.DO,
    position,
    data: {
      branchType,
    },
  };
}

/**
 * Build an Action node
 */
export function buildActionNode(
  action: Action | InlineConditionalAction,
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  // Handle conditional action (action with if/then/else)
  let conditionField: string | undefined;
  let conditionOperator: string | undefined;
  let conditionValue: string | undefined;
  let thenType: string | undefined;
  let thenParams: string | undefined;
  let elseType: string | undefined;
  let elseParams: string | undefined;
  
  // Check if this action has conditional execution
  if (utilsHasConditionalExecution(action)) {
    const cond = (action as InlineConditionalAction).if;
    if (cond) {
      const conditions = Array.isArray(cond) ? cond : [cond];
      const firstCond = conditions[0];
      if (firstCond && utilsIsSimpleCondition(firstCond)) {
        conditionField = firstCond.field;
        conditionOperator = firstCond.operator;
        conditionValue = firstCond.value !== undefined 
          ? (typeof firstCond.value === 'string' ? firstCond.value : JSON.stringify(firstCond.value))
          : undefined;
      }
    }
    
    // Extract then branch
    const thenAction = (action as InlineConditionalAction).then;
    if (thenAction) {
      const thenArr = Array.isArray(thenAction) ? thenAction : [thenAction];
      if (thenArr[0]) {
        thenType = getActionType(thenArr[0] as Action);
        thenParams = getActionParams(thenArr[0] as Action);
      }
    }
    
    // Extract else branch
    const elseAction = (action as InlineConditionalAction).else;
    if (elseAction) {
      const elseArr = Array.isArray(elseAction) ? elseAction : [elseAction];
      if (elseArr[0]) {
        elseType = getActionType(elseArr[0] as Action);
        elseParams = getActionParams(elseArr[0] as Action);
      }
    }
  }

  const actionData: Record<string, unknown> = {
    type: getActionType(action as Action),
    params: getActionParams(action as Action),
  };

  // Add conditional fields if present
  if (conditionField) actionData.conditionField = conditionField;
  if (conditionOperator) actionData.conditionOperator = conditionOperator;
  if (conditionValue !== undefined) actionData.conditionValue = conditionValue;
  if (thenType) actionData.thenType = thenType;
  if (thenParams) actionData.thenParams = thenParams;
  if (elseType) actionData.elseType = elseType;
  if (elseParams) actionData.elseParams = elseParams;

  return {
    id: nodeId,
    type: NodeType.ACTION,
    position,
    data: actionData,
  };
}

/**
 * Build an Action Group node
 */
export function buildActionGroupNode(
  mode: ExecutionMode,
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: NodeType.ACTION_GROUP,
    position,
    data: {
      mode: mode || 'SEQUENCE',
    },
  };
}

// ============================================================================
// Edge Builder
// ============================================================================

/**
 * Build an edge between two nodes
 */
export function buildEdge(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null,
  edgeIdGenerator?: () => string
): EditorEdge {
  return {
    id: edgeIdGenerator ? edgeIdGenerator() : `edge_${source}_${target}_${Date.now()}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
  };
}

// ============================================================================
// Rule to Nodes Conversion
// ============================================================================

/**
 * Convert a TriggerRule to editor nodes and edges
 */
export function triggerRuleToNodes(
  rule: TriggerRule,
  options: {
    startNodeId?: string;
    startPosition?: { x: number; y: number };
  } = {}
): TriggerRuleToNodesResult {
  const nodes: EditorNode[] = [];
  const edges: EditorEdge[] = [];
  const errors: string[] = [];
  
  // Validate required fields
  if (!rule.id) {
    errors.push('Missing required field: id');
  }
  if (!rule.on) {
    errors.push('Missing required field: on (event trigger)');
  }
  if (!rule.do && rule.do !== '') {
    errors.push('Missing required field: do (actions)');
  }
  
  // If there are validation errors, return early
  if (errors.length > 0) {
    return {
      nodes: [],
      edges: [],
      valid: false,
      errors
    };
  }
  
  const startNodeId = options.startNodeId || 'event-node';
  const getNodeId = createNodeIdGenerator(0);
  const getEdgeId = createEdgeIdGenerator();
  const getPosition = createPositionCalculator();
  
  try {
    // Build event node
    const eventNode = buildEventNode(rule, startNodeId, options.startPosition || { x: 100, y: 300 });
    nodes.push(eventNode);
    
    // Process conditions
    const conditions = ensureArray(rule.if);
    if (conditions.length > 0) {
      const { conditionNodes, groupNodeId } = processConditions(
        conditions,
        nodes,
        edges,
        eventNode.id,
        getNodeId,
        getPosition
      );
      
      // Process DO actions (then branch)
      const doActions = ensureArray(rule.do);
      if (doActions.length > 0) {
        // For AND groups with sequential conditions, use the last condition node as source
        // This ensures the flow is: event -> condition_group -> condition1 -> condition2 -> ... -> action_group
        const lastCondNode = conditionNodes.length > 0 
          ? conditionNodes[conditionNodes.length - 1]!.id 
          : groupNodeId || eventNode.id;
        
        processActions(
          doActions,
          nodes,
          edges,
          lastCondNode,
          getNodeId,
          getEdgeId,
          getPosition,
          'do'
        );
      }
      
      // Process ELSE actions
      const elseActions = ensureArray(rule.else);
      if (elseActions.length > 0) {
        // For AND groups with sequential conditions, use the last condition node as source
        const lastCondNode = conditionNodes.length > 0 
          ? conditionNodes[conditionNodes.length - 1]!.id 
          : groupNodeId || eventNode.id;
        
        processActions(
          elseActions,
          nodes,
          edges,
          lastCondNode,
          getNodeId,
          getEdgeId,
          getPosition,
          'else'
        );
      }
    } else {
      // No conditions - process actions directly from event
      const doActions = ensureArray(rule.do);
      if (doActions.length > 0) {
        processActions(
          doActions,
          nodes,
          edges,
          eventNode.id,
          getNodeId,
          getEdgeId,
          getPosition,
          'do'
        );
      }
    }
    
    return {
      nodes,
      edges,
      valid: true,
      errors: []
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during conversion';
    errors.push(message);
    
    return {
      nodes,
      edges,
      valid: false,
      errors
    };
  }
}

// ============================================================================
// Condition Processing
// ============================================================================

/**
 * Process conditions from TriggerRule and create condition nodes
 */
function processConditions(
  conditions: RuleCondition[],
  nodes: EditorNode[],
  edges: EditorEdge[],
  eventNodeId: string,
  getNodeId: () => string,
  getPosition: (level: number, index: number, total: number) => { x: number; y: number }
): { conditionNodes: EditorNode[]; groupNodeId?: string } {
  const conditionNodes: EditorNode[] = [];
  let groupNodeId: string | undefined;
  
  const hasMultipleConditions = conditions.length > 1;
  const hasAnyGroup = conditions.some(utilsIsConditionGroup);
  
  if (hasMultipleConditions || hasAnyGroup) {
    // Create a condition group node
    groupNodeId = getNodeId();
    
    // Find the operator from condition groups or default to AND
    let groupOperator: 'AND' | 'OR' = 'AND';
    const groupCond = conditions.find(utilsIsConditionGroup);
    if (groupCond && utilsIsConditionGroup(groupCond)) {
      groupOperator = groupCond.operator;
    }
    
    const groupNode = buildConditionGroupNode(groupOperator, groupNodeId, getPosition(1, 0, 1));
    nodes.push(groupNode);
    
    // Connect event to condition group
    edges.push(buildEdge(eventNodeId, groupNodeId, null, HandleId.CONDITION_GROUP_INPUT, undefined));
    
    // Process each condition
    // Track the previous condition node to chain them sequentially
    let previousCondNodeId: string | null = null;
    
    conditions.forEach((cond, idx) => {
      let currentCondNodeId: string;
      let currentCondNode: EditorNode;
      
      if (utilsIsConditionGroup(cond)) {
        // Skip logical conditions as they define the group, process their nested conditions
        if (cond.conditions) {
          cond.conditions.forEach((nestedCond: RuleCondition, nestedIdx: number) => {
            if (utilsIsConditionGroup(nestedCond)) return; // Skip nested groups for now
            
            currentCondNodeId = getNodeId();
            currentCondNode = buildConditionNode(
              getConditionField(nestedCond),
              getConditionOperator(nestedCond),
              getConditionValue(nestedCond),
              currentCondNodeId,
              getPosition(2, idx * 2 + nestedIdx, conditions.length * 2)
            );
            nodes.push(currentCondNode);
            conditionNodes.push(currentCondNode);
            
            // Chain conditions sequentially: previous condition -> current condition
            if (previousCondNodeId) {
              edges.push(buildEdge(previousCondNodeId, currentCondNodeId, HandleId.CONDITION_OUTPUT, HandleId.CONDITION_INPUT, undefined));
            } else {
              // First condition - connect from condition group
              edges.push(buildEdge(groupNodeId!, currentCondNodeId, HandleId.CONDITION_GROUP_OUTPUT, HandleId.CONDITION_INPUT, undefined));
            }
            
            previousCondNodeId = currentCondNodeId;
          });
        }
      } else {
        currentCondNodeId = getNodeId();
        currentCondNode = buildConditionNode(
          getConditionField(cond),
          getConditionOperator(cond),
          getConditionValue(cond),
          currentCondNodeId,
          getPosition(2, idx, conditions.length)
        );
        nodes.push(currentCondNode);
        conditionNodes.push(currentCondNode);
        
        // Chain conditions sequentially: previous condition -> current condition
        if (previousCondNodeId) {
          edges.push(buildEdge(previousCondNodeId, currentCondNodeId, HandleId.CONDITION_OUTPUT, HandleId.CONDITION_INPUT, undefined));
        } else {
          // First condition - connect from condition group
          edges.push(buildEdge(groupNodeId!, currentCondNodeId, HandleId.CONDITION_GROUP_OUTPUT, HandleId.CONDITION_INPUT, undefined));
        }
        
        previousCondNodeId = currentCondNodeId;
      }
    });
  } else {
    // Single condition - create directly
    const condNodeId = getNodeId();
    const condNode = buildConditionNode(
      getConditionField(conditions[0]!),
      getConditionOperator(conditions[0]!),
      getConditionValue(conditions[0]!),
      condNodeId,
      getPosition(1, 0, 1)
    );
    nodes.push(condNode);
    conditionNodes.push(condNode);
    
    // Connect event to condition
    edges.push(buildEdge(eventNodeId, condNodeId, null, HandleId.CONDITION_INPUT, undefined));
  }
  
  return { conditionNodes, groupNodeId };
}

// ============================================================================
// Action Processing
// ============================================================================

/**
 * Process actions from TriggerRule and create action nodes
 */
function processActions(
  actions: (Action | ActionGroup | InlineConditionalAction)[],
  nodes: EditorNode[],
  edges: EditorEdge[],
  sourceId: string,
  getNodeId: () => string,
  getEdgeId: () => string,
  getPosition: (level: number, index: number, total: number) => { x: number; y: number },
  branchType: 'do' | 'else'
): void {
  actions.forEach((action, idx) => {
    // Handle action group
    if (utilsIsActionGroup(action)) {
      const groupNodeId = getNodeId();
      const groupNode = buildActionGroupNode(action.mode as ExecutionMode, groupNodeId, getPosition(2, idx, actions.length));
      nodes.push(groupNode);
      
      // Determine the correct source handle based on the source node type
      const sourceNode = nodes.find(n => n.id === sourceId);
      const sourceHandle = sourceNode?.type === NodeType.EVENT 
        ? HandleId.EVENT_OUTPUT 
        : (branchType === BranchType.ELSE ? HandleId.ELSE_OUTPUT : HandleId.THEN_OUTPUT);
      
      // Connect source to group
      edges.push(buildEdge(sourceId, groupNodeId, sourceHandle, HandleId.ACTION_GROUP_INPUT, getEdgeId));
      
      // Process nested actions
      processActions(
        action.actions as (Action | ActionGroup | InlineConditionalAction)[],
        nodes,
        edges,
        groupNodeId,
        getNodeId,
        getEdgeId,
        getPosition,
        branchType
      );
      return;
    }
    
    // Handle inline conditional action
    if (utilsHasConditionalExecution(action)) {
      const inlineAction = action as InlineConditionalAction;
      // Create a DO node to represent the conditional
      const doNodeId = getNodeId();
      const doNode = buildDoNode(branchType, doNodeId, getPosition(2, idx, actions.length));
      nodes.push(doNode);
      
      // Determine the correct source handle based on the source node type
      const sourceNodeForDo = nodes.find(n => n.id === sourceId);
      const sourceHandleForDo = sourceNodeForDo?.type === NodeType.EVENT 
        ? HandleId.EVENT_OUTPUT 
        : (branchType === BranchType.ELSE ? HandleId.ELSE_OUTPUT : HandleId.THEN_OUTPUT);
      
      // Connect source to DO node
      edges.push(buildEdge(sourceId, doNodeId, sourceHandleForDo, HandleId.DO_INPUT, getEdgeId));
      
      // Create condition node
      const ifCondRaw = inlineAction.if;
      const ifCond = Array.isArray(ifCondRaw) ? ifCondRaw[0] : ifCondRaw;
      if (ifCond && isSimpleCondition(ifCond)) {
        const condNodeId = getNodeId();
        const condNode = buildConditionNode(
          getConditionField(ifCond),
          getConditionOperator(ifCond),
          getConditionValue(ifCond),
          condNodeId,
          getPosition(3, idx * 2, actions.length * 2)
        );
        nodes.push(condNode);
        
        // Connect DO to condition
        edges.push(buildEdge(doNodeId, condNodeId, HandleId.DO_CONDITION_OUTPUT, HandleId.CONDITION_INPUT, getEdgeId));
        
        // Process then branch
        const thenAction = (action as InlineConditionalAction).then;
        if (thenAction) {
          const thenActions = Array.isArray(thenAction) ? thenAction : [thenAction];
          processActions(
            thenActions as (Action | ActionGroup | InlineConditionalAction)[],
            nodes,
            edges,
            condNodeId,
            getNodeId,
            getEdgeId,
            getPosition,
            'do'
          );
        }
        
        // Process else branch
        const elseAction = (action as InlineConditionalAction).else;
        if (elseAction) {
          const elseActions = Array.isArray(elseAction) ? elseAction : [elseAction];
          processActions(
            elseActions as (Action | ActionGroup | InlineConditionalAction)[],
            nodes,
            edges,
            condNodeId,
            getNodeId,
            getEdgeId,
            getPosition,
            'else'
          );
        }
      }
      return;
    }
    
    // Regular action
    const actionNodeId = getNodeId();
    const actionNode = buildActionNode(action as Action, actionNodeId, getPosition(2, idx, actions.length));
    nodes.push(actionNode);
    
    // Determine the correct source handle based on the source node type
    // If source is an event node, use 'event-output', otherwise use 'do-output' or 'else-output'
    const sourceNode = nodes.find(n => n.id === sourceId);
    const sourceHandle = sourceNode?.type === NodeType.EVENT 
      ? HandleId.EVENT_OUTPUT 
      : (branchType === BranchType.ELSE ? HandleId.ELSE_OUTPUT : HandleId.DO_OUTPUT);
    
    // Connect source to action
    edges.push(buildEdge(sourceId, actionNodeId, sourceHandle, HandleId.ACTION_INPUT, getEdgeId));
  });
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  triggerRuleToNodes,
  buildEventNode,
  buildConditionGroupNode,
  buildConditionNode,
  buildDoNode,
  buildActionNode,
  buildActionGroupNode,
  buildEdge,
};
