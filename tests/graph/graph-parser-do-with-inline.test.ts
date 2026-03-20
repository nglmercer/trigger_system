import { describe, it, expect } from 'bun:test';
import { RuleBuilder } from '../../src/sdk/builder';
import { RuleExporter } from '../../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge, TriggerRule } from '../../src/types';

/**
 * Test Graph Structure:
 * 
 * event(node_olhsh) 
 *   → condition(node_fyw7k: field="data", value="100")
 *     → do(node_emxhk: branchType="do")
 *       → action_group(node_ztb4i)
 *         → action(node_p81h6: type="log1")
 *         → action(node_9bskf: type="log2")
 *       → condition(node_bouiv: inline conditional)
 *         → action(node_s4swq: type="log3")
 *     → do(node_awu2w: branchType="else")
 *       → action(node_6ak3y: type="logelse")
 * 
 * Expected Rule Structure:
 * - if: { field: data, operator: EQ, value: "100" }
 * - do: ActionGroup with mode ALL containing:
 *   - { type: log1 }
 *   - { type: log2 }
 *   - { if: { field: data, operator: EQ, value: "" }, do: { type: log3 } }  <- inline conditional WITHOUT else
 * - else: { type: logelse }
 */

const SDKGraphEdges: SDKGraphEdge[] = [
  // Event → Condition
  { source: 'node_olhsh', target: 'node_fyw7k', sourceHandle: 'event-output', targetHandle: 'condition-input' },
  // Condition → DO (then branch)
  { source: 'node_fyw7k', target: 'node_emxhk', sourceHandle: 'output', targetHandle: 'do-input' },
  // Condition → DO (else branch)
  { source: 'node_fyw7k', target: 'node_awu2w', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO(do) → ActionGroup
  { source: 'node_emxhk', target: 'node_ztb4i', sourceHandle: 'do-output', targetHandle: 'input' },
  // ActionGroup → Action (log1)
  { source: 'node_ztb4i', target: 'node_p81h6', sourceHandle: 'action-output', targetHandle: 'action-input' },
  // Action(log1) → Action(log2) - chained
  { source: 'node_p81h6', target: 'node_9bskf', sourceHandle: 'action-output', targetHandle: 'action-input' },
  // DO(do) → Condition (inline conditional)
  { source: 'node_emxhk', target: 'node_bouiv', sourceHandle: 'do-condition-output', targetHandle: 'condition-input' },
  // Condition → Action (log3 - then action for inline conditional)
  { source: 'node_bouiv', target: 'node_s4swq', sourceHandle: 'output', targetHandle: 'action-input' },
  // DO(else) → Action (logelse - this is the rule's else, NOT the inline conditional's else)
  { source: 'node_awu2w', target: 'node_6ak3y', sourceHandle: 'do-output', targetHandle: 'action-input' },
];

const SDKGraphNodes: SDKGraphNode[] = [
  {
    id: 'node_olhsh',
    type: 'event',
    data: {
      id: 'rule-6x7vq',
      name: '123',
      enabled: true,
      priority: 0,
      event: '123',
      _id: 'node_olhsh',
    },
  },
  {
    id: 'node_fyw7k',
    type: 'condition',
    data: {
      _id: 'node_fyw7k',
      field: 'data',
      operator: 'EQ',
      value: '100',
    },
  },
  {
    id: 'node_emxhk',
    type: 'do',
    data: {
      branchType: 'do',
      _id: 'node_emxhk',
    },
  },
  {
    id: 'node_awu2w',
    type: 'do',
    data: {
      branchType: 'else',
      _id: 'node_awu2w',
    },
  },
  {
    id: 'node_ztb4i',
    type: 'action_group',
    data: {
      _id: 'node_ztb4i',
    },
  },
  {
    id: 'node_p81h6',
    type: 'action',
    data: {
      _id: 'node_p81h6',
      type: 'log1',
      params: {},
    },
  },
  {
    id: 'node_9bskf',
    type: 'action',
    data: {
      _id: 'node_9bskf',
      type: 'log2',
      params: {},
    },
  },
  {
    id: 'node_bouiv',
    type: 'condition',
    data: {
      _id: 'node_bouiv',
      field: 'data',
      operator: 'EQ',
      value: '',
    },
  },
  {
    id: 'node_s4swq',
    type: 'action',
    data: {
      _id: 'node_s4swq',
      type: 'log3',
      params: {},
    },
  },
  {
    id: 'node_6ak3y',
    type: 'action',
    data: {
      _id: 'node_6ak3y',
      type: 'logelse',
      params: {},
    },
  },
];

describe('DO with inline conditional and separate else branch', () => {
  /**
   * Graph topology:
   *   event → condition("100") 
   *     → DO(do) → action_group → log1, log2
   *             → condition("") → log3 (inline conditional - DO branch)
   *     → DO(else) → logelse (rule else - should NOT be in inline conditional)
   * 
   * Expected rule output:
   *   id: rule-6x7vq
   *   name: "123"
   *   on: "123"
   *   if:
   *     field: data
   *     operator: EQ
   *     value: "100"
   *   do:
   *     mode: ALL
   *     actions:
   *       - type: log1
   *       - type: log2
   *       - if:
   *           field: data
   *           operator: EQ
   *           value: ""
   *         do:
   *           type: log3
   *   else:
   *     type: logelse
   */
  
  it('should correctly separate inline conditional else from rule else', () => {
    const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
    const rule = builder.build();

    console.log('Generated rule:', JSON.stringify(rule, null, 2));
    const yaml = RuleExporter.toCleanYaml(rule);
    console.log('Generated YAML:');
    console.log(yaml);

    // Verify basic rule properties
    expect(rule.id).toBe('rule-6x7vq');
    expect(rule.on).toBe('123');
    expect(rule.name).toBe('123');

    // Verify DO structure - should have action group with log1, log2, and inline conditional
    expect(rule.do).toBeDefined();
    const ruleDo = rule.do as any;
    
    // Should be an ActionGroup with mode ALL
    expect(ruleDo.mode).toBe('ALL');
    expect(ruleDo.actions).toBeDefined();
    expect(ruleDo.actions.length).toBe(3);
    
    // First two actions should be log1 and log2
    expect(ruleDo.actions[0].type).toBe('log1');
    expect(ruleDo.actions[1].type).toBe('log2');
    
    // Third action should be inline conditional
    const inlineCond = ruleDo.actions[2] as any;
    expect(inlineCond.if).toBeDefined();
    expect(inlineCond.do).toBeDefined();
    // The inline conditional should NOT have an else - that's the rule's else!
    expect(inlineCond.else).toBeUndefined();

    // Verify ELSE structure - should be a single action (logelse), NOT part of inline conditional
    expect(rule.else).toBeDefined();
    const ruleElse = rule.else as any;
    expect(ruleElse.type).toBe('logelse');
    expect(ruleElse.params).toEqual({});
  });

  it('should generate YAML with else at root level, not nested in inline conditional', () => {
    const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
    const rule = builder.build();
    const yaml = RuleExporter.toCleanYaml(rule);

    console.log('Generated YAML:');
    console.log(yaml);

    // Should have log1, log2, log3 in do section
    expect(yaml).toContain('type: log1');
    expect(yaml).toContain('type: log2');
    expect(yaml).toContain('type: log3');
    
    // Should have logelse in else section (root level)
    expect(yaml).toContain('else:');
    expect(yaml).toContain('type: logelse');
    
    // The inline conditional should NOT have else inside it
    // This is the bug - currently it's outputting:
    //   - if:
    //       ...
    //     do:
    //       type: log3
    //     else:
    //       type: logelse
    // Instead it should be:
    //   - if:
    //       ...
    //     do:
    //       type: log3
    // else:
    //   type: logelse
    
    // Check that the inline conditional's else is NOT present
    // (This is the key bug - the else should be at root level, not nested)
    const doSection = yaml.split('else:')[0];
    const elseSection = yaml.split('else:')[1];
    
    // The inline conditional should NOT contain else
    expect(doSection).not.toMatch(/if:[\s\S]*else:/);
  });
});
