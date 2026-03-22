import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { RuleBuilder } from '../../../src/sdk/builder.ts';
import { RuleExporter } from '../../../src/sdk/exporter.ts';
import type { GraphParserContext, GraphParserOptions } from '../../../src/sdk/graph-parser.ts';
import type { TriggerRule } from '../../../src/types.ts';

export interface BuildResult {
  rules: TriggerRule[];
  errors: string[];
  yaml: string;
}

/**
 * Hook to build rules from graph nodes.
 * Supports both single-rule and multi-rule graphs.
 */
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
      
      // Use fromGraphMultiple to support multiple Event nodes (rules)
      const { rules, errors } = RuleBuilder.fromGraphMultiple(sdkNodes, sdkEdges, options, transformers);
      //debug nodes, edges and import console.log(rules,sdkEdges,sdkNodes)
      if (errors.length > 0) {
        return { rules: [], errors, yaml: '' };
      }
      
      if (rules.length === 0) {
        return { rules: [], errors: ['No rules found in graph'], yaml: '' };
      }
      
      // Convert all rules to YAML
      const yaml = RuleExporter.toCleanYaml(rules);
      
      return { rules, errors: [], yaml };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { rules: [], errors: [msg], yaml: '' };
    }
  }, [nodes, edges, options, transformers]);

  return buildRule;
}
