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
    const resolvedActions = new Map<string, any>();
    const resolvedConditions = new Map<string, any>();
    const consumed = new Set<string>();

    try {
      const eventNode = nodes.find((n) => n.type === NodeType.EVENT) as Node<EventNodeData> | undefined;
      if (!eventNode) return { rule: null, errors: ["Missing Event Trigger"], yaml: '' };

      const { id: ruleId, event: eventName } = eventNode.data;
      if (!ruleId || !eventName) {
        errors.push("Rule ID and Event Name are required");
        return { rule: null, errors, yaml: '' };
      }

      const builder = new RuleBuilder();
      const ed = eventNode.data;
      builder.id(ed.id).on(ed.event);
      if (ed.name) builder.name(ed.name);
      if (ed.description) builder.description(ed.description);
      if (ed.priority !== undefined) builder.priority(Number(ed.priority));
      if (ed.enabled !== undefined) builder.enabled(!!ed.enabled);
      if (ed.cooldown !== undefined) builder.cooldown(Number(ed.cooldown));
      if (ed.tags) builder.tags(ed.tags);

      // --- HELPERS ---
      const isCond = (n: Node) => n.type === NodeType.CONDITION || n.type === NodeType.CONDITION_GROUP;
      const isAct = (n: Node) => n.type === NodeType.ACTION || n.type === NodeType.ACTION_GROUP;

      // --- RESOLVERS ---
      const resolveCondition = (id: string, visited = new Set<string>()): RuleCondition | null => {
        if (visited.has(id)) return null;
        if (resolvedConditions.has(id)) return JSON.parse(JSON.stringify(resolvedConditions.get(id)));
        
        const node = nodes.find(n => n.id === id);
        if (!node || !isCond(node)) return null;
        visited.add(id);

        let res: RuleCondition;
        if (node.type === NodeType.CONDITION) {
          const d = node.data as ConditionNodeData;
          res = { field: d.field || 'data', operator: (d.operator as ComparisonOperator) || 'EQ', value: d.value || '' };
          // Chain
          const next = edges.filter(e => e.source === id && !e.sourceHandle?.startsWith('cond')).map(e => {
            consumed.add(e.target);
            return resolveCondition(e.target, new Set(visited));
          }).filter((c): c is RuleCondition => c !== null);
          if (next.length > 0) res = { operator: 'AND', conditions: [res, ...next] };
        } else {
          const d = node.data as ConditionGroupNodeData;
          const members = edges.filter(e => e.source === id && e.sourceHandle?.startsWith('cond')).map(e => {
            consumed.add(e.target);
            return resolveCondition(e.target, new Set(visited));
          }).filter((c): c is RuleCondition => c !== null);
          if (members.length === 0) return null;
          res = { operator: (d.operator || 'AND') as 'AND' | 'OR', conditions: members };
        }

        resolvedConditions.set(id, res);
        return res;
      };

      const resolveAction = (id: string, visited = new Set<string>()): (Action | ActionGroup) | null => {
        if (visited.has(id)) return null;
        if (resolvedActions.has(id)) return JSON.parse(JSON.stringify(resolvedActions.get(id)));

        const node = nodes.find(n => n.id === id);
        if (!node || !isAct(node)) return null;
        visited.add(id);

        let res: Action | ActionGroup;
        if (node.type === NodeType.ACTION) {
          const d = node.data as ActionNodeData;
          let p = {}; try { p = d.params ? (typeof d.params === 'string' ? JSON.parse(d.params) : d.params) : {}; } catch { p = {}; }
          res = { type: d.type || 'log', params: p };
          // Chain
          const next = edges.filter(e => e.source === id).map(e => {
            consumed.add(e.target);
            return resolveAction(e.target, new Set(visited));
          }).filter((a): a is (Action | ActionGroup) => a !== null);
          if (next.length > 0) res = { mode: 'ALL', actions: [res, ...next] };
        } else {
          const d = node.data as ActionGroupNodeData;
          const members = edges.filter(e => e.source === id).map(e => {
            consumed.add(e.target);
            return resolveAction(e.target, new Set(visited));
          }).filter((a): a is (Action | ActionGroup) => a !== null);
          if (members.length === 0) return null;
          res = { mode: (d.mode || 'ALL') as ExecutionMode, actions: members };
        }

        resolvedActions.set(id, res);
        return res;
      };

      // --- EXECUTION ---
      const eventEdges = edges.filter(e => e.source === eventNode.id);
      const seedNodes = eventEdges.map(e => ({ target: e.target, handle: e.sourceHandle }));

      // Pass 1: Resolve all seeds
      const condSeeds: { id: string, res: RuleCondition }[] = [];
      const actSeeds: { id: string, res: Action | ActionGroup }[] = [];

      seedNodes.forEach(s => {
        const n = nodes.find(node => node.id === s.target);
        if (!n) return;
        if (isCond(n)) {
          const r = resolveCondition(s.target);
          if (r) condSeeds.push({ id: s.target, res: r });
          if (n.type === NodeType.CONDITION_GROUP) {
            edges.filter(e => e.source === n.id && e.sourceHandle === 'action').forEach(ae => {
              const ra = resolveAction(ae.target);
              if (ra) actSeeds.push({ id: ae.target, res: ra });
            });
          }
        } else if (isAct(n)) {
          const r = resolveAction(s.target);
          if (r) actSeeds.push({ id: s.target, res: r });
        }
      });

      // Pass 2: Filter non-consumed roots
      const rootConds = condSeeds.filter(s => !consumed.has(s.id)).map(s => s.res);
      const rootActs = actSeeds.filter(s => !consumed.has(s.id)).map(s => s.res);

      // Pass 3: De-duplicate and assemble
      const finalConds = Array.from(new Set(rootConds.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
      const finalActs = Array.from(new Set(rootActs.map(a => JSON.stringify(a)))).map(s => JSON.parse(s));

      if (finalConds.length > 0) {
        builder.withIf(finalConds.length === 1 ? finalConds[0] : { operator: 'AND', conditions: finalConds });
      }

      if (finalActs.length > 0) {
        builder.withDo(finalActs.length === 1 ? finalActs[0] : finalActs);
      } else {
        errors.push("No actions connected to the flow.");
      }

      const rule = builder.build();
      return { rule, errors, yaml: RuleExporter.toCleanYaml(rule) };

    } catch (e: any) {
      return { rule: null, errors: [e.message || String(e)], yaml: '' };
    }
  }, [nodes, edges]);

  return buildRule;
}
