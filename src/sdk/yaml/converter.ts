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
        
        // Find position for DO node
        const condNodeObj = nodes.find(n => n.id === lastCondNode);
        const condPos = condNodeObj?.position || { x: 300, y: 300 };
        
        const doNodeId = getNodeId();
        const doNode = buildDoNode('do', doNodeId, { 
          x: condPos.x + 300, 
          y: condPos.y - 100 
        });
        nodes.push(doNode);
        
        let sourceHandle: string | null = null;
        if (lastCondNode === eventNode.id) sourceHandle = HandleId.EVENT_OUTPUT;
        else if (lastCondNode === groupNodeId) sourceHandle = HandleId.THEN_OUTPUT;
        else sourceHandle = HandleId.CONDITION_OUTPUT;
        
        edges.push(buildEdge(lastCondNode, doNodeId, sourceHandle, HandleId.DO_INPUT, getEdgeId));

        processActions(
          doActions,
          nodes,
          edges,
          doNodeId,
          getNodeId,
          getEdgeId,
          (level, i, total) => ({ x: doNode.position.x + 300, y: doNode.position.y + (i * 150) }),
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
          
        // Find position for ELSE node
        const condNodeObj = nodes.find(n => n.id === lastCondNode);
        const condPos = condNodeObj?.position || { x: 300, y: 300 };
        
        const elseNodeId = getNodeId();
        const elseNode = buildDoNode('else', elseNodeId, { 
          x: condPos.x + 300, 
          y: condPos.y + 100 
        });
        nodes.push(elseNode);
        
        let sourceHandle: string | null = null;
        if (lastCondNode === eventNode.id) sourceHandle = HandleId.EVENT_OUTPUT;
        else if (lastCondNode === groupNodeId) sourceHandle = HandleId.THEN_OUTPUT;
        else sourceHandle = HandleId.CONDITION_OUTPUT;
        
        edges.push(buildEdge(lastCondNode, elseNodeId, sourceHandle, HandleId.DO_INPUT, getEdgeId));

        processActions(
          elseActions,
          nodes,
          edges,
          elseNodeId,
          getNodeId,
          getEdgeId,
          (level, i, total) => ({ x: elseNode.position.x + 300, y: elseNode.position.y + (i * 150) }),
          'else'
        );
      }
    } else {
      // No conditions - process actions directly from event
      const doActions = ensureArray(rule.do);
      if (doActions.length > 0) {
        const doNodeId = getNodeId();
        const eventPos = eventNode.position;
        const doNode = buildDoNode('do', doNodeId, { 
          x: eventPos.x + 300, 
          y: eventPos.y 
        });
        nodes.push(doNode);
        
        edges.push(buildEdge(eventNode.id, doNodeId, HandleId.EVENT_OUTPUT, HandleId.DO_INPUT, getEdgeId));

        processActions(
          doActions,
          nodes,
          edges,
          doNodeId,
          getNodeId,
          getEdgeId,
          (level, i, total) => ({ x: doNode.position.x + 300, y: doNode.position.y + (i * 150) }),
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
      // Position action group based on source node position
      const sourceNodePos = nodes.find(n => n.id === sourceId)?.position || { x: 100, y: 100 };
      const groupNode = buildActionGroupNode(action.mode as ExecutionMode, groupNodeId, {
        x: sourceNodePos.x + 300,
        y: sourceNodePos.y + idx * 75
      });
      nodes.push(groupNode);
      
      // Determine the correct source handle based on the source node type
      const sourceNode = nodes.find(n => n.id === sourceId);
      let sourceHandle: string;
      
      if (sourceNode?.type === NodeType.EVENT) {
        sourceHandle = HandleId.EVENT_OUTPUT;
      } else if (sourceNode?.type === NodeType.CONDITION) {
        sourceHandle = HandleId.CONDITION_OUTPUT;
      } else if (sourceNode?.type === NodeType.CONDITION_GROUP) {
        sourceHandle = HandleId.CONDITION_GROUP_OUTPUT;
      } else if (sourceNode?.type === NodeType.ACTION_GROUP) {
        sourceHandle = HandleId.ACTION_GROUP_OUTPUT;
      } else if (sourceNode?.type === NodeType.DO) {
        sourceHandle = HandleId.DO_OUTPUT;
      } else {
        sourceHandle = branchType === BranchType.ELSE ? HandleId.ELSE_OUTPUT : HandleId.THEN_OUTPUT;
      }
      
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
      const ifCondRaw = inlineAction.if;
      const ifCond = Array.isArray(ifCondRaw) ? ifCondRaw[0] : ifCondRaw;
      
      if (ifCond) {
        // Determine sourceHandleForCond
        const sourceNodeForCond = nodes.find(n => n.id === sourceId);
        let sourceHandleForCond: string;
        if (sourceNodeForCond?.type === NodeType.EVENT) {
          sourceHandleForCond = HandleId.EVENT_OUTPUT;
        } else if (sourceNodeForCond?.type === NodeType.ACTION_GROUP) {
          sourceHandleForCond = HandleId.ACTION_GROUP_CONDITION_OUTPUT;
        } else if (sourceNodeForCond?.type === NodeType.CONDITION) {
          sourceHandleForCond = HandleId.CONDITION_OUTPUT;
        } else if (sourceNodeForCond?.type === NodeType.DO) {
          sourceHandleForCond = HandleId.DO_OUTPUT;
        } else {
          sourceHandleForCond = HandleId.CONDITION_OUTPUT;
        }

        let terminalCondNodeId: string;
        const parentPos = getPosition(2, idx, actions.length);

        if (utilsIsConditionGroup(ifCond)) {
          // It's a condition group
          const groupNodeId = getNodeId();
          const groupOperator = ifCond.operator || 'AND';
          const groupNode = buildConditionGroupNode(groupOperator, groupNodeId, { x: parentPos.x + 300, y: parentPos.y - 75 });
          nodes.push(groupNode);
          
          edges.push(buildEdge(sourceId, groupNodeId, sourceHandleForCond, HandleId.CONDITION_GROUP_INPUT, getEdgeId));
          
          let previousCondNodeId: string | null = null;
          
          if (ifCond.conditions) {
            ifCond.conditions.forEach((nestedCond: RuleCondition, nestedIdx: number) => {
              if (utilsIsConditionGroup(nestedCond)) return;
              
              const currentCondNodeId = getNodeId();
              const currentCondNode = buildConditionNode(
                getConditionField(nestedCond),
                getConditionOperator(nestedCond),
                getConditionValue(nestedCond),
                currentCondNodeId,
                { x: parentPos.x + 600, y: parentPos.y + (nestedIdx * 100) }
              );
              nodes.push(currentCondNode);
              
              if (previousCondNodeId) {
                edges.push(buildEdge(previousCondNodeId, currentCondNodeId, HandleId.CONDITION_OUTPUT, HandleId.CONDITION_INPUT, getEdgeId));
              } else {
                edges.push(buildEdge(groupNodeId, currentCondNodeId, HandleId.CONDITION_GROUP_OUTPUT, HandleId.CONDITION_INPUT, getEdgeId));
              }
              previousCondNodeId = currentCondNodeId;
            });
          }
          terminalCondNodeId = previousCondNodeId || groupNodeId;
        } else if (isSimpleCondition(ifCond)) {
          // 1. Create the condition node first
          const condNodeId = getNodeId();
          const condNode = buildConditionNode(
            getConditionField(ifCond),
            getConditionOperator(ifCond),
            getConditionValue(ifCond),
            condNodeId,
            { x: parentPos.x + 300, y: parentPos.y }
          );
          nodes.push(condNode);

          // 2. Connect source directly to condition
          edges.push(buildEdge(sourceId, condNodeId, sourceHandleForCond, HandleId.CONDITION_INPUT, getEdgeId));
          terminalCondNodeId = condNodeId;
        } else {
           return;
        }

        // 3. Process Then branch via a DO node
        const thenAction = (action as InlineConditionalAction).then;
        if (thenAction) {
          const thenDoNodeId = getNodeId();
          const condNodeForPos = nodes.find(n => n.id === terminalCondNodeId);
          const thenDoNode = buildDoNode('do', thenDoNodeId, { 
            x: (condNodeForPos?.position.x || 0) + 300, 
            y: (condNodeForPos?.position.y || 0) - 100 
          });
          nodes.push(thenDoNode);
          
          // Connect Condition -> then-DO
          const doSourceHandle: string = condNodeForPos?.type === NodeType.CONDITION_GROUP
            ? HandleId.THEN_OUTPUT
            : HandleId.CONDITION_OUTPUT;
          edges.push(buildEdge(terminalCondNodeId, thenDoNodeId, doSourceHandle, HandleId.DO_INPUT, getEdgeId));
          
          const thenActions = Array.isArray(thenAction) ? thenAction : [thenAction];
          const thenGetPosition = (level: number, i: number, total: number) => {
            return {
              x: thenDoNode.position.x + 300,
              y: thenDoNode.position.y - (i * 150)
            };
          };
          
          processActions(
            thenActions as (Action | ActionGroup | InlineConditionalAction)[],
            nodes,
            edges,
            thenDoNodeId,
            getNodeId,
            getEdgeId,
            thenGetPosition,
            'do'
          );
        }

        // 4. Process Else branch via a DO node
        const elseAction = (action as InlineConditionalAction).else;
        if (elseAction) {
          const elseDoNodeId = getNodeId();
          const condNodeForPos = nodes.find(n => n.id === terminalCondNodeId);
          const elseDoNode = buildDoNode('else', elseDoNodeId, { 
            x: (condNodeForPos?.position.x || 0) + 300, 
            y: (condNodeForPos?.position.y || 0) + 100 
          });
          nodes.push(elseDoNode);
          
          // Connect Condition -> else-DO
          const doSourceHandle: string = condNodeForPos?.type === NodeType.CONDITION_GROUP
            ? HandleId.THEN_OUTPUT
            : HandleId.CONDITION_OUTPUT;
          edges.push(buildEdge(terminalCondNodeId, elseDoNodeId, doSourceHandle, HandleId.DO_INPUT, getEdgeId));
          
          const elseActions = Array.isArray(elseAction) ? elseAction : [elseAction];
          const elseGetPosition = (level: number, i: number, total: number) => {
            return {
              x: elseDoNode.position.x + 300,
              y: elseDoNode.position.y + (i * 150)
            };
          };
          
          processActions(
            elseActions as (Action | ActionGroup | InlineConditionalAction)[],
            nodes,
            edges,
            elseDoNodeId,
            getNodeId,
            getEdgeId,
            elseGetPosition,
            'else'
          );
        }
      }
      return;
    }
    
    // Regular action
    const actionNodeId = getNodeId();
    // Position action nodes to the right of the source node
    // Get source node position and offset
    const sourceNodePos = nodes.find(n => n.id === sourceId)?.position || { x: 700, y: 100 };
    const actionNode = buildActionNode(action as Action, actionNodeId, {
      x: sourceNodePos.x + 300, // Position to the right of source
      y: sourceNodePos.y + idx * 150 // Spread vertically based on index
    });
    nodes.push(actionNode);
    
    // Determine the correct source handle based on the source node type
    const sourceNode = nodes.find(n => n.id === sourceId);
    let sourceHandle: string;
    
    if (sourceNode?.type === NodeType.EVENT) {
      sourceHandle = HandleId.EVENT_OUTPUT;
    } else if (sourceNode?.type === NodeType.CONDITION) {
      sourceHandle = HandleId.CONDITION_OUTPUT;
    } else if (sourceNode?.type === NodeType.CONDITION_GROUP) {
      sourceHandle = HandleId.CONDITION_GROUP_OUTPUT;
    } else if (sourceNode?.type === NodeType.ACTION_GROUP) {
      sourceHandle = HandleId.ACTION_GROUP_OUTPUT;
    } else if (sourceNode?.type === NodeType.DO) {
      sourceHandle = HandleId.DO_OUTPUT;
    } else {
      sourceHandle = branchType === BranchType.ELSE ? HandleId.CONDITION_OUTPUT : HandleId.CONDITION_OUTPUT;
    }
    
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
