/**
 * YAML Import Module
 * 
 * This module handles importing trigger rules from YAML format.
 * It parses YAML content and converts it to React Flow nodes and edges.
 * 
 * Architecture:
 * - yamlImport.ts: Main entry point and public API
 * - yamlParser.ts: Core YAML parsing logic (internal)
 * - yamlValidators.ts: Validation functions (internal)
 * 
 * The modular design allows for:
 * - Easy testing of individual components
 * - Clear separation of concerns
 * - Reusable parsing logic
 */

import { parse as parseYaml } from 'yaml';
import { parseYamlRules } from '../../../src/sdk/yaml-parser';
import type { Edge } from '@xyflow/react';

import { NodeType } from '../constants';
import type { ComparisonOperator } from '../../../src/types';

import type {
  AppNode,
  AppNodes,
  AppEdges,
  ImportResponse,
  ImportResult,
  ImportErrorCode,
} from './importExportTypes';
import type { ActionNodeData } from '../types';
import {
  createImportResult,
  createImportError,
  successResponse,
  errorResponse,
} from './importExportTypes';
import { createYamlFilePicker } from './filePicker';

// ============================================================================
// Internal Types - YAML Structure
// ============================================================================

/**
 * YAML Rule structure - corresponds to TriggerRule in the type system
 */
interface YamlRule {
  id: string;
  on: string;
  name?: string;
  description?: string;
  priority?: number;
  enabled?: boolean;
  cooldown?: number;
  tags?: string[];
  if?: YamlCondition | YamlCondition[];
  do?: YamlAction | YamlAction[];
  else?: YamlAction | YamlAction[];
}

/**
 * Single condition in YAML
 */
interface YamlCondition {
  field?: string;
  operator?: string;
  value?: unknown;
  conditions?: YamlCondition[];
}

/**
 * Logical condition group (AND/OR)
 */
interface YamlLogicalCondition {
  operator: 'AND' | 'OR';
  conditions: YamlCondition[];
}

/**
 * Union type for any condition
 */
type AnyYamlCondition = YamlCondition | YamlLogicalCondition;

/**
 * Action in YAML
 */
interface YamlAction {
  type?: string;
  params?: Record<string, unknown>;
  mode?: 'ALL' | 'EITHER' | 'SEQUENCE';
  actions?: YamlAction[];
  // Conditional execution within an action
  if?: YamlCondition | YamlCondition[];
  then?: YamlAction | YamlAction[];
  else?: YamlAction | YamlAction[];
  do?: YamlAction | YamlAction[]; // Alias for then
}

/**
 * Check if YAML action is an ActionGroup (has mode and actions)
 */
function isActionGroup(action: YamlAction): action is YamlAction & { mode: 'ALL' | 'EITHER' | 'SEQUENCE'; actions: YamlAction[] } {
  return !!(action.mode && action.actions && action.actions.length > 0);
}

/**
 * Check if action branch should create separate nodes (multiple actions or action group)
 */
function shouldCreateSubNodes(branch: YamlAction | YamlAction[] | undefined): boolean {
  if (!branch) return false;
  if (Array.isArray(branch)) {
    // Create sub-nodes if multiple actions
    if (branch.length > 1) return true;
    // Or if it's a single action group
    if (branch.length === 1 && branch[0]) {
      return isActionGroup(branch[0]);
    }
    return false;
  }
  // Single action object - embed in parent node, unless it's an action group
  return isActionGroup(branch);
}

// ============================================================================
// Node ID Generator
// ============================================================================

/**
 * Creates a sequential node ID generator
 */
function createNodeIdGenerator(start: number = 0): () => string {
  let counter = start;
  return () => `node_${counter++}`;
}

// ============================================================================
// Position Calculator
// ============================================================================

/**
 * Creates a position calculator for node layout
 */
function createPositionCalculator() {
  const baseX = 100;
  const baseY = 100;
  const levelSpacing = 300;
  const nodeSpacing = 150;
  
  return (level: number, index: number, total: number) => ({
    x: baseX + level * levelSpacing,
    y: baseY + index * nodeSpacing - (total * nodeSpacing) / 2,
  });
}

// ============================================================================
// Node Builders
// ============================================================================

