import { describe, test, expect, beforeEach } from 'bun:test';
import { 
  parseYamlRules, 
  parseYamlRule, 
  parseYamlRuleStrict,
  triggerRuleToNodes,
  yamlToNodes,
  type YamlParserOptions,
  type YamlParserResult,
  type TriggerRuleToNodesResult
} from '../../../src/sdk/yaml-parser';

describe('yaml-parser', () => {
  describe('parseYamlRules', () => {
    test('should parse a basic rule', () => {
      const yaml = `
- id: my-rule
  on: chat.message
  do:
    - type: log
      params: { message: "Hello" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]?.id).toBe('my-rule');
      expect(result.rules[0]?.on).toBe('chat.message');
      expect(result.errors).toHaveLength(0);
    });

    test('should parse a rule with conditions', () => {
      const yaml = `
- id: condition-rule
  on: chat.message
  if:
    - field: data.content
      operator: CONTAINS
      value: "hello"
  do:
    - type: log
      params: { message: "Found hello" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.if).toBeDefined();
    });

    test('should parse a rule with condition group', () => {
      const yaml = `
- id: group-rule
  on: chat.message
  if:
    operator: AND
    conditions:
      - field: data.content
        operator: CONTAINS
        value: "hello"
      - field: data.sender
        operator: EQ
        value: "admin"
  do:
    - type: log
      params: { message: "Hello admin" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      const rule = result.rules[0];
      expect(rule?.if).toBeDefined();
    });

    test('should parse action groups', () => {
      const yaml = `
- id: action-group-rule
  on: chat.message
  do:
    mode: SEQUENCE
    actions:
      - type: log
        params: { message: "Step 1" }
      - type: log
        params: { message: "Step 2" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.do).toBeDefined();
    });

    test('should parse conditional actions (if/then/else)', () => {
      const yaml = `
- id: conditional-action-rule
  on: chat.message
  do:
    - type: check_status
      if:
        - field: data.content
          operator: CONTAINS
          value: "admin"
      then:
        - type: log
          params: { message: "Admin user" }
      else:
        - type: log
          params: { message: "Regular user" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
    });

    test('should handle else at rule level', () => {
      const yaml = `
- id: rule-else-rule
  on: chat.message
  if:
    - field: data.content
      operator: CONTAINS
      value: "hello"
  do:
    - type: log
      params: { message: "Found hello" }
  else:
    - type: log
      params: { message: "No hello found" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.else).toBeDefined();
    });

    test('should normalize actions alias to do', () => {
      const yaml = `
- id: alias-rule
  on: chat.message
  actions:
    - type: log
      params: { message: "Using actions alias" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.do).toBeDefined();
    });

    test('should set defaults for enabled and priority', () => {
      const yaml = `
- id: defaults-rule
  on: chat.message
  do:
    - type: log
      params: { message: "Test" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.enabled).toBe(true);
      expect(result.rules[0]?.priority).toBe(0);
    });

    test('should return errors for invalid YAML', () => {
      const yaml = `
- id: invalid-rule
  on: chat.message
  do: not-valid
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should return errors for missing required fields', () => {
      const yaml = `
- id: incomplete-rule
  do:
    - type: log
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should throw on error when throwOnError is true', () => {
      const yaml = `
- id: invalid-rule
  on: chat.message
  do: not-valid
`;
      
      expect(() => {
        parseYamlRules(yaml, { throwOnError: true });
      }).toThrow();
    });

    test('should auto-generate ID with autoId option', () => {
      const yaml = `
- on: chat.message
  do:
    - type: log
      params: { message: "Test" }
`;
      const result = parseYamlRules(yaml, { autoId: true });
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.id).toBeDefined();
    });

    test('should use filename for ID with autoId and filename options', () => {
      const yaml = `
- on: chat.message
  do:
    - type: log
      params: { message: "Test" }
`;
      const result = parseYamlRules(yaml, { autoId: true, filename: 'my-rules.yaml' });
      
      expect(result.valid).toBe(true);
      expect(result.rules[0]?.id).toBe('my-rules');
    });

    test('should handle multi-document YAML', () => {
      const yaml = `
---
- id: rule-1
  on: chat.message
  do:
    - type: log
---
- id: rule-2
  on: chat.message
  do:
    - type: log
`;
      const result = parseYamlRules(yaml, { multiDocument: true });
      
      expect(result.valid).toBe(true);
      expect(result.rules).toHaveLength(2);
    });

    test('should handle single document with list of rules', () => {
      const yaml = `
- id: rule-1
  on: chat.message
  do:
    - type: log
- id: rule-2
  on: chat.message
  do:
    - type: log
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules).toHaveLength(2);
    });
  });

  describe('parseYamlRule (single document)', () => {
    test('should parse single document without multiDocument', () => {
      const yaml = `
- id: single-rule
  on: chat.message
  do:
    - type: log
`;
      const result = parseYamlRule(yaml);
      
      expect(result.valid).toBe(true);
      expect(result.rules).toHaveLength(1);
    });
  });

  describe('parseYamlRuleStrict', () => {
    test('should return first valid rule and throw on errors', () => {
      const yaml = `
- id: my-rule
  on: chat.message
  do:
    - type: log
      params: { message: "Hello" }
`;
      const rule = parseYamlRuleStrict(yaml);
      
      expect(rule.id).toBe('my-rule');
      expect(rule.on).toBe('chat.message');
    });

    test('should throw if no valid rules', () => {
      const yaml = `
- id: invalid-rule
  do: not-valid
`;
      
      expect(() => {
        parseYamlRuleStrict(yaml);
      }).toThrow();
    });
  });

  describe('triggerRuleToNodes', () => {
    test('should convert a basic rule to nodes', () => {
      const rule = {
        id: 'test-rule',
        on: 'chat.message',
        do: { type: 'log', params: { message: 'Hello' } }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(true);
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
      
      // Should have an event node
      const eventNode = result.nodes.find(n => n.type === 'event');
      expect(eventNode).toBeDefined();
      expect(eventNode?.data.id).toBe('test-rule');
      expect(eventNode?.data.event).toBe('chat.message');
    });

    test('should convert a rule with conditions to nodes', () => {
      const rule = {
        id: 'condition-rule',
        on: 'chat.message',
        if: [
          { field: 'data.content', operator: 'CONTAINS', value: 'hello' }
        ],
        do: { type: 'log', params: { message: 'Hello' } }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(true);
      expect(result.nodes.length).toBeGreaterThan(0);
      
      // Should have condition nodes
      const conditionNodes = result.nodes.filter(n => n.type === 'condition');
      expect(conditionNodes.length).toBeGreaterThan(0);
    });

    test('should convert a rule with condition group to nodes', () => {
      const rule = {
        id: 'group-rule',
        on: 'chat.message',
        if: {
          operator: 'AND' as const,
          conditions: [
            { field: 'data.content', operator: 'CONTAINS', value: 'hello' },
            { field: 'data.sender', operator: 'EQ', value: 'admin' }
          ]
        },
        do: { type: 'log', params: { message: 'Hello admin' } }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(true);
      
      // Should have condition group node
      const groupNode = result.nodes.find(n => n.type === 'condition_group');
      expect(groupNode).toBeDefined();
      expect(groupNode?.data.operator).toBe('AND');
    });

    test('should convert action groups to nodes', () => {
      const rule = {
        id: 'action-group-rule',
        on: 'chat.message',
        do: {
          mode: 'SEQUENCE' as const,
          actions: [
            { type: 'log', params: { message: 'Step 1' } },
            { type: 'log', params: { message: 'Step 2' } }
          ]
        }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(true);
      
      // Should have action group node
      const groupNode = result.nodes.find(n => n.type === 'action_group');
      expect(groupNode).toBeDefined();
      expect(groupNode?.data.mode).toBe('SEQUENCE');
    });

    test('should convert conditional actions to nodes', () => {
      const rule = {
        id: 'conditional-rule',
        on: 'chat.message',
        do: {
          type: 'check_status',
          if: { field: 'data.content', operator: 'CONTAINS', value: 'admin' },
          then: { type: 'log', params: { message: 'Admin' } },
          else: { type: 'log', params: { message: 'User' } }
        }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(true);
      
      // Should have action node with conditional data
      const actionNode = result.nodes.find(n => n.type === 'action');
      expect(actionNode).toBeDefined();
    });

    test('should convert rule-level else to nodes', () => {
      const rule = {
        id: 'else-rule',
        on: 'chat.message',
        if: { field: 'data.content', operator: 'CONTAINS', value: 'hello' },
        do: { type: 'log', params: { message: 'Found hello' } },
        else: { type: 'log', params: { message: 'No hello' } }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(true);
    });

    test('should return errors for invalid rules', () => {
      const rule = {
        on: 'chat.message', // missing id
        do: { type: 'log' }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing id gracefully', () => {
      const rule = {
        on: 'chat.message',
        do: { type: 'log', params: {} }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: id');
    });

    test('should handle missing on field gracefully', () => {
      const rule = {
        id: 'test-rule',
        do: { type: 'log', params: {} }
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: on (event trigger)');
    });

    test('should handle missing do field gracefully', () => {
      const rule = {
        id: 'test-rule',
        on: 'chat.message'
      };

      const result = triggerRuleToNodes(rule as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: do (actions)');
    });
  });

  describe('yamlToNodes', () => {
    test('should parse YAML and convert to nodes in one call', () => {
      const yaml = `
- id: direct-nodes-rule
  on: chat.message
  do:
    - type: log
      params: { message: "Hello" }
`;
      const result = yamlToNodes(yaml);

      expect(result.valid).toBe(true);
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges.length).toBeGreaterThan(0);
    });

    test('should handle parsing errors', () => {
      const yaml = `
- id: invalid-rule
  on: chat.message
  do: not-valid
`;
      const result = yamlToNodes(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle empty YAML', () => {
      const yaml = '';
      const result = yamlToNodes(yaml);

      expect(result.valid).toBe(false);
    });

    test('should pass through parser errors', () => {
      const yaml = `
- id: rule
  do: invalid
`;
      const result = yamlToNodes(yaml);

      expect(result.parserErrors).toBeDefined();
      expect(result.parserErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty array', () => {
      const yaml = '';
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(false);
    });

    test('should handle null/undefined gracefully', () => {
      expect(() => {
        parseYamlRules('');
      }).not.toThrow();
    });

    test('should handle very nested structures', () => {
      const yaml = `
- id: nested-rule
  on: chat.message
  if:
    operator: AND
    conditions:
      - operator: AND
        conditions:
          - field: data.level1.level2
            operator: EQ
            value: test
  do:
    - type: log
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
    });

    test('should handle complex action structures', () => {
      const yaml = `
- id: complex-action-rule
  on: chat.message
  do:
    mode: ALL
    actions:
      - type: action1
        if:
          - field: data.status
            operator: EQ
            value: active
        then:
          - type: nested_action1
            params: { key: "value" }
        else:
          - type: nested_action2
      - type: action2
        params: { data: "test" }
`;
      const result = parseYamlRules(yaml);
      
      expect(result.valid).toBe(true);
    });
  });
});
