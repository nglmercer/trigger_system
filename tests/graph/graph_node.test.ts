import { describe, it, expect } from 'bun:test';
import { RuleBuilder } from '../../src/sdk/builder';
import { RuleExporter } from '../../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge, TriggerRule, ActionGroup, InlineConditionalAction } from '../../src/types';

/**
 * Test Graph Structure:
 * 
 * event(node_pan8m) 
 *   → condition_group(node_ox5fw) 
 *     → condition(node_ajclf) 
 *       → condition(node_5q5qi: value="123")
 *         → do(node_p0llv: branchType="do")
 *           → action(node_gbjua: type="log1") [direct action BEFORE inline conditional]
 *           → condition(node_tpsvm: value="subelement")
 *             → do(node_r8hio: branchType="do") 
 *               → action(node_vidw7: type="log2")
 *             → do(node_opdm5: branchType="else")
 *               → action(node_d04p6: type="log3")
 *         → do(node_id2if: branchType="else")
 *           → action(node_jcfoh: type="log4")
 *           → condition(node_kg846: value="321")
 *             → action(node_10dh8: type="log5")
 * 
 * Expected Rule Structure:
 * - if: AND condition [data="", data="123"]
 * - do: ActionGroup with mode: ALL and actions:
 *   - { type: log1 }
 *   - { if: { field: data, operator: EQ, value: subelement }, do: { type: log2 }, else: { type: log3 } }
 * - else: ActionGroup with actions:
 *   - { type: log4 }
 *   - { if: { field: data, operator: EQ, value: 321 }, do: { type: log5 } }
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
  // DO → Action (direct action BEFORE inline conditional)
  { source: 'node_p0llv', target: 'node_gbjua', sourceHandle: 'do-output', targetHandle: 'action-input' },
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
  // Condition → DO (else branch from first condition - rule else)
  { source: 'node_5q5qi', target: 'node_id2if', sourceHandle: 'output', targetHandle: 'do-input' },
  // DO → Action (else action for rule - first action before inline conditional)
  { source: 'node_id2if', target: 'node_jcfoh', sourceHandle: 'do-output', targetHandle: 'action-input' },
  // DO → Condition (inline conditional for else)
  { source: 'node_id2if', target: 'node_kg846', sourceHandle: 'do-condition-output', targetHandle: 'condition-input' },
  // Condition → Action (do action for else inline conditional)
  { source: 'node_kg846', target: 'node_10dh8', sourceHandle: 'output', targetHandle: 'action-input' },
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
    id: 'node_gbjua',
    type: 'action',
    data: {
      _id: 'node_gbjua',
      type: 'log1',
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
  {
    id: 'node_kg846',
    type: 'condition',
    data: {
      _id: 'node_kg846',
      field: 'data',
      operator: 'EQ',
      value: '321',
    },
  },
  {
    id: 'node_10dh8',
    type: 'action',
    data: {
      _id: 'node_10dh8',
      type: 'log5',
    },
  },
];

describe('Browser graph - Nested DO with inline condition and else', () => {
  /**
   * Expected behavior:
   * 
   * Graph topology:
   *   event → condition_group → condition("") → condition("123") 
   *     → DO(do) → action(log1)
   *             → condition("subelement") → DO(do) → action(log2)
   *                                   → DO(else) → action(log3)
   *     → DO(else) → action(log4)
   *                   → condition("321") → action(log5)
   * 
   * Expected rule output:
   *   if: { operator: AND, conditions: [{field: data, operator: EQ, value: ""}, {field: data, operator: EQ, value: "123"}] }
   *   do: 
   *     # ActionGroup with mode ALL
   *     mode: ALL
   *     actions:
   *       - { type: log1 }  # Direct action before inline conditional
   *       - { if: { field: data, operator: EQ, value: "subelement" }, do: { type: log2 }, else: { type: log3 } }  # Inline conditional
   *   else:
   *     # ActionGroup or array with:
   *     - { type: log4 }  # Direct action before inline conditional
   *     - { if: { field: data, operator: EQ, value: "321" }, do: { type: log5 } }  # Inline conditional for else
   */
  
  it('should correctly parse nested DO nodes with inline conditionals and multiple actions', () => {
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

    // Check the YAML output - verify log1, log2, log3 are present in do
    expect(yaml).toContain('log1'); // Action before inline conditional
    expect(yaml).toContain('log2'); // Then action of inline conditional
    expect(yaml).toContain('log3'); // Else action of inline conditional
    
    // Check the YAML output - verify log4 and log5 are present in else
    expect(yaml).toContain('log4'); // Action before inline conditional in else
    expect(yaml).toContain('log5'); // Then action of inline conditional in else
    
    // Verify subelement and 321 conditions are present
    expect(yaml).toContain('subelement');
    expect(yaml).toContain('321');

    // Additional diagnostics
    console.log('=== DO Structure ===');
    console.log(JSON.stringify(rule.do, null, 2));
    console.log('=== ELSE Structure ===');
    console.log(JSON.stringify(rule.else, null, 2));
  });

  it('should have action group with log1 before inline conditional in do', () => {
    const builder = RuleBuilder.fromGraph(SDKGraphNodes, SDKGraphEdges);
    const rule = builder.build();
    const yaml = RuleExporter.toCleanYaml(rule);

    // The do should be an ActionGroup with actions array
    const doAny = rule.do as any;
    
    // Check that do is an action group or has actions
    expect(doAny).toBeDefined();
    
    // Should have log1 in the do section
    expect(yamlContainsAction(yaml, 'log1')).toBe(true);
    
    // Should have inline conditional with subelement
    expect(yamlContainsCondition(yaml, 'subelement')).toBe(true);
  });
});

// Helper function to check if YAML contains an action type
function yamlContainsAction(yaml: string, actionType: string): boolean {
  return yaml.includes(`type: ${actionType}`);
}

// Helper function to check if YAML contains a condition value
function yamlContainsCondition(yaml: string, value: string): boolean {
  return yaml.includes(`value: ${value}`);
}