/**
 * Build an Event node from YAML rule data
 */
function buildEventNode(
  rule: YamlRule,
  nodeId: string,
  position: { x: number; y: number }
): AppNode {
  return {
    id: nodeId,
    type: NodeType.EVENT,
    position,
    data: {
      onChange: () => {},
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
function buildConditionGroupNode(
  operator: 'AND' | 'OR',
  nodeId: string,
  position: { x: number; y: number }
): AppNode {
  return {
    id: nodeId,
    type: NodeType.CONDITION_GROUP,
    position,
    data: {
      onChange: () => {},
      operator,
    },
  };
}

/**
 * Build a single Condition node
 */
function buildConditionNode(
  field: string,
  operator: string,
  value: unknown,
  nodeId: string,
  position: { x: number; y: number }
): AppNode {
  return {
    id: nodeId,
    type: NodeType.CONDITION,
    position,
    data: {
      onChange: () => {},
      field: field || 'data',
      operator: (operator as ComparisonOperator) || 'EQ',
      value: value ?? '',
    },
  };
}

/**
 * Build an Action node
 */
function buildActionNode(
  action: YamlAction,
  nodeId: string,
  position: { x: number; y: number }
): AppNode {
  // Extract condition fields from the YAML 'if' array
  let conditionField: string | undefined;
  let conditionOperator: string | undefined;
  let conditionValue: string | undefined;
  
  if (action.if) {
    const conditions = Array.isArray(action.if) ? action.if : [action.if];
    // Take the first condition for the node data
    const firstCond = conditions[0];
    if (firstCond && !('conditions' in firstCond)) {
      conditionField = firstCond.field;
      conditionOperator = firstCond.operator;
      conditionValue = firstCond.value !== undefined 
        ? (typeof firstCond.value === 'string' ? firstCond.value : JSON.stringify(firstCond.value))
        : undefined;
    }
  }

  // Extract then branch details
  let thenType: string | undefined;
  let thenParams: string | undefined;
  if (action.then) {
    const thenActions = Array.isArray(action.then) ? action.then : [action.then];
    const firstThen = thenActions[0];
    if (firstThen) {
      thenType = firstThen.type;
      thenParams = firstThen.params 
        ? (typeof firstThen.params === 'string' ? firstThen.params : JSON.stringify(firstThen.params))
        : '{}';
    }
  }

  // Extract else branch details
  let elseType: string | undefined;
  let elseParams: string | undefined;
  if (action.else) {
    const elseActions = Array.isArray(action.else) ? action.else : [action.else];
    const firstElse = elseActions[0];
    if (firstElse) {
      elseType = firstElse.type;
      elseParams = firstElse.params 
        ? (typeof firstElse.params === 'string' ? firstElse.params : JSON.stringify(firstElse.params))
        : '{}';
    }
  }

  // Determine the main action type - use top-level type, or fallback to then/else type
  const mainType = action.type || thenType || elseType || 'log';

  const actionData: ActionNodeData = {
    onChange: () => {},
    type: mainType,
    params: typeof action.params === 'string' 
      ? action.params 
      : JSON.stringify(action.params || {}),
    // Conditional action fields - cast to proper types
    ...(conditionField && { conditionField }),
    ...(conditionOperator && { conditionOperator: conditionOperator as ComparisonOperator }),
    ...(conditionValue !== undefined && { conditionValue }),
    ...(thenType && { thenType }),
    ...(thenParams && { thenParams }),
    ...(elseType && { elseType }),
    ...(elseParams && { elseParams }),
  };

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
function buildActionGroupNode(
  mode: 'ALL' | 'EITHER' | 'SEQUENCE',
  nodeId: string,
  position: { x: number; y: number }
): AppNode {
  return {
    id: nodeId,
    type: NodeType.ACTION_GROUP,
    position,
    data: {
      onChange: () => {},
      mode: mode || 'SEQUENCE',
    },
  };
}

// ============================================================================
// Edge Builders
// ============================================================================

/**
 * Build an edge between two nodes
 */
function buildEdge(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): Edge {
  return {
    id: `edge_${source}_${target}_${Date.now()}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
  };
}

// ============================================================================
// Condition Parsing
// ============================================================================

/**
 * Check if a condition is a logical condition (has operator and conditions)
 */
function isLogicalCondition(c: AnyYamlCondition): c is YamlLogicalCondition {
  return 'operator' in c && 'conditions' in c;
}

/**
 * Process conditions from YAML and create condition nodes
 * Returns the condition nodes and edges, and optionally a condition group node
 */
function processConditions(
  conditions: AnyYamlCondition[],
  nodes: AppNodes,
  edges: AppEdges,
  eventNodeId: string,
  getNodeId: () => string,
  getPosition: (level: number, index: number, total: number) => { x: number; y: number }
): { conditionNodes: AppNode[]; groupNodeId?: string } {
  const conditionNodes: AppNode[] = [];
  let groupNodeId: string | undefined;
  
  const hasMultipleConditions = conditions.length > 1;
  const hasAnyLogical = conditions.some(isLogicalCondition);
  
  if (hasMultipleConditions || hasAnyLogical) {
    // Create a condition group node
    groupNodeId = getNodeId();
    
    // Find the operator from logical conditions or default to AND
    let groupOperator: 'AND' | 'OR' = 'AND';
    const logicalCond = conditions.find(isLogicalCondition);
    if (logicalCond) {
      groupOperator = logicalCond.operator;
    }
    
    const groupNode = buildConditionGroupNode(groupOperator, groupNodeId, getPosition(1, 0, 1));
    nodes.push(groupNode);
    
    // Connect event to condition group
    edges.push(buildEdge(eventNodeId, groupNodeId, null, 'input'));
    
    // Track condition index for handles
    let conditionHandleIndex = 0;
    
    // Process each condition
    conditions.forEach((cond, idx) => {
      if (isLogicalCondition(cond)) {
        // Skip logical conditions as they define the group, process their nested conditions
        if (cond.conditions) {
          cond.conditions.forEach((nestedCond, nestedIdx) => {
            const condNodeId = getNodeId();
            const condNode = buildConditionNode(
              nestedCond.field || 'data',
              nestedCond.operator || 'EQ',
              nestedCond.value,
              condNodeId,
              getPosition(2, idx * 2 + nestedIdx, conditions.length * 2)
            );
            nodes.push(condNode);
            conditionNodes.push(condNode);
            edges.push(buildEdge(groupNodeId!, condNodeId, `cond-${conditionHandleIndex}`, 'input'));
            conditionHandleIndex++;
          });
        }
      } else {
        const condNodeId = getNodeId();
        const condNode = buildConditionNode(
          cond.field || 'data',
          cond.operator || 'EQ',
          cond.value,
          condNodeId,
          getPosition(2, idx, conditions.length)
        );
        nodes.push(condNode);
        conditionNodes.push(condNode);
        edges.push(buildEdge(groupNodeId!, condNodeId, `cond-${conditionHandleIndex}`, 'input'));
        conditionHandleIndex++;
      }
    });
  } else if (conditions.length === 1) {
    // Single condition - connect directly to event
    const cond = conditions[0]!;
    
    // Skip if it's a logical condition (should be handled in the group branch)
    if (isLogicalCondition(cond)) {
      return { conditionNodes, groupNodeId };
    }
    
    const condNodeId = getNodeId();
    const condNode = buildConditionNode(
      cond.field || 'data',
      cond.operator || 'EQ',
      cond.value,
      condNodeId,
      getPosition(1, 0, 1)
    );
    nodes.push(condNode);
    conditionNodes.push(condNode);
    edges.push(buildEdge(eventNodeId, condNodeId, null, 'input'));
  }
  
  return { conditionNodes, groupNodeId };
}

// ============================================================================
// Action Parsing
// ============================================================================

/**
 * Parse a sequence of actions recursively
 */
function parseActionSequence(
  actionInput: YamlAction | YamlAction[] | undefined,
  sourceNode: AppNode,
  sourceNodeId: string,
  nodes: AppNodes,
  edges: AppEdges,
  getNodeId: () => string,
  getPosition: (level: number, index: number, total: number) => { x: number; y: number },
  depth: number = 0
): AppNode | undefined {
  if (!actionInput) return undefined;
  
  const actions = Array.isArray(actionInput) ? actionInput : [actionInput];
  let lastNode: AppNode | undefined;
  
  // If we're at the action level (depth 0), use level 3, otherwise increase depth
  const level = depth === 0 ? 3 : 3 + depth;
  
  actions.forEach((action, index) => {
    const actionNodeId = getNodeId();
    const actionNode = buildActionNode(action, actionNodeId, getPosition(level, index, actions.length));
    nodes.push(actionNode);
    
    // Connect from previous node to this action's input
    edges.push(buildEdge(sourceNodeId, actionNodeId, null, 'input'));
    
    // Handle conditional actions (if/then/else)
    // Only create separate nodes for then/else if they contain multiple actions
    // (i.e., they're an action group). Single actions are embedded in the parent node.
    if (action.if || action.then || action.else || action.do) {
      const thenBranch = action.then || action.do;
      const elseBranch = action.else;
      
      // Process then branch - only if it should create sub-nodes
      if (shouldCreateSubNodes(thenBranch)) {
        const thenLastNode = parseActionSequence(
          thenBranch,
          actionNode,
          actionNodeId,
          nodes,
          edges,
          getNodeId,
          getPosition,
          depth + 1
        );
        if (thenLastNode) {
          edges.push(buildEdge(actionNodeId, thenLastNode.id, 'condition-output', 'input'));
        }
      }
      
      // Process else branch - only if it should create sub-nodes
      if (shouldCreateSubNodes(elseBranch)) {
        const elseLastNode = parseActionSequence(
          elseBranch,
          actionNode,
          actionNodeId,
          nodes,
          edges,
          getNodeId,
          getPosition,
          depth + 1
        );
        if (elseLastNode) {
          edges.push(buildEdge(actionNodeId, elseLastNode.id, 'else-output', 'input'));
        }
      }
      
      lastNode = actionNode;
    } else {
      // Regular action without conditionals
      lastNode = actionNode;
    }
    
    // Update for next action in sequence
    sourceNodeId = actionNodeId;
    sourceNode = actionNode;
  });
  
  return lastNode;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate parsed YAML structure
 */
function validateYamlRule(rule: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!rule || typeof rule !== 'object') {
    errors.push('Invalid YAML: expected an object');
    return { valid: false, errors };
  }
  
  const r = rule as Record<string, unknown>;
  
  if (!r.id || typeof r.id !== 'string') {
    errors.push('Missing or invalid required field: id');
  }
  
  if (!r.on || typeof r.on !== 'string') {
    errors.push('Missing or invalid required field: on (event trigger)');
  }
  
  if (!r.do) {
    errors.push('Missing required field: do (actions)');
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse YAML content and convert to nodes and edges
 * 
 * @param yamlContent - Raw YAML string content
 * @param originalYaml - Optional original YAML string (for preserving in import result)
 * @returns ImportResponse with nodes and edges or error
 */
export function parseYamlContent(
  yamlContent: string,
  originalYaml?: string
): ImportResponse {
  try {
    // Use the new parser for validation
    const parserResult = parseYamlRules(yamlContent, {
      throwOnError: false,
      multiDocument: true
    });
    
    if (!parserResult.valid) {
      const errorMessages = parserResult.errors.map(e => {
        let msg = `Rule ${e.index + 1}: ${e.message}`;
        if (e.issues) {
          msg += ' - ' + e.issues.map(i => `[${i.path}] ${i.message}`).join(', ');
        }
        return msg;
      }).join('; ');
      
      return errorResponse(
        errorMessages || 'Invalid YAML structure',
        'INVALID_STRUCTURE' as ImportErrorCode
      );
    }
    
    if (parserResult.rules.length === 0) {
      return errorResponse(
        'No rules found in YAML',
        'INVALID_STRUCTURE' as ImportErrorCode
      );
    }
    
    // Convert TriggerRule to YamlRule for node generation
    const triggerRule = parserResult.rules[0]!;
    const rule: YamlRule = {
      id: triggerRule.id,
      on: triggerRule.on,
      name: triggerRule.name,
      description: triggerRule.description,
      priority: triggerRule.priority,
      enabled: triggerRule.enabled,
      cooldown: triggerRule.cooldown,
      tags: triggerRule.tags,
      if: triggerRule.if as YamlCondition | YamlCondition[] | undefined,
      do: triggerRule.do as YamlAction | YamlAction[] | undefined,
      else: triggerRule.else as YamlAction | YamlAction[] | undefined,
    };
    
    // Initialize builders
    const getNodeId = createNodeIdGenerator();
    const getPosition = createPositionCalculator();
    
    const nodes: AppNodes = [];
    const edges: AppEdges = [];
    
    // Create Event node
    const eventNodeId = getNodeId();
    const eventNode = buildEventNode(rule, eventNodeId, getPosition(0, 0, 1));
    nodes.push(eventNode);
    
    // Process conditions
    let lastConditionNode: AppNode | undefined;
    let lastConditionNodeId: string = eventNodeId;
    let conditionGroupNodeId: string | undefined;
    
    if (rule.if) {
      const conditions = Array.isArray(rule.if) ? rule.if : [rule.if];
      const { conditionNodes, groupNodeId } = processConditions(
        conditions,
        nodes,
        edges,
        eventNodeId,
        getNodeId,
        getPosition
      );
      
      // Store the condition group ID if it exists
      conditionGroupNodeId = groupNodeId;
      
      if (conditionNodes.length > 0) {
        lastConditionNode = conditionNodes[conditionNodes.length - 1];
        if (lastConditionNode) {
          lastConditionNodeId = lastConditionNode.id;
        }
      }
    }
    
    // Determine the source node for actions
    // If there's a condition group, connect from the group, otherwise from the last condition
    const actionSourceNodeId = conditionGroupNodeId || lastConditionNodeId || eventNodeId;
    
    // Create a dummy node object for parseActionSequence if needed
    const actionSourceNode = nodes.find(n => n.id === actionSourceNodeId) || eventNode;
    
    // Process actions (rule's 'do')
    if (rule.do) {
      // Check if 'do' is an ActionGroup (has mode and actions and is not an array)
      const doActions = Array.isArray(rule.do) ? rule.do : [rule.do];
      const firstAction = doActions[0];
      
      if (firstAction && isActionGroup(firstAction)) {
        // Create an ActionGroup node
        const actionGroupNodeId = getNodeId();
        const actionGroupNode = buildActionGroupNode(
          firstAction.mode,
          actionGroupNodeId,
          getPosition(3, 0, 1)
        );
        nodes.push(actionGroupNode);
        
        // Connect from source to action group
        edges.push(buildEdge(actionSourceNodeId, actionGroupNodeId, null, 'input'));
        
        // Process each action in the group
        firstAction.actions.forEach((action, idx) => {
          const actionNodeId = getNodeId();
          const actionNode = buildActionNode(action, actionNodeId, getPosition(4, idx, firstAction.actions!.length));
          nodes.push(actionNode);
          
          // Connect from group to action
          edges.push(buildEdge(actionGroupNodeId, actionNodeId, null, 'input'));
        });
      } else {
        // Regular action or array of actions
        parseActionSequence(
          rule.do,
          actionSourceNode,
          actionSourceNodeId,
          nodes,
          edges,
          getNodeId,
          getPosition
        );
      }
    }
    
    // Create the import result
    const result = createImportResult(nodes, edges, {
      name: rule.name,
      description: rule.description,
      format: 'yaml',
      sourceYaml: originalYaml || yamlContent,
    });
    console.log('result',JSON.stringify(result))
    return successResponse(result);
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    const lineMatch = message.match(/line (\d+)/i);
    const line = lineMatch && lineMatch[1] ? parseInt(lineMatch[1], 10) : undefined;
    
    return errorResponse(
      `Failed to parse YAML: ${message}`,
      'PARSE_ERROR' as ImportErrorCode,
      { line }
    );
  }
}

/**
 * Parse YAML from a file (string content)
 * Used by the file picker
 */
export function parseYamlFile(content: string, filename: string): ImportResponse {
  return parseYamlContent(content, content);
}

// ============================================================================
// File Picker
// ============================================================================

/**
 * Create a YAML file import picker
 * Opens a file dialog and imports the selected YAML file
 */
export function createYamlImportPicker(): Promise<ImportResponse> {
  return createYamlFilePicker(parseYamlFile);
}