import { parse as parseYaml } from 'yaml';
import type { Edge } from '@xyflow/react';
import type {
  EventNodeData,
  ConditionNodeData,
  ConditionGroupNodeData,
  ActionNodeData,
  ActionGroupNodeData,
} from '../types';
import type { Node } from '@xyflow/react';

export type AppNode = Node<
  | EventNodeData
  | ConditionNodeData
  | ConditionGroupNodeData
  | ActionNodeData
  | ActionGroupNodeData
>;

// YAML Rule structure types
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
}

interface YamlCondition {
  field?: string;
  operator?: string;
  value?: unknown;
  conditions?: YamlCondition[];
}

interface YamlLogicalCondition {
  operator: 'AND' | 'OR';
  conditions: YamlCondition[];
}

type AnyYamlCondition = YamlCondition | YamlLogicalCondition;

interface YamlAction {
  type?: string;
  params?: Record<string, unknown>;
  mode?: string;
  actions?: YamlAction[];
}

/**
 * Parse YAML content and convert to nodes and edges
 */
export function parseYamlToNodes(yamlContent: string): { nodes: AppNode[]; edges: Edge[] } {
  const parsed = parseYaml(yamlContent);
  
  // Handle both single rule and array of rules
  const rules: YamlRule[] = Array.isArray(parsed) ? parsed : [parsed];
  
  if (rules.length === 0) {
    throw new Error('No rules found in YAML');
  }
  
  // Take the first rule for now (multi-rule support could be added later)
  const rule = rules[0]!;
  
  const nodes: AppNode[] = [];
  const edges: Edge[] = [];
  
  let nodeIdCounter = 0;
  const getNodeId = () => `node_${nodeIdCounter++}`;
  
  // Calculate positions for nice layout
  const getPosition = (level: number, index: number, total: number) => ({
    x: 100 + level * 300,
    y: 100 + index * 150 - (total * 75)
  });
  
  // Create Event node
  const eventNodeId = getNodeId();
  const eventNode: AppNode = {
    id: eventNodeId,
    type: 'event',
    position: getPosition(0, 0, 1),
    data: {
      onChange: () => {},
      id: rule.id || 'rule-1',
      name: rule.name || 'Imported Rule',
      description: rule.description || '',
      event: rule.on || '',
      priority: rule.priority || 0,
      enabled: rule.enabled !== false,
      cooldown: rule.cooldown,
      tags: rule.tags
    }
  };
  nodes.push(eventNode);
  
  // Process conditions
  const conditionNodes: AppNode[] = [];
  let conditionGroupNodeId: string | undefined = undefined;
  
  if (rule.if) {
    const conditions = Array.isArray(rule.if) ? rule.if : [rule.if];
    
    // Check if we have multiple conditions or logical conditions (need a condition group)
    const hasLogicalCondition = (c: AnyYamlCondition): boolean => {
      return 'operator' in c && 'conditions' in c;
    };
    
    const hasMultipleConditions = conditions.length > 1;
    const hasAnyLogical = conditions.some(hasLogicalCondition);
    
    if (hasMultipleConditions || hasAnyLogical) {
      // Create a condition group node
      conditionGroupNodeId = getNodeId();
      
      // Find the operator from logical conditions or default to AND
      let groupOperator: 'AND' | 'OR' = 'AND';
      const logicalCond = conditions.find((c): c is YamlLogicalCondition => hasLogicalCondition(c));
      if (logicalCond) {
        groupOperator = logicalCond.operator;
      }
      
      const groupNode: AppNode = {
        id: conditionGroupNodeId,
        type: 'condition_group',
        position: getPosition(1, 0, 1),
        data: {
          onChange: () => {},
          operator: groupOperator
        }
      };
      nodes.push(groupNode);
      
      // Connect event to condition group
      edges.push({
        id: `edge_${eventNodeId}_${conditionGroupNodeId}`,
        source: eventNodeId,
        target: conditionGroupNodeId,
        sourceHandle: null,
        targetHandle: 'input'
      });
      
      // Process each condition
      conditions.forEach((cond, idx) => {
        if (hasLogicalCondition(cond)) {
          // Skip logical conditions as they define the group, process their nested conditions
          if (cond.conditions) {
            cond.conditions.forEach((nestedCond, nestedIdx) => {
              const condNodeId = getNodeId();
              const condNode: AppNode = {
                id: condNodeId,
                type: 'condition',
                position: getPosition(2, idx * 2 + nestedIdx, conditions.length * 2),
                data: {
                  onChange: () => {},
                  field: nestedCond.field || 'data',
                  operator: (nestedCond.operator as ConditionNodeData['operator']) || 'EQ',
                  value: nestedCond.value ?? ''
                }
              };
              nodes.push(condNode);
              conditionNodes.push(condNode);
              
              // Connect condition group to condition
              edges.push({
                id: `edge_${conditionGroupNodeId}_${condNodeId}_${idx}_${nestedIdx}`,
                source: conditionGroupNodeId!,
                target: condNodeId,
                sourceHandle: `cond-${idx}`,
                targetHandle: 'input'
              });
            });
          }
        } else {
          const condNodeId = getNodeId();
          const condNode: AppNode = {
            id: condNodeId,
            type: 'condition',
            position: getPosition(2, idx, conditions.length),
            data: {
              onChange: () => {},
              field: cond.field || 'data',
              operator: (cond.operator as ConditionNodeData['operator']) || 'EQ',
              value: cond.value ?? ''
            }
          };
          nodes.push(condNode);
          conditionNodes.push(condNode);
          
          // Connect condition group to condition
          edges.push({
            id: `edge_${conditionGroupNodeId}_${condNodeId}_${idx}`,
            source: conditionGroupNodeId!,
            target: condNodeId,
            sourceHandle: `cond-${idx}`,
            targetHandle: 'input'
          });
        }
      });
    } else if (conditions.length === 1) {
      // Single condition - connect directly to event
      const cond = conditions[0]!;
      const condNodeId = getNodeId();
      const condNode: AppNode = {
        id: condNodeId,
        type: 'condition',
        position: getPosition(1, 0, 1),
        data: {
          onChange: () => {},
          field: cond.field || 'data',
          operator: (cond.operator as ConditionNodeData['operator']) || 'EQ',
          value: cond.value ?? ''
        }
      };
      nodes.push(condNode);
      conditionNodes.push(condNode);
      
      // Connect event to condition
      edges.push({
        id: `edge_${eventNodeId}_${condNodeId}`,
        source: eventNodeId,
        target: condNodeId,
        sourceHandle: null,
        targetHandle: 'input'
      });
    }
  }
  
  // Process actions
  if (rule.do) {
    const actions = Array.isArray(rule.do) ? rule.do : [rule.do];
    
    // Check if we have multiple actions or nested actions (need an action group)
    const hasNestedActions = actions.some(a => a.actions && a.actions.length > 0);
    
    if (actions.length > 1 || hasNestedActions) {
      // Create an action group node
      const actionGroupNodeId = getNodeId();
      const firstAction = actions[0];
      const groupMode = firstAction?.mode || 'ALL';
      
      const groupNode: AppNode = {
        id: actionGroupNodeId,
        type: 'action_group',
        position: getPosition(conditionNodes.length > 0 ? 2 : 1, 0, 1),
        data: {
          onChange: () => {},
          mode: groupMode as ActionGroupNodeData['mode']
        }
      };
      nodes.push(groupNode);
      
      // Connect from condition(s) to action group
      if (conditionNodes.length > 0) {
        const lastCondition = conditionNodes[conditionNodes.length - 1];
        edges.push({
          id: `edge_${lastCondition!.id}_${actionGroupNodeId}`,
          source: lastCondition!.id,
          target: actionGroupNodeId,
          sourceHandle: null,
          targetHandle: 'input'
        });
      } else {
        // No conditions - connect directly from event
        edges.push({
          id: `edge_${eventNodeId}_${actionGroupNodeId}`,
          source: eventNodeId,
          target: actionGroupNodeId,
          sourceHandle: null,
          targetHandle: 'input'
        });
      }
      
      // Process each action
      actions.forEach((action, idx) => {
        const actionNodeId = getNodeId();
        const actionNode: AppNode = {
          id: actionNodeId,
          type: 'action',
          position: getPosition(3, idx, actions.length),
          data: {
            onChange: () => {},
            type: action.type || 'log',
            params: typeof action.params === 'string' ? action.params : JSON.stringify(action.params || {})
          }
        };
        nodes.push(actionNode);
        
        // Connect action group to action
        edges.push({
          id: `edge_${actionGroupNodeId}_${actionNodeId}_${idx}`,
          source: actionGroupNodeId,
          target: actionNodeId,
          sourceHandle: `act-${idx}`,
          targetHandle: 'input'
        });
      });
    } else if (actions.length === 1) {
      // Single action - connect directly from condition(s) or event
      const action = actions[0]!;
      const actionNodeId = getNodeId();
      const actionNode: AppNode = {
        id: actionNodeId,
        type: 'action',
        position: getPosition(conditionNodes.length > 0 ? 2 : 1, 0, 1),
        data: {
          onChange: () => {},
          type: action.type || 'log',
          params: typeof action.params === 'string' ? action.params : JSON.stringify(action.params || {})
        }
      };
      nodes.push(actionNode);
      
      if (conditionNodes.length > 0) {
        const lastCondition = conditionNodes[conditionNodes.length - 1];
        edges.push({
          id: `edge_${lastCondition!.id}_${actionNodeId}`,
          source: lastCondition!.id,
          target: actionNodeId,
          sourceHandle: null,
          targetHandle: 'input'
        });
      } else {
        // No conditions - connect directly from event
        edges.push({
          id: `edge_${eventNodeId}_${actionNodeId}`,
          source: eventNodeId,
          target: actionNodeId,
          sourceHandle: null,
          targetHandle: 'input'
        });
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Create a file input for importing YAML files
 * Returns a promise that resolves with the parsed nodes and edges
 */
export function createYamlImportPicker(): Promise<{ nodes: AppNode[]; edges: Edge[] } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      try {
        const text = await file.text();
        const result = parseYamlToNodes(text);
        resolve(result);
      } catch (err) {
        console.error('Failed to read YAML file:', err);
        resolve(null);
      }
    };
    
    input.click();
  });
}
