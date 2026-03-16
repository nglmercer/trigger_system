import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { RuleBuilder } from '../../../src/sdk/builder.ts';
import { RuleExporter } from '../../../src/sdk/exporter.ts';
import { NodeType } from '../constants.ts';
import type { 
  EventNodeData, 
  ConditionNodeData, 
  ConditionGroupNodeData, 
  ActionNodeData, 
  ActionGroupNodeData 
} from '../types.ts';
import type { ComparisonOperator, RuleCondition, Action, ActionGroup, ExecutionMode, TriggerRule } from '../../../src/types.ts';

export interface BuildResult {
  rule: TriggerRule | null;
  errors: string[];
  yaml: string;
}

export function useRuleBuilder(nodes: Node[], edges: Edge[]) {
  const buildRule = useCallback((): BuildResult => {
    const errors: string[] = [];
    try {
      const eventNode = nodes.find((n) => n.type === NodeType.EVENT) as Node<EventNodeData> | undefined;
      if (!eventNode) {
        errors.push("Missing 'Event Trigger' node.");
        return { rule: null, errors, yaml: '' };
      }

      const { id: ruleId, event: eventName, name: ruleName, description, priority, enabled, cooldown, tags } = eventNode.data;
      if (!ruleId) errors.push("Rule ID is required in the Event node.");
      if (!eventName) errors.push("Event Name is required in the Event node.");

      if (errors.length > 0) return { rule: null, errors, yaml: '' };

      const builder = new RuleBuilder();
      builder.withId(ruleId).on(eventName);
      if (ruleName) builder.withName(ruleName);
      if (description) builder.withDescription(description);
      if (priority !== undefined) builder.withPriority(priority);
      if (enabled !== undefined) builder.withEnabled(enabled);
      if (cooldown !== undefined) builder.withCooldown(cooldown);
      if (tags && tags.length > 0) builder.withTags(tags);

      const resolveCondition = (nodeId: string, visited = new Set<string>()): RuleCondition | null => {
        if (visited.has(nodeId)) {
          errors.push("Circular dependency detected in conditions.");
          return null;
        }
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        if (node.type === NodeType.CONDITION) {
          const { field, operator, value } = node.data as ConditionNodeData;
          if (!field || !operator) {
            errors.push(`Condition node "${node.id}" is missing field or operator.`);
            return null;
          }
          return { field, operator: operator as ComparisonOperator, value };
        } 
        
        if (node.type === NodeType.CONDITION_GROUP) {
          const { operator } = node.data as ConditionGroupNodeData;
          const subEdges = edges.filter(e => e.source === nodeId);
          const subConditions = subEdges
            .map(e => resolveCondition(e.target, visited))
            .filter((c): c is RuleCondition => c !== null);
          
          if (subConditions.length === 0) {
             errors.push(`Condition Group "${node.id}" has no connected sub-conditions.`);
             return null;
          }
          return { operator: (operator || 'AND') as 'AND' | 'OR', conditions: subConditions };
        }
        return null;
      };

      const resolveAction = (nodeId: string, visited = new Set<string>()): Action | null => {
        if (visited.has(nodeId)) {
          errors.push("Circular dependency detected in actions.");
          return null;
        }
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        if (node.type === NodeType.ACTION) {
          const { type, params } = node.data as ActionNodeData;
          if (!type) {
            errors.push(`Action node "${node.id}" is missing a type.`);
            return null;
          }
          try {
            const parsedParams = params ? (typeof params === 'string' ? JSON.parse(params) : params) : {};
            return { type, params: parsedParams };
          } catch (e) {
            return { type, params: {} };
          }
        } 
        
        if (node.type === NodeType.ACTION_GROUP) {
          const { mode } = node.data as ActionGroupNodeData;
          const subEdges = edges.filter(e => e.source === nodeId);
          const subActions = subEdges
            .map(e => resolveAction(e.target, visited))
            .filter((a): a is Action => a !== null);
          
          if (subActions.length === 0) {
            errors.push(`Action Group "${node.id}" has no connected actions.`);
            return null;
          }
          return { 
            mode: (mode || 'ALL') as ExecutionMode, 
            actions: subActions 
          } as any;
        }
        return null;
      };

      const rootEdges = edges.filter(e => e.source === eventNode.id);
      const conditions: RuleCondition[] = [];
      const actions: (Action | ActionGroup)[] = [];

      rootEdges.forEach(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!targetNode) return;

        if (targetNode.type === NodeType.CONDITION || targetNode.type === NodeType.CONDITION_GROUP) {
          const cond = resolveCondition(edge.target);
          if (cond) conditions.push(cond);
        } else if (targetNode.type === NodeType.ACTION || targetNode.type === NodeType.ACTION_GROUP) {
          const act = resolveAction(edge.target);
          if (act) actions.push(act);
        }
      });

      if (conditions.length > 0) {
        builder.withIf(conditions.length === 1 ? conditions[0]! : conditions);
      }

      if (actions.length > 0) {
        if (actions.length === 1) builder.withDo(actions[0]!);
        else builder.withDo(actions as Action[]);
      }

      const rule = builder.build();
      return { 
        rule, 
        errors, 
        yaml: rule ? RuleExporter.toCleanYaml(rule) : '' 
      };
    } catch (e) {
      console.error('Error building rule:', e);
      return { rule: null, errors: [String(e)], yaml: '' };
    }
  }, [nodes, edges]);

  return buildRule;
}
