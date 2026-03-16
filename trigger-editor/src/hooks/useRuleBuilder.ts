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
      // 1. Find the Root Event Node
      const eventNode = nodes.find((n) => n.type === NodeType.EVENT) as Node<EventNodeData> | undefined;
      if (!eventNode) {
        errors.push("Missing 'Event Trigger' node. Start by dragging one to the canvas.");
        return { rule: null, errors, yaml: '' };
      }

      const { id: ruleId, event: eventName, name: ruleName, description, priority, enabled, cooldown, tags } = eventNode.data;
      if (!ruleId) errors.push("Rule ID is required (Event Node).");
      if (!eventName) errors.push("Event Name is required (e.g. PAYMENT_RECEIVED).");

      if (errors.length > 0) return { rule: null, errors, yaml: '' };

      const builder = new RuleBuilder();
      builder.withId(ruleId).on(eventName);
      if (ruleName) builder.withName(ruleName);
      if (description) builder.withDescription(description);
      if (priority !== undefined) builder.withPriority(Number(priority));
      if (enabled !== undefined) builder.withEnabled(!!enabled);
      if (cooldown !== undefined) builder.withCooldown(Number(cooldown));
      if (tags && tags.length > 0) builder.withTags(tags);

      // Helper to check node categories
      const isConditionNode = (n: Node) => n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP;
      const isActionNode = (n: Node) => n.type === NodeType.ACTION || n.type === NodeType.ACTION_GROUP;

      // 2. Identify Reachable Nodes from Event
      const reachableNodesIds = new Set<string>();
      const queue = [eventNode.id];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (reachableNodesIds.has(currentId)) continue;
        reachableNodesIds.add(currentId);
        edges.filter(e => e.source === currentId).forEach(e => queue.push(e.target));
      }

      // 3. Resolve Conditions and Actions (Recursive with Category Aggregation)
      const resolveCondition = (nodeId: string, visited = new Set<string>()): RuleCondition | null => {
        if (visited.has(nodeId)) {
          errors.push("Recursive loop detected in conditions.");
          return null;
        }
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        let result: RuleCondition | null = null;

        if (node.type === NodeType.CONDITION) {
          const { field, operator, value } = node.data as ConditionNodeData;
          if (!field) errors.push(`Condition node "${node.id}" has no field defined.`);
          if (!operator) errors.push(`Condition node "${node.id}" has no operator defined.`);
          result = { field: field || '', operator: (operator as ComparisonOperator) || 'EQ', value };
        } else if (node.type === NodeType.CONDITION_GROUP) {
          const { operator } = node.data as ConditionGroupNodeData;
          const subEdges = edges.filter(e => e.source === nodeId);
          const subConds = subEdges
            .map(e => resolveCondition(e.target, new Set(visited)))
            .filter((c): c is RuleCondition => c !== null);
          
          if (subConds.length === 0) {
            errors.push(`Condition Group "${node.id}" is empty.`);
            return null;
          }
          result = { operator: (operator || 'AND') as 'AND' | 'OR', conditions: subConds };
        }

        // Handle DOWNSTREAM Chaining: If a condition leads to another condition, they are ANDed
        if (result) {
          const downstreamCondNodes = edges
            .filter(e => e.source === nodeId)
            .map(e => nodes.find(n => n.id === e.target))
            .filter((n): n is Node => !!n && isConditionNode(n));
          
          if (downstreamCondNodes.length > 0) {
            const downstreamResolved = downstreamCondNodes
              .map(n => resolveCondition(n.id, new Set(visited)))
              .filter((c): c is RuleCondition => c !== null);
            
            if (downstreamResolved.length > 0) {
              return { operator: 'AND', conditions: [result, ...downstreamResolved] };
            }
          }
        }

        return result;
      };

      const resolveAction = (nodeId: string, visited = new Set<string>()): (Action | ActionGroup) | null => {
        if (visited.has(nodeId)) {
          errors.push("Recursive loop detected in actions.");
          return null;
        }
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        let result: (Action | ActionGroup) | null = null;

        if (node.type === NodeType.ACTION) {
          const { type, params } = node.data as ActionNodeData;
          if (!type) {
            errors.push(`Action node "${node.id}" has no type.`);
            return null;
          }
          try {
            const parsedParams = params ? (typeof params === 'string' ? JSON.parse(params) : params) : {};
            result = { type, params: parsedParams };
          } catch (e) {
            errors.push(`Action node "${node.id}" has invalid JSON parameters.`);
            result = { type, params: {} };
          }
        } else if (node.type === NodeType.ACTION_GROUP) {
          const { mode } = node.data as ActionGroupNodeData;
          const subEdges = edges.filter(e => e.source === nodeId);
          const subActions = subEdges
            .map(e => resolveAction(e.target, new Set(visited)))
            .filter((a): a is (Action | ActionGroup) => a !== null);
          
          if (subActions.length === 0) {
            errors.push(`Action Group "${node.id}" is empty.`);
            return null;
          }
          result = { mode: (mode || 'ALL') as ExecutionMode, actions: subActions };
        }

        // Handle DOWNSTREAM Chaining: If an action leads to another action, they are ALL part of the flow
        if (result) {
          const downstreamActionNodes = edges
            .filter(e => e.source === nodeId)
            .map(e => nodes.find(n => n.id === e.target))
            .filter((n): n is Node => !!n && isActionNode(n));
          
          if (downstreamActionNodes.length > 0) {
            const downstreamResolved = downstreamActionNodes
              .map(n => resolveAction(n.id, new Set(visited)))
              .filter((a): a is (Action | ActionGroup) => a !== null);
            
            if (downstreamResolved.length > 0) {
              return { mode: 'ALL', actions: [result, ...downstreamResolved]};
            }
          }
        }

        return result;
      };

      // 4. Find Entry points for Conditions and Actions
      const entryConditionsIds: string[] = [];
      const entryActionsIds: string[] = [];

      reachableNodesIds.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.type === NodeType.EVENT) return;

        // An Entry node is a node reachable from Event, but whose parents in the SAME category are NOT reachable from the same path
        // In simple terms: It's an Action directly connected to a Non-Action (Event or Condition), or a Condition connected to non-Condition.
        const parents = edges.filter(e => e.target === nodeId).map(e => nodes.find(n => n.id === e.source));
        
        if (isConditionNode(node)) {
          const isTargetOfSameCategory = parents.some(p => p && isConditionNode(p));
          if (!isTargetOfSameCategory) entryConditionsIds.push(nodeId);
        } else if (isActionNode(node)) {
          const isTargetOfSameCategory = parents.some(p => p && isActionNode(p));
          if (!isTargetOfSameCategory) entryActionsIds.push(nodeId);
        }
      });

      const rootConditions = entryConditionsIds
        .map(id => resolveCondition(id))
        .filter((c): c is RuleCondition => c !== null);
      
      const rootActions = entryActionsIds
        .map(id => resolveAction(id))
        .filter((a): a is (Action | ActionGroup) => a !== null);

      if (rootConditions.length > 0) {
        builder.withIf(rootConditions.length === 1 ? rootConditions[0]! : { operator: 'AND', conditions: rootConditions });
      }

      if (rootActions.length > 0) {
        builder.withDo(rootActions.length === 1 ? rootActions[0]! : rootActions);
      } else {
        errors.push("Rule has no actions connected.");
      }

      const rule = errors.length === 0 ? builder.build() : null;
      return { 
        rule, 
        errors, 
        yaml: rule ? RuleExporter.toCleanYaml(rule) : '' 
      };
    } catch (e) {
      console.error('Core Engine build error:', e);
      return { rule: null, errors: ["Critical error in rule generation. Check console."], yaml: '' };
    }
  }, [nodes, edges]);

  return buildRule;
}
