import { describe, it, expect } from 'bun:test';
import { parseGraph } from '../../src/sdk/graph-parser';
import { RuleBuilder } from '../../src/sdk/builder';
import { RuleExporter } from '../../src/sdk/exporter';
import type { SDKGraphNode, SDKGraphEdge } from '../../src/types';

describe('graph-parser else detection', () => {
  it('should detect both then and else actions from condition node', () => {
    // Simula el grafo de la imagen del usuario
    const nodes: SDKGraphNode[] = [
      {
        id: 'event-1',
        type: 'event',
        data: {
          id: 'rule-5sy61',
          name: 'New Rule',
          event: '123'
        }
      },
      {
        id: 'cond-1',
        type: 'condition',
        data: {
          field: 'data.amount',
          operator: 'EQ',
          value: '100'
        }
      },
      {
        id: 'action-then',
        type: 'action',
        data: {
          type: 'log',
          params: {}
        }
      },
      {
        id: 'action-else',
        type: 'action',
        data: {
          type: 'log2',
          params: {}
        }
      }
    ];

    const edges: SDKGraphEdge[] = [
      // Evento -> Condición
      { source: 'event-1', target: 'cond-1', sourceHandle: undefined, targetHandle: undefined },
      // Condición -> Acción THEN (vía condition-output)
      { source: 'cond-1', target: 'action-then', sourceHandle: 'condition-output', targetHandle: undefined },
      // Condición -> Acción ELSE (vía else-output)
      { source: 'cond-1', target: 'action-else', sourceHandle: 'else-output', targetHandle: undefined }
    ];

    const builder = parseGraph(nodes, edges);
    const rule = builder.build();

    console.log('Generated rule:', JSON.stringify(rule, null, 2));

    // Verificar que se detectó la condición
    expect(rule.if).toBeDefined();
    
    // Verificar que se detectó la acción THEN
    expect(rule.do).toBeDefined();
    
    // Verificar que se detectó la acción ELSE - ESTO ES LO QUE FALLA
    expect(rule.else).toBeDefined();
    
    if (rule.else) {
      if ('type' in rule.else) {
        expect(rule.else.type).toBe('log2');
      } else if ('actions' in rule.else && Array.isArray(rule.else.actions)) {
        expect(rule.else.actions[0]).toHaveProperty('type', 'log2');
      }
    }
  });

  it('should detect else with single condition and multiple action outputs', () => {
    const nodes: SDKGraphNode[] = [
      {
        id: 'event-1',
        type: 'event',
        data: { id: 'test-rule', name: 'Test', event: 'test-event' }
      },
      {
        id: 'cond-1',
        type: 'condition',
        data: { field: 'data.status', operator: 'EQ', value: 'active' }
      },
      {
        id: 'action-1',
        type: 'action',
        data: { type: 'notify', params: { message: 'Active' } }
      },
      {
        id: 'action-2',
        type: 'action',
        data: { type: 'log', params: { message: 'Inactive' } }
      }
    ];

    const edges: SDKGraphEdge[] = [
      { source: 'event-1', target: 'cond-1' },
      { source: 'cond-1', target: 'action-1', sourceHandle: 'condition-output' },
      { source: 'cond-1', target: 'action-2', sourceHandle: 'else-output' }
    ];

    const builder = parseGraph(nodes, edges);
    const rule = builder.build();

    console.log('Rule with simple else:', JSON.stringify(rule, null, 2));

    expect(rule.if).toBeDefined();
    expect(rule.do).toBeDefined();
    expect(rule.else).toBeDefined();
  });

  it('should detect else using RuleBuilder.fromGraph like the editor does', () => {
    // Este test simula EXACTAMENTE lo que hace el editor
    const nodes = [
      {
        id: 'event-1',
        type: 'event',
        data: {
          id: 'rule-test',
          name: 'Test Rule',
          event: 'test-event',
          enabled: true,
          priority: 0
        }
      },
      {
        id: 'cond-1',
        type: 'condition',
        data: {
          field: 'data.amount',
          operator: 'EQ',
          value: '100'
        }
      },
      {
        id: 'action-then',
        type: 'action',
        data: {
          type: 'log1',
          params: {}
        }
      },
      {
        id: 'action-else',
        type: 'action',
        data: {
          type: 'log',
          params: {}
        }
      }
    ];

    const edges = [
      { source: 'event-1', target: 'cond-1', sourceHandle: null, targetHandle: null },
      { source: 'cond-1', target: 'action-then', sourceHandle: 'condition-output', targetHandle: null },
      { source: 'cond-1', target: 'action-else', sourceHandle: 'else-output', targetHandle: null }
    ];

    console.log('Input edges:', JSON.stringify(edges, null, 2));

    // Usar RuleBuilder.fromGraph como hace el hook useRuleBuilder
    const builder = RuleBuilder.fromGraph(nodes, edges);
    const rule = builder.build();

    console.log('Generated YAML:');
    console.log(RuleExporter.toCleanYaml(rule));
    console.log('Rule JSON:', JSON.stringify(rule, null, 2));

    expect(rule.if).toBeDefined();
    expect(rule.do).toBeDefined();
    expect(rule.else).toBeDefined();
    
    // Verificar que el tipo de la acción else es correcto
    if (rule.else && 'type' in rule.else) {
      expect(rule.else.type).toBe('log');
    }
  });
});
