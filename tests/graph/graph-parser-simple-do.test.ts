import { describe, it, expect } from 'bun:test';
import { RuleBuilder } from '../../src/sdk/builder';
import { RuleExporter } from '../../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge, TriggerRule } from '../../src/types';

/**
 * Test Graph Structure (simple case from browser):
 * 
 * event(node_olhsh) 
 *   → condition(node_87255: field="data", value="100")
 *     → do(node_ycmr1: branchType="do")
 *       → action(node_ahnb2: type="log do")
 *     → do(node_bm0qi: branchType="else")
 *       → action(node_3n87q: type="log else")
 * 
 * Expected Rule Structure:
 * - if: { field: data, operator: EQ, value: "100" }
 * - do: { type: log do, params: {} }
 * - else: { type: log else, params: {} }
 */

const SDKGraphEdges: SDKGraphEdge[] = [
  // Event → Condition
  { source: 'node_olhsh', target: 'node_87255', sourceHandle: 'event-output', targetHandle: 'condition-input' },
  // Condition → DO (then branch)
  { source: 'node_87255', target: 'node_ycmr1', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Action (do action)
  { source: 'node_ycmr1', target: 'node_ahnb2', sourceHandle: 'do-output', targetHandle: 'action-input' },
  // Condition → DO (else branch)
  { source: 'node_87255', target: 'node_bm0qi', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Action (else action)
  { source: 'node_bm0qi', target: 'node_3n87q', sourceHandle: 'do-output', targetHandle: 'action-input' },
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
    id: 'node_87255',
    type: 'condition',
    data: {
      _id: 'node_87255',
      field: 'data',
      operator: 'EQ',
      value: '100',
    },
  },
  {
    id: 'node_ycmr1',
    type: 'do',
    data: {
      branchType: 'do',
      _id: 'node_ycmr1',
    },
  },
  {
    id: 'node_ahnb2',
    type: 'action',
    data: {
      _id: 'node_ahnb2',
      type: 'log do',
      params: {},
    },
  },
  {
    id: 'node_bm0qi',
    type: 'do',
    data: {
      branchType: 'else',
      _id: 'node_bm0qi',
    },
  },
  {
    id: 'node_3n87q',
    type: 'action',
    data: {
      _id: 'node_3n87q',
      type: 'log else',
      params: {},
    },
  },
];

describe('Simple DO branch with single action', () => {
  /**
   * Graph topology:
   *   event → condition("100") 
   *     → DO(do) → action(log do)
   *     → DO(else) → action(log else)
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
   *     type: log do
   *     params: {}
   *   else:
   *     type: log else
   *     params: {}
   */
  
  it('should correctly parse simple condition with do and else branches', () => {
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
    expect(rule.enabled).toBe(true);
    expect(rule.priority).toBe(0);

    // Verify IF condition exists and has correct structure
    expect(rule.if).toBeDefined();
    const ruleIf = rule.if as any;
    expect(ruleIf.field).toBe('data');
    expect(ruleIf.operator).toBe('EQ');
    expect(ruleIf.value).toBe('100');

    // Verify DO structure - should be a single action, NOT wrapped in ActionGroup
    expect(rule.do).toBeDefined();
    const ruleDo = rule.do as any;
    
    // Should be a direct action, not an ActionGroup with mode ALL
    expect(ruleDo.type).toBe('log do');
    expect(ruleDo.params).toEqual({});
    
    // Should NOT be wrapped in { mode: 'ALL', actions: [...] }
    expect(ruleDo.mode).toBeUndefined();
    expect(ruleDo.actions).toBeUndefined();

    // Verify ELSE structure - should be a single action, NOT wrapped in ActionGroup
    expect(rule.else).toBeDefined();
    const ruleElse = rule.else as any;
    
    // Should be a direct action, not an ActionGroup with mode ALL
    expect(ruleElse.type).toBe('log else');
    expect(ruleElse.params).toEqual({});
    
    // Should NOT be wrapped in { mode: 'ALL', actions: [...] }
    expect(ruleElse.mode).toBeUndefined();
    expect(ruleElse.actions).toBeUndefined();
  });

  it('should generate clean YAML without mode ALL wrapper for single actions', () => {
    const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
    const rule = builder.build();
    const yaml = RuleExporter.toCleanYaml(rule);

    console.log('Generated YAML:');
    console.log(yaml);

    // Should have log do action
    expect(yaml).toContain('type: log do');
    
    // Should have log else action
    expect(yaml).toContain('type: log else');
    
    // Should NOT have mode: ALL wrapping single actions
    // The bug was outputting: do: { mode: ALL, actions: [...] }
    // Expected: do: { type: log do, params: {} }
    expect(yaml).not.toContain('mode: ALL');
    expect(yaml).not.toContain('mode:ALL');
  });
});
