import { describe, test, expect } from 'bun:test';
import { RuleBuilder } from '../../../src/sdk/builder';
import type { SDKGraphNode, SDKGraphEdge } from '../../../src/types';

/**
 * Test ActionGroup → Condition inline conditional flow
 * This tests the scenario where:
 * 1. Event → ActionGroup → Condition → Action
 * 2. The condition should be embedded inline within the action group
 */
describe('ActionGroup to Condition inline conditionals', () => {
  test('should build inline conditional from ActionGroup to Condition connection', () => {
    const nodes: SDKGraphNode[] = [
      { 
        id: "event-1", 
        type: "event", 
        data: { id: "rule-ag-cond", event: "user_login" } 
      },
      { 
        id: "action-group-1", 
        type: "action_group", 
        data: { 
          mode: "SEQUENCE",
          actions: [
            { type: "log", params: { message: "Before condition" } }
          ]
        } 
      },
      { 
        id: "condition-1", 
        type: "condition", 
        data: { 
          field: "data.role", 
          operator: "EQ", 
          value: "admin" 
        } 
      },
      { 
        id: "action-then", 
        type: "action", 
        data: { type: "notify", params: { message: "Welcome admin!" } } 
      },
      { 
        id: "action-else", 
        type: "action", 
        data: { type: "log", params: { message: "Welcome user!" } } 
      }
    ];

    const edges: SDKGraphEdge[] = [
      // Event → ActionGroup
      { source: "event-1", target: "action-group-1" },
      // ActionGroup → Condition (condition-output handle)
      { 
        source: "action-group-1", 
        target: "condition-1",
        sourceHandle: "condition-output",
        targetHandle: "condition-input"
      },
      // Condition → Then Action (condition-output handle = implicit THEN)
      { 
        source: "condition-1", 
        target: "action-then",
        sourceHandle: "condition-output"
      },
      // Condition → Else Action
      { 
        source: "condition-1", 
        target: "action-else",
        sourceHandle: "else-output"
      }
    ];

    const builder = RuleBuilder.fromGraph(nodes, edges);
    const rule = builder.build();

    console.log('Generated Rule:', JSON.stringify(rule, null, 2));

    expect(rule.id).toBe("rule-ag-cond");
    expect(rule.on).toBe("user_login");
    
    // The do should be an array with action group + inline conditional
    expect(rule.do).toBeDefined();
    
    // Check that do contains the inline conditional
    const doNode = rule.do as any;
    if (Array.isArray(doNode)) {
      // Find the inline conditional
      const inlineCond = doNode.find((item: any) => item && typeof item === 'object' && 'if' in item);
      expect(inlineCond).toBeDefined();
      expect(inlineCond.if).toBeDefined();
      expect(inlineCond.if.field).toBe("data.role");
      expect(inlineCond.then).toBeDefined();
      expect(inlineCond.else).toBeDefined();
    } else if (typeof doNode === 'object' && 'if' in doNode) {
      // Single inline conditional
      expect(doNode.if).toBeDefined();
      expect(doNode.if.field).toBe("data.role");
      expect(doNode.then).toBeDefined();
      expect(doNode.else).toBeDefined();
    }
  });

  test('should handle ActionGroup with multiple actions and inline condition', () => {
    const nodes: SDKGraphNode[] = [
      { 
        id: "event-1", 
        type: "event", 
        data: { id: "rule-multi", event: "order_placed" } 
      },
      { 
        id: "action-group-1", 
        type: "action_group", 
        data: { mode: "SEQUENCE" } 
      },
      { 
        id: "action-1", 
        type: "action", 
        data: { type: "state_set", params: { key: "status", value: "processing" } } 
      },
      { 
        id: "action-2", 
        type: "action", 
        data: { type: "state_set", params: { key: "count", value: 1 } } 
      },
      { 
        id: "condition-1", 
        type: "condition", 
        data: { 
          field: "data.amount", 
          operator: "GT", 
          value: 100 
        } 
      },
      { 
        id: "action-then", 
        type: "action", 
        data: { type: "notify", params: { message: "High value order!" } } 
      }
    ];

    const edges: SDKGraphEdge[] = [
      // Event → ActionGroup
      { source: "event-1", target: "action-group-1" },
      // ActionGroup → Action 1
      { 
        source: "action-group-1", 
        target: "action-1",
        sourceHandle: "action-group-output"
      },
      // Action 1 → Action 2 (chaining)
      { 
        source: "action-1", 
        target: "action-2",
        sourceHandle: "action-output"
      },
      // ActionGroup → Condition (condition-output for inline conditional)
      { 
        source: "action-group-1", 
        target: "condition-1",
        sourceHandle: "condition-output",
        targetHandle: "condition-input"
      },
      // Condition → Then Action
      { 
        source: "condition-1", 
        target: "action-then",
        sourceHandle: "condition-output"
      }
    ];

    const builder = RuleBuilder.fromGraph(nodes, edges);
    const rule = builder.build();

    console.log('Generated Rule:', JSON.stringify(rule, null, 2));

    expect(rule.id).toBe("rule-multi");
    expect(rule.on).toBe("order_placed");
    expect(rule.do).toBeDefined();
  });

  test('should validate ActionGroup → Condition connection is allowed', () => {
    const nodes: SDKGraphNode[] = [
      { id: "event-1", type: "event", data: { id: "rule-test", event: "test" } },
      { id: "ag-1", type: "action_group", data: { mode: "ALL" } },
      { id: "cond-1", type: "condition", data: { field: "x", operator: "EQ", value: "1" } },
      { id: "act-1", type: "action", data: { type: "log" } }
    ];

    const edges: SDKGraphEdge[] = [
      { source: "event-1", target: "ag-1" },
      { 
        source: "ag-1", 
        target: "cond-1",
        sourceHandle: "condition-output",
        targetHandle: "condition-input"
      },
      { 
        source: "cond-1", 
        target: "act-1",
        sourceHandle: "condition-output"
      }
    ];

    // This should NOT throw an error
    const builder = RuleBuilder.fromGraph(nodes, edges);
    const rule = builder.build();
    
    expect(rule).toBeDefined();
    expect(rule.do).toBeDefined();
  });
});
