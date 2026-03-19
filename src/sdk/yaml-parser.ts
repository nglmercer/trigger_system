/**
 * YAML Parser for Trigger Rules
 * 
 * This module provides a reusable YAML parser that converts YAML content
 * into TriggerRule objects with proper validation.
 * 
 * It can be used by:
 * - The Node.js loader (src/io/loader.node.ts)
 * - The React Flow editor (trigger-editor)
 * - Any other component that needs to parse trigger rules from YAML
 * 
 * Architecture:
 * - yaml-parser.ts: Main entry point and public API
 * 
 * The parser:
 * 1. Parses YAML using the yaml library
 * 2. Normalizes the structure (handles aliases like 'actions' -> 'do')
 * 3. Validates using TriggerValidator
 * 4. Returns a valid TriggerRule or throws/returns errors
 */

import { parseAllDocuments, parse as parseYaml } from 'yaml';
import type { TriggerRule, RuleCondition, Action, ActionGroup, ComparisonOperator, ExecutionMode } from '../types';
import { TriggerValidator } from '../domain/validator';

export interface YamlParserOptions {
  /**
   * Assign an ID to rules that don't have one.
   * If false, rules without IDs will fail validation.
   * If string, that string will be used as a prefix.
   * If true, a default ID will be generated from the filename (requires filename option).
   */
  autoId?: boolean | string;
  
  /**
   * Filename to use for generating rule IDs and error messages.
   * Useful when parsing from a file.
   */
  filename?: string;
  
  /**
   * Whether to throw on validation errors or return them.
   * @default false (return errors)
   */
  throwOnError?: boolean;
  
  /**
   * Whether to support multi-document YAML.
   * @default true
   */
  multiDocument?: boolean;
}

export interface YamlParserResult {
  /**
   * The parsed and validated rules
   */
  rules: TriggerRule[];
  
  /**
   * Validation errors (empty if all rules are valid)
   */
  errors: YamlParserError[];
  
  /**
   * Whether all rules are valid
   */
  valid: boolean;
}

export interface YamlParserError {
  /**
   * Index of the rule in the document (0-based)
   */
  index: number;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Path to the problematic field
   */
  path?: string;
  
  /**
   * Validation issues from TriggerValidator
   */
  issues?: Array<{
    path: string;
    message: string;
    suggestion?: string;
  }>;
}

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Check if a value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a raw YAML object to a proper TriggerRule structure
 * This handles aliases, defaults, and type conversions
 */
