import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { RuleBuilder } from '../../../src/sdk/builder.ts';
import { RuleExporter } from '../../../src/sdk/exporter.ts';
import type { GraphParserContext, GraphParserOptions } from '../../../src/sdk/graph-parser.ts';
import type { TriggerRule } from '../../../src/types.ts';

export interface BuildResult {
  rule: TriggerRule | null;
  errors: string[];
  yaml: string;
}

export function useRuleBuilder(nodes: Node[], edges: Edge[], options?: GraphParserOptions, transformers?: GraphParserContext['transformers']) {
  const buildRule = useCallback((): BuildResult => {
    try {
      const sdkNodes = nodes.map(n => ({
        id: n.id,
        type: n.type || 'unknown',
        data: n.data
      }));

      const sdkEdges = edges.map(e => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle
      }));

      // Pass the Nodes and Edges directly to the SDK
      const builder = RuleBuilder.fromGraph(sdkNodes, sdkEdges, options, transformers);
      const rule = builder.build();
      //console.log({sdkNodes, sdkEdges, options, transformers,rule})
      return { rule, errors: [], yaml: RuleExporter.toCleanYaml(rule) };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { rule: null, errors: [msg], yaml: '' };
    }
  }, [nodes, edges, options, transformers]);

  return buildRule;
}
