import { describe, it, expect } from 'bun:test';
import { RuleBuilder } from '../src/sdk/builder';
import { RuleExporter } from '../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge } from '../src/types';

describe('Browser graph - User case with else branch', () => {
  it('should handle user case with else branch correctly', () => {
    const nodes: SDKGraphNode[] = [
      { id: "node_pan8m", type: "event", data: { id: "rule-u67sv", name: "New Rule", enabled: true, priority: 0, event: "123", _id: "node_pan8m" } },
      { id: "node_ajclf", type: "condition", data: { _id: "node_ajclf" } },
      { id: "node_p0llv", type: "do", data: { branchType: "do", _id: "node_p0llv" } },
      { id: "node_ox5fw", type: "condition_group", data: { _id: "node_ox5fw" } },
      { id: "node_5q5qi", type: "condition", data: { _id: "node_5q5qi", value: "123" } },
      { id: "node_tpsvm", type: "condition", data: { _id: "node_tpsvm" } },
      { id: "node_jetdx", type: "action", data: { _id: "node_jetdx" } },
      { id: "node_r8hio", type: "do", data: { branchType: "do", _id: "node_r8hio" } },
      { id: "node_vidw7", type: "action", data: { _id: "node_vidw7" } },
      { id: "node_2nlk2", type: "action", data: { _id: "node_2nlk2" } },
      { id: "node_jcfoh", type: "action", data: { _id: "node_jcfoh", type: "fetch" } },
      { id: "node_id2if", type: "do", data: { branchType: "else", _id: "node_id2if" } }
    ];

    const edges: SDKGraphEdge[] = [
      { source: 'node_pan8m', target: 'node_ox5fw', sourceHandle: null, targetHandle: 'input' },
      { source: 'node_ox5fw', target: 'node_ajclf', sourceHandle: 'cond-output', targetHandle: 'condition-input' },
      { source: 'node_ajclf', target: 'node_5q5qi', sourceHandle: 'output', targetHandle: 'condition-input' },
      { source: 'node_5q5qi', target: 'node_p0llv', sourceHandle: 'output', targetHandle: 'do-input' },
      { source: 'node_p0llv', target: 'node_tpsvm', sourceHandle: 'do-condition-output', targetHandle: 'condition-input' },
      { source: 'node_p0llv', target: 'node_jetdx', sourceHandle: 'do-output', targetHandle: 'action-input' },
      { source: 'node_tpsvm', target: 'node_r8hio', sourceHandle: 'output', targetHandle: 'do-input' },
      { source: 'node_r8hio', target: 'node_vidw7', sourceHandle: 'do-output', targetHandle: 'action-input' },
      { source: 'node_r8hio', target: 'node_2nlk2', sourceHandle: 'do-condition-output', targetHandle: 'action-input' },
      { source: 'node_5q5qi', target: 'node_id2if', sourceHandle: 'output', targetHandle: 'do-input' },
      { source: 'node_id2if', target: 'node_jcfoh', sourceHandle: 'do-output', targetHandle: 'action-input' }
    ];

    const builder = RuleBuilder.fromGraph(nodes, edges);
    const rule = builder.build();

    console.log('Generated rule:', JSON.stringify(rule, null, 2));
    console.log('Generated YAML:');
    console.log(RuleExporter.toCleanYaml(rule));

    expect(rule.id).toBe('rule-u67sv');
    expect(rule.on).toBe('123');
    expect(rule.if).toBeDefined();
    expect(rule.do).toBeDefined();
    
    // The else branch should have the fetch action
    const doBlock = rule.do as any;
    if (doBlock.else) {
      expect(doBlock.else.type).toBe('fetch');
    }
  });
});