function normalizeRule(raw: unknown, index: number, filename?: string): Record<string, unknown> {
  if (!isObject(raw)) {
    throw new Error(`Rule at index ${index} is not an object`);
  }
  
  const rule: Record<string, unknown> = { ...raw };
  
  // Normalize 'actions' -> 'do' alias
  if ('actions' in rule && !('do' in rule)) {
    rule.do = rule.actions;
    delete rule.actions;
  }
  
  // Normalize 'else' at rule level (already handled by types, but ensure consistency)
  // If there's no 'if', there shouldn't be a 'else' at rule level
  
  // Ensure required fields have defaults
  if (!('enabled' in rule)) {
    rule.enabled = true;
  }
  
  if (!('priority' in rule)) {
    rule.priority = 0;
  }
  
  // Auto-generate ID if requested
  if (!rule.id) {
    if (filename) {
      const base = filename.replace(/\.(ya?ml)$/i, '');
      rule.id = base;
    }
  }
  
  return rule;
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse a YAML string into TriggerRule objects
 * 
 * @param yamlContent - The YAML content to parse
 * @param options - Parser options
 * @returns YamlParserResult with parsed rules and any errors
 * 
 * @example
 * // Basic usage
 * const result = parseYamlRules(`
 * - id: my-rule
 *   on: chat.message
 *   do:
 *     - type: log
 *       params: { message: "Hello" }
 * `);
 * 
 * @example
 * // With options
 * const result = parseYamlRules(yamlContent, {
 *   filename: 'rules.yaml',
 *   autoId: true,
 *   throwOnError: false
 * });
 */
export function parseYamlRules(
  yamlContent: string,
  options: YamlParserOptions = {}
): YamlParserResult {
  const {
    autoId = false,
    filename,
    throwOnError = false,
    multiDocument = true,
  } = options;
  
  const errors: YamlParserError[] = [];
  const rules: TriggerRule[] = [];
  
  try {
    // Parse YAML
    let docs: unknown[];
    
    if (multiDocument) {
      const yamlDocs = parseAllDocuments(yamlContent);
      
      // Check for YAML parsing errors
      for (const doc of yamlDocs) {
        if (doc.errors && doc.errors.length > 0) {
          const errorMessages = doc.errors.map(e => e.message).join(', ');
          throw new Error(`YAML syntax error: ${errorMessages}`);
        }
      }
      
      docs = yamlDocs.map(doc => doc.toJS());
    } else {
      const parsed = parseYaml(yamlContent);
      docs = Array.isArray(parsed) ? [parsed] : [parsed];
    }
    
    // Flatten docs if the root is an array (Single doc with list of rules)
    let flattenedDocs: unknown[] = [];
    docs.forEach(d => {
      if (Array.isArray(d)) {
        flattenedDocs.push(...d);
      } else {
        flattenedDocs.push(d);
      }
    });
    
    // Process each rule
    flattenedDocs.forEach((doc: unknown, index: number) => {
      try {
        // Normalize the rule structure
        let normalized: Record<string, unknown>;
        
        if (autoId && !filename) {
          // Auto-generate ID without filename
          normalized = { ...normalizeRule(doc, index), id: `rule-${index}` };
        } else {
          normalized = normalizeRule(doc, index, filename);
        }
        
        // Validate using TriggerValidator
        const validation = TriggerValidator.validate(normalized);
        
        if (validation.valid) {
          rules.push(validation.rule!);
        } else {
          errors.push({
            index,
            message: `Validation failed for rule at index ${index}`,
            issues: validation.issues.map(issue => ({
              path: issue.path,
              message: issue.message,
              suggestion: issue.suggestion,
            })),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : `Unknown error at index ${index}`;
        errors.push({
          index,
          message,
        });
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    errors.push({
      index: -1,
      message: `Failed to parse YAML: ${message}`,
    });
  }
  
  const result: YamlParserResult = {
    rules,
    errors,
    valid: errors.length === 0 && rules.length > 0,
  };
  
  // Throw if requested and there are errors
  if (throwOnError && !result.valid) {
    const errorMessages = result.errors.map(e => {
      let msg = `Rule ${e.index}: ${e.message}`;
      if (e.issues) {
        msg += '\n  Issues:\n' + e.issues.map(i => `    - [${i.path}] ${i.message}`).join('\n');
      }
      return msg;
    }).join('\n');
    
    throw new Error(`YAML parsing failed:\n${errorMessages}`);
  }
  
  return result;
}

/**
 * Parse a single YAML document (not multi-document)
 * Shorthand for parseYamlRules with multiDocument: false
 */
export function parseYamlRule(
  yamlContent: string,
  options: Omit<YamlParserOptions, 'multiDocument'> = {}
): YamlParserResult {
  return parseYamlRules(yamlContent, { ...options, multiDocument: false });
}

/**
 * Parse YAML and return the first valid rule
 * Throws if there are errors or no rules
 */
export function parseYamlRuleStrict(
  yamlContent: string,
  options: Omit<YamlParserOptions, 'throwOnError'> = {}
): TriggerRule {
  const result = parseYamlRules(yamlContent, { ...options, throwOnError: true });
  
  if (result.rules.length === 0) {
    throw new Error('No valid rules found in YAML');
  }
  
  return result.rules[0]!;
}

// // ============================================================================
// this Functions not work in browser only node, is not necesary, only for example 
// // ============================================================================

// /**
//  * Load and parse rules from a file path
//  * This is a Node.js specific function
//  */
// export async function loadYamlRulesFromFile(
//   filePath: string,
//   options: Omit<YamlParserOptions, 'filename'> = {}
// ): Promise<YamlParserResult> {
//   const { readFile } = await import('fs/promises');
//   const content = await readFile(filePath, 'utf-8');
//   return parseYamlRules(content, { ...options, filename: filePath });
// }

// /**
//  * Load a single rule from a file
//  * Throws if there are errors or no rules
//  */
// export async function loadYamlRuleFromFile(
//   filePath: string,
//   options?: Omit<YamlParserOptions, 'filename' | 'throwOnError'>
// ): Promise<TriggerRule> {
//   const result = await loadYamlRulesFromFile(filePath, { ...options, throwOnError: true });
//   if (result.rules.length === 0) {
//     throw new Error(`No valid rules found in ${filePath}`);
//   }
//   return result.rules[0]!;
// }

// ============================================================================
// Node/Edge Conversion Utilities for React Flow Editor
// ============================================================================

/**
 * Node types for the React Flow editor
 */
export type EditorNodeType = 'event' | 'condition' | 'condition_group' | 'action' | 'action_group';

/**
 * Basic node structure for the editor
 */
export interface EditorNode {
  id: string;
  type: EditorNodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/**
 * Basic edge structure for the editor
 */
export interface EditorEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * Result of converting a TriggerRule to nodes and edges
 */
export interface TriggerRuleToNodesResult {
  nodes: EditorNode[];
  edges: EditorEdge[];
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a condition is a condition group (has operator and nested conditions)
 */
function isConditionGroup(cond: RuleCondition): cond is { operator: 'AND' | 'OR'; conditions: RuleCondition[] } {
  return 'operator' in cond && 'conditions' in cond;
}

/**
 * Check if an action is an action group (has mode and nested actions)
 */
function isActionGroup(action: unknown): action is ActionGroup {
  return typeof action === 'object' && action !== null && 
    'mode' in action && 'actions' in action && 
    Array.isArray((action as ActionGroup).actions);
}

/**
 * Check if an action object has conditional execution (if/then/else)
 */
function hasConditionalExecution(action: unknown): action is Action & { if: RuleCondition | RuleCondition[]; then?: Action | Action[]; else?: Action | Action[] } {
  return typeof action === 'object' && action !== null && 'if' in action;
}

/**
 * Safely extract action type
 */
function getActionType(action: Action): string {
  return action.type || 'log';
}

/**
 * Safely extract and stringify action params
 */
function getActionParams(action: Action): string {
  if (!action.params) return '{}';
  return typeof action.params === 'string' ? action.params : JSON.stringify(action.params);
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
 * Build an Event node from TriggerRule
 */
function buildEventNode(
  rule: TriggerRule,
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: 'event',
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
function buildConditionGroupNode(
  operator: 'AND' | 'OR',
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: 'condition_group',
    position,
    data: {
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
): EditorNode {
  return {
    id: nodeId,
    type: 'condition',
    position,
    data: {
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
  action: Action,
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
  if (hasConditionalExecution(action)) {
    const cond = action.if;
    if (cond) {
      const conditions = Array.isArray(cond) ? cond : [cond];
      const firstCond = conditions[0];
      if (firstCond && !isConditionGroup(firstCond)) {
        conditionField = firstCond.field;
        conditionOperator = firstCond.operator;
        conditionValue = firstCond.value !== undefined 
          ? (typeof firstCond.value === 'string' ? firstCond.value : JSON.stringify(firstCond.value))
          : undefined;
      }
    }
    
    // Extract then branch
    const thenAction = action.then;
    if (thenAction) {
      const thenArr = Array.isArray(thenAction) ? thenAction : [thenAction];
      if (thenArr[0]) {
        thenType = getActionType(thenArr[0]);
        thenParams = getActionParams(thenArr[0]);
      }
    }
    
    // Extract else branch
    const elseAction = action.else;
    if (elseAction) {
      const elseArr = Array.isArray(elseAction) ? elseAction : [elseAction];
      if (elseArr[0]) {
        elseType = getActionType(elseArr[0]);
        elseParams = getActionParams(elseArr[0]);
      }
    }
  }

  const actionData: Record<string, unknown> = {
    type: getActionType(action),
    params: getActionParams(action),
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
    type: 'action',
    position,
    data: actionData,
  };
}

/**
 * Build an Action Group node
 */
function buildActionGroupNode(
  mode: ExecutionMode,
  nodeId: string,
  position: { x: number; y: number }
): EditorNode {
  return {
    id: nodeId,
    type: 'action_group',
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
function buildEdge(
  source: string,
  target: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): EditorEdge {
  return {
    id: `edge_${source}_${target}_${Date.now()}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
  };
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
  const hasAnyGroup = conditions.some(isConditionGroup);
  
  if (hasMultipleConditions || hasAnyGroup) {
    // Create a condition group node
    groupNodeId = getNodeId();
    
    // Find the operator from condition groups or default to AND
    let groupOperator: 'AND' | 'OR' = 'AND';
    const groupCond = conditions.find(isConditionGroup);
    if (groupCond) {
      groupOperator = groupCond.operator;
    }
    
    const groupNode = buildConditionGroupNode(groupOperator, groupNodeId, getPosition(1, 0, 1));
    nodes.push(groupNode);
    
    // Connect event to condition group
    edges.push(buildEdge(eventNodeId, groupNodeId, null, 'input'));
    
    // Process each condition
    let conditionHandleIndex = 0;
    
    conditions.forEach((cond, idx) => {
      if (isConditionGroup(cond)) {
        // Skip logical conditions as they define the group, process their nested conditions
        if (cond.conditions) {
          cond.conditions.forEach((nestedCond, nestedIdx) => {
            if (isConditionGroup(nestedCond)) return; // Skip nested groups for now
            
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
    
    if (isConditionGroup(cond)) {
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
// Action Processing
// ============================================================================

/**
 * Check if action should create separate then/else nodes
 */
function shouldCreateSubNodes(action: unknown): boolean {
  return typeof action === 'object' && action !== null && 
    ('then' in action || 'else' in action);
}

/**
 * Parse a sequence of actions recursively
 */
function parseActionSequence(
  actions: (Action | ActionGroup)[],
  sourceNodeId: string,
  nodes: EditorNode[],
  edges: EditorEdge[],
  getNodeId: () => string,
  getPosition: (level: number, index: number, total: number) => { x: number; y: number },
  depth: number = 0
): void {
  const level = 3 + depth;
  
  actions.forEach((action, index) => {
    // Skip action groups at this level, they should be handled separately
    if (isActionGroup(action)) {
      return;
    }
    
    const actionNodeId = getNodeId();
    const actionNode = buildActionNode(action, actionNodeId, getPosition(level, index, actions.length));
    nodes.push(actionNode);
    
    // Connect from previous node to this action's input
    edges.push(buildEdge(sourceNodeId, actionNodeId, null, 'input'));
    
    // Handle conditional actions (if/then/else)
    if (shouldCreateSubNodes(action)) {
      const thenBranch = (action as Action).then;
      const elseBranch = (action as Action).else;
      
      // Process then branch
      if (thenBranch) {
        const thenActions = Array.isArray(thenBranch) ? thenBranch : [thenBranch];
        parseActionSequence(
          thenActions,
          actionNodeId,
          nodes,
          edges,
          getNodeId,
          getPosition,
          depth + 1
        );
      }
      
      // Process else branch
      if (elseBranch) {
        const elseActions = Array.isArray(elseBranch) ? elseBranch : [elseBranch];
        // Create edge to else actions
        if (elseActions.length > 0 && elseActions[0]) {
          const elseFirstId = getNodeId();
          const elseFirstNode = buildActionNode(elseActions[0] as Action, elseFirstId, getPosition(level + 1, 0, elseActions.length));
          nodes.push(elseFirstNode);
          edges.push(buildEdge(actionNodeId, elseFirstId, 'else-output', 'input'));
          
          // Process remaining else actions
          for (let i = 1; i < elseActions.length; i++) {
            if (!elseActions[i]) continue;
            const elseNodeId = getNodeId();
            const elseNode = buildActionNode(elseActions[i] as Action, elseNodeId, getPosition(level + 1, i, elseActions.length));
            nodes.push(elseNode);
            edges.push(buildEdge(elseFirstId, elseNodeId, null, 'input'));
          }
        }
      }
    }
  });
}

// ============================================================================
// Main Conversion Function
// ============================================================================

/**
 * Convert a TriggerRule to React Flow nodes and edges
 * 
 * This function takes a parsed TriggerRule and converts it to a format
 * that can be used by the React Flow editor.
 * 
 * @param rule - The TriggerRule to convert
 * @returns TriggerRuleToNodesResult with nodes, edges, and any errors
 * 
 * @example
 * const result = parseYamlRules(yamlContent);
 * if (result.valid && result.rules.length > 0) {
 *   const nodesResult = triggerRuleToNodes(result.rules[0]);
 *   // Use nodesResult.nodes and nodesResult.edges in React Flow
 * }
 */
export function triggerRuleToNodes(rule: TriggerRule): TriggerRuleToNodesResult {
  const errors: string[] = [];
  const nodes: EditorNode[] = [];
  const edges: EditorEdge[] = [];
  
  // Validate required fields
  if (!rule.id) {
    errors.push('Missing required field: id');
  }
  
  if (!rule.on) {
    errors.push('Missing required field: on (event trigger)');
  }
  
  if (!rule.do) {
    errors.push('Missing required field: do (actions)');
  }
  
  if (errors.length > 0) {
    return {
      nodes: [],
      edges: [],
      valid: false,
      errors,
    };
  }
  
  // Initialize builders
  const getNodeId = createNodeIdGenerator();
  const getPosition = createPositionCalculator();
  
  // Create Event node
  const eventNodeId = getNodeId();
  const eventNode = buildEventNode(rule, eventNodeId, getPosition(0, 0, 1));
  nodes.push(eventNode);
  
  // Process conditions
  let lastConditionNodeId: string = eventNodeId;
  let conditionGroupNodeId: string | undefined;
  
  if (rule.if) {
    const conditions = Array.isArray(rule.if) ? rule.if : [rule.if];
    const { groupNodeId } = processConditions(
      conditions,
      nodes,
      edges,
      eventNodeId,
      getNodeId,
      getPosition
    );
    
    conditionGroupNodeId = groupNodeId;
    
    // Update lastConditionNodeId to the last condition
    const conditionEdges = edges.filter(e => 
      e.source === (groupNodeId || eventNodeId)
    );
    if (conditionEdges.length > 0) {
      lastConditionNodeId = conditionEdges[conditionEdges.length - 1]!.target;
    } else if (groupNodeId) {
      lastConditionNodeId = groupNodeId;
    }
  }
  
  // Determine the source node for actions
  const actionSourceNodeId = conditionGroupNodeId || lastConditionNodeId || eventNodeId;
  
  // Track if we've already processed actions (to avoid duplicate processing)
  let actionsProcessed = false;
  
  // Process actions (rule's 'do')
  if (rule.do && !actionsProcessed) {
    const doActions = Array.isArray(rule.do) ? rule.do : [rule.do];
    
    // Check if 'do' is an ActionGroup (has mode and actions)
    if (doActions.length === 1 && isActionGroup(doActions[0]!)) {
      const actionGroup = doActions[0];
      
      // Check if the action group contains a single action with conditional execution (if/then/else)
      // In this case, we should connect conditions directly to that conditional action
      // rather than going through the action group
      if (actionGroup.actions && actionGroup.actions.length === 1) {
        const singleAction = actionGroup.actions[0];
        
        // If the single action has conditional execution (if/then/else)
        if (hasConditionalExecution(singleAction)) {
          // Create the conditional action node directly (connected from conditions)
          const conditionalActionNodeId = getNodeId();
          const conditionalActionNode = buildActionNode(
            singleAction as Action,
            conditionalActionNodeId,
            getPosition(3, 0, 1)
          );
          nodes.push(conditionalActionNode);
          
          // Connect from source (condition group) to conditional action
          edges.push(buildEdge(actionSourceNodeId, conditionalActionNodeId, null, 'input'));
          
          // Process then branch
          const thenBranch = (singleAction as Action).then;
          if (thenBranch) {
            const thenActions = Array.isArray(thenBranch) ? thenBranch : [thenBranch];
            if (thenActions.length > 0 && thenActions[0]) {
              const thenFirstId = getNodeId();
              const thenFirstNode = buildActionNode(
                thenActions[0] as Action,
                thenFirstId,
                getPosition(4, 0, thenActions.length)
              );
              nodes.push(thenFirstNode);
              edges.push(buildEdge(conditionalActionNodeId, thenFirstId, 'then-output', 'input'));
              
              // Process remaining then actions
              for (let i = 1; i < thenActions.length; i++) {
                if (!thenActions[i]) continue;
                const thenNodeId = getNodeId();
                const thenNode = buildActionNode(
                  thenActions[i] as Action,
                  thenNodeId,
                  getPosition(4, i, thenActions.length)
                );
                nodes.push(thenNode);
                edges.push(buildEdge(thenFirstId, thenNodeId, null, 'input'));
              }
            }
          }
          
          // Process else branch - use level 5 to separate from then branch
          const elseBranch = (singleAction as Action).else;
          if (elseBranch) {
            const elseActions = Array.isArray(elseBranch) ? elseBranch : [elseBranch];
            if (elseActions.length > 0 && elseActions[0]) {
              const elseFirstId = getNodeId();
              const elseFirstNode = buildActionNode(
                elseActions[0] as Action,
                elseFirstId,
                getPosition(5, 0, elseActions.length)
              );
              nodes.push(elseFirstNode);
              edges.push(buildEdge(conditionalActionNodeId, elseFirstId, 'else-output', 'input'));
              
              // Process remaining else actions
              for (let i = 1; i < elseActions.length; i++) {
                if (!elseActions[i]) continue;
                const elseNodeId = getNodeId();
                const elseNode = buildActionNode(
                  elseActions[i] as Action,
                  elseNodeId,
                  getPosition(5, i, elseActions.length)
                );
                nodes.push(elseNode);
                edges.push(buildEdge(elseFirstId, elseNodeId, null, 'input'));
              }
            }
          }
          
          // Mark as processed
          actionsProcessed = true;
        }
      }
      
      // Default: Create an ActionGroup node for non-conditional actions
      if (!actionsProcessed) {
        const actionGroupNodeId = getNodeId();
        const actionGroupNode = buildActionGroupNode(
          actionGroup.mode,
          actionGroupNodeId,
          getPosition(3, 0, 1)
        );
        nodes.push(actionGroupNode);
        
        // Connect from source to action group
        edges.push(buildEdge(actionSourceNodeId, actionGroupNodeId, null, 'input'));
        
        // Process each action in the group
        if (actionGroup.actions) {
          actionGroup.actions.forEach((action, idx) => {
            const actionNodeId = getNodeId();
            const actionNode = buildActionNode(
              action as Action,
              actionNodeId,
              getPosition(4, idx, actionGroup.actions!.length)
            );
            nodes.push(actionNode);
            
            // Connect from group to action
            edges.push(buildEdge(actionGroupNodeId, actionNodeId, null, 'input'));
          });
        }
        
        actionsProcessed = true;
      }
    } else {
      // Regular action or array of actions
      parseActionSequence(
        doActions,
        actionSourceNodeId,
        nodes,
        edges,
        getNodeId,
        getPosition
      );
      
      actionsProcessed = true;
    }
  }
  
  // Process else branch at rule level
  if (rule.else) {
    const elseActions = Array.isArray(rule.else) ? rule.else : [rule.else];
    const elseFirstId = getNodeId();
    const elseFirstNode = buildActionNode(elseActions[0] as Action, elseFirstId, getPosition(3, 0, elseActions.length));
    nodes.push(elseFirstNode);
    
    // Connect from condition group or last condition to else
    edges.push(buildEdge(actionSourceNodeId, elseFirstId, 'else-output', 'input'));
    
    // Process remaining else actions
    for (let i = 1; i < elseActions.length; i++) {
      const elseNodeId = getNodeId();
      const elseNode = buildActionNode(elseActions[i] as Action, elseNodeId, getPosition(3, i, elseActions.length));
      nodes.push(elseNode);
      edges.push(buildEdge(elseFirstId, elseNodeId, null, 'input'));
    }
  }
  
  return {
    nodes,
    edges,
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert parsed YAML rules to React Flow nodes and edges
 * Shorthand for using parseYamlRules + triggerRuleToNodes
 * 
 * @param yamlContent - The YAML content to parse
 * @param options - Parser options
 * @returns Object with nodes, edges, and error information
 */
export function yamlToNodes(
  yamlContent: string,
  options: YamlParserOptions = {}
): TriggerRuleToNodesResult & { parserErrors: YamlParserError[] } {
  const parserResult = parseYamlRules(yamlContent, { ...options, throwOnError: false });
  
  if (!parserResult.valid || parserResult.rules.length === 0) {
    const errorMessages = parserResult.errors.map(e => {
      let msg = `Rule ${e.index + 1}: ${e.message}`;
      if (e.issues) {
        msg += ' - ' + e.issues.map(i => `[${i.path}] ${i.message}`).join(', ');
      }
      return msg;
    });
    
    return {
      nodes: [],
      edges: [],
      valid: false,
      errors: errorMessages,
      parserErrors: parserResult.errors,
    };
  }
  
  // Convert the first rule to nodes
  const nodesResult = triggerRuleToNodes(parserResult.rules[0]!);
  
  return {
    ...nodesResult,
    parserErrors: parserResult.errors,
  };
}
