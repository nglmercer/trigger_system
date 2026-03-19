import { describe, it, expect } from 'bun:test';
import { RuleBuilder } from '../src/sdk/builder';
import { RuleExporter } from '../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge, TriggerRule, ActionGroup, InlineConditionalAction } from '../src/types';

/**
 * Test Graph Structure:
 * 
 * event(node_pan8m) 
 *   → condition_group(node_ox5fw) 
 *     → condition(node_ajclf) 
 *       → condition(node_5q5qi: value="123")
 *         → do(node_p0llv: branchType="do")
 *           → condition(node_tpsvm: value="subelement")
 *             → do(node_r8hio: branchType="do") 
 *               → action(node_vidw7: type="log2")
 *             → do(node_opdm5: branchType="else")
 *               → action(node_d04p6: type="log3")
 *         → do(node_id2if: branchType="else")
 *           → action(node_jcfoh: type="log4")
 * 
 * Expected Rule Structure:
 * - if: AND condition [data="", data="123"]
 * - do: ActionGroup with nested inline conditional
 *   - The inline conditional should have: if(data="subelement") then(log2) else(log3)
 * - else: log4
 */

const SDKGraphEdges: SDKGraphEdge[] = [
  // Event → Condition Group
  { source: 'node_pan8m', target: 'node_ox5fw', sourceHandle: null, targetHandle: 'input' },
  // Condition Group → Condition
  { source: 'node_ox5fw', target: 'node_ajclf', sourceHandle: 'cond-output', targetHandle: 'condition-input' },
  // Condition → Condition (chained)
  { source: 'node_ajclf', target: 'node_5q5qi', sourceHandle: 'output', targetHandle: 'condition-input' },
  // Condition → DO (then branch)
  { source: 'node_5q5qi', target: 'node_p0llv', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Condition (inline conditional)
  { source: 'node_p0llv', target: 'node_tpsvm', sourceHandle: 'do-condition-output', targetHandle: 'condition-input' },
  // Condition → DO (then branch)
  { source: 'node_tpsvm', target: 'node_r8hio', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Action
  { source: 'node_r8hio', target: 'node_vidw7', sourceHandle: 'do-output', targetHandle: 'action-input' },
  // Condition → DO (else branch)
  { source: 'node_tpsvm', target: 'node_opdm5', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Action
  { source: 'node_opdm5', target: 'node_d04p6', sourceHandle: 'do-output', targetHandle: 'action-input' },
  // Condition → DO (else branch from first condition)
  { source: 'node_5q5qi', target: 'node_id2if', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Action (else action for rule)
  { source: 'node_id2if', target: 'node_jcfoh', sourceHandle: 'do-output', targetHandle: 'action-input' },
];

const SDKGraphNodes: SDKGraphNode[] = [
  {
    id: 'node_pan8m',
    type: 'event',
    data: {
      id: 'rule-u67sv',
      name: 'New Rule',
      enabled: true,
      priority: 0,
      event: '123',
      _id: 'node_pan8m',
    },
  },
  {
    id: 'node_ox5fw',
    type: 'condition_group',
    data: {
      _id: 'node_ox5fw',
    },
  },
  {
    id: 'node_ajclf',
    type: 'condition',
    data: {
      _id: 'node_ajclf',
    },
  },
  {
    id: 'node_5q5qi',
    type: 'condition',
    data: {
      _id: 'node_5q5qi',
      field: 'data',
      operator: 'EQ',
      value: '123',
    },
  },
  {
    id: 'node_p0llv',
    type: 'do',
    data: {
      branchType: 'do',
      _id: 'node_p0llv',
    },
  },
  {
    id: 'node_tpsvm',
    type: 'condition',
    data: {
      _id: 'node_tpsvm',
      field: 'data',
      operator: 'EQ',
      value: 'subelement',
    },
  },
  {
    id: 'node_r8hio',
    type: 'do',
    data: {
      branchType: 'do',
      _id: 'node_r8hio',
    },
  },
  {
    id: 'node_vidw7',
    type: 'action',
    data: {
      _id: 'node_vidw7',
      type: 'log2',
    },
  },
  {
    id: 'node_opdm5',
    type: 'do',
    data: {
      branchType: 'else',
      _id: 'node_opdm5',
    },
  },
  {
    id: 'node_d04p6',
    type: 'action',
    data: {
      _id: 'node_d04p6',
      type: 'log3',
    },
  },
  {
    id: 'node_id2if',
    type: 'do',
    data: {
      branchType: 'else',
      _id: 'node_id2if',
    },
  },
  {
    id: 'node_jcfoh',
    type: 'action',
    data: {
      _id: 'node_jcfoh',
      type: 'log4',
    },
  },
];

describe('Browser graph - Nested DO with inline condition and else', () => {
  /**
   * Expected behavior:
   * 
   * Graph topology:
   *   event → condition_group → condition("") → condition("123") 
   *     → DO(do) → condition("subelement") → DO(do) → action(log2)
   *                                     → DO(else) → action(log3)
   *     → DO(else) → action(log4)
   * 
   * Expected rule output:
   *   if: { operator: AND, conditions: [{field: data, operator: EQ, value: ""}, {field: data, operator: EQ, value: "123"}] }
   *   do: 
   *     # This is an inline conditional - the condition comes from the nested structure
   *     if: { field: data, operator: EQ, value: "subelement" }
   *     do: { type: log2 }  # then action
   *     else: { type: log3 } # else action
   *   else: [{ type: log4 }]  # rule-level else
   */
  
  it('should correctly parse nested DO nodes with inline conditionals', () => {
    const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
    const rule = builder.build();

    console.log('Generated rule:', JSON.stringify(rule, null, 2));
    const yaml = RuleExporter.toCleanYaml(rule);
    console.log('Generated YAML:');
    console.log(yaml);

    // Verify basic rule properties
    expect(rule.id).toBe('rule-u67sv');
    expect(rule.on).toBe('123');
    expect(rule.name).toBe('New Rule');
    expect(rule.enabled).toBe(true);
    expect(rule.priority).toBe(0);

    // Verify IF conditions exist and have correct structure
    expect(rule.if).toBeDefined();
    const ruleIf = rule.if as any;
    if (ruleIf && typeof ruleIf === 'object' && 'operator' in ruleIf) {
      expect(ruleIf.operator).toBe('AND');
      expect(ruleIf.conditions).toBeDefined();
      expect(Array.isArray(ruleIf.conditions)).toBe(true);
      expect(ruleIf.conditions.length).toBeGreaterThanOrEqual(2);
    }

    // Verify DO structure exists
    expect(rule.do).toBeDefined();

    // BUG: rule.else is not being set - log4 should be at rule level
    // Currently log4 is incorrectly placed inside do.else
    // Expected: rule.else = [{ type: 'log4', params: {} }]
    // Actual: rule.else = undefined
    console.log('=== ISSUE: rule.else is undefined, should have log4 ===');

    // Check the YAML output - verify log2 and log3 are present
    // BUG: log2 and log3 are missing from output!
    expect(yaml).toContain('log2'); // This will FAIL - log2 is missing
    expect(yaml).toContain('log3'); // This will FAIL - log3 is missing
    expect(yaml).toContain('log4');
    expect(yaml).toContain('subelement');

    // Additional diagnostics
    console.log('=== DO Structure ===');
    console.log(JSON.stringify(rule.do, null, 2));
    console.log('=== ELSE Structure ===');
    console.log(JSON.stringify(rule.else, null, 2));
  });

  it('should produce inline conditional with then/else actions for nested condition', () => {
    const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
    const rule = builder.build();

    // The do should contain an inline conditional action with the NESTED condition (subelement)
    // NOT the root condition group
    const doAny = rule.do as any;
    
    // BUG: do.if should have field: "data", operator: "EQ", value: "subelement"
    // But currently it has the root condition group (data="" AND data="123")
    console.log('=== BUG: do.if has wrong condition ===');
    console.log('Expected: { field: data, operator: EQ, value: subelement }');
    console.log('Actual:', JSON.stringify(doAny?.if, null, 2));
    
    if (doAny && doAny.if) {
      // This is the inline conditional
      // BUG: if.field should be "data" and if.value should be "subelement"
      // Currently it's getting the wrong condition
      expect(doAny.if.field).toBe('data');
      expect(doAny.if.value).toBe('subelement');
      
      // Should have 'do' (then) with log2
      expect(doAny.do).toBeDefined();
      expect(doAny.do.type).toBe('log2');
      
      // Should have 'else' with log3
      expect(doAny.else).toBeDefined();
      expect(doAny.else.type).toBe('log3');
    }
  });
});
