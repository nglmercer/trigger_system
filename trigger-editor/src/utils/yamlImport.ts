/**
 * YAML Import Module
 * 
 * This module handles importing trigger rules from YAML format.
 * It parses YAML content and converts it to React Flow nodes and edges.
 * 
 * Architecture:
 * - yamlImport.ts: Main entry point and public API
 * - yamlParser.ts: Core YAML parsing logic (internal)
 * - yamlValidators.ts: Validation functions (internal)
 * 
 * The modular design allows for:
 * - Easy testing of individual components
 * - Clear separation of concerns
 * - Reusable parsing logic
 * 
 * Uses the modularized YAML parser from src/sdk/yaml/ which supports:
 * - DO nodes
 * - ELSE branches
 * - Conditions in actions
 * - Subconditions and sub-do/else
 */

// Import from the new modularized YAML parser
import { 
  parseYamlRules, 
  triggerRuleToNodes,
  type EditorNode, 
  type EditorEdge 
} from '../../../src/sdk/yaml';
import type { Edge } from '@xyflow/react';

import { NodeType } from '../constants';
import type { ComparisonOperator } from '../../../src/types';

import type {
  AppNode,
  AppNodes,
  AppEdges,
  ImportResponse,
  ImportResult,
  ImportErrorCode,
} from './importExportTypes';
import type { ActionNodeData } from '../types';
import {
  createImportResult,
  createImportError,
  successResponse,
  errorResponse,
} from './importExportTypes';
import { createYamlFilePicker } from './filePicker';

// ============================================================================
// YAML to Nodes Conversion
// ============================================================================

/**
 * YAML to nodes result with proper typing
 */
interface YamlToNodesResult {
  nodes: EditorNode[];
  edges: EditorEdge[];
  valid: boolean;
  errors: string[];
}

/**
 * Convert YAML content to nodes and edges
 * This is a wrapper around the SDK functions for the editor
 */
export function yamlToNodes(
  yamlContent: string,
  options: {
    throwOnError?: boolean;
    multiDocument?: boolean;
  } = {}
): YamlToNodesResult {
  const { throwOnError = false, multiDocument = true } = options;
  
  // Parse YAML to rules
  const parseResult = parseYamlRules(yamlContent, {
    throwOnError,
    multiDocument,
  });
  
  if (!parseResult.valid || parseResult.rules.length === 0) {
    return {
      nodes: [],
      edges: [],
      valid: false,
      errors: parseResult.errors.map(e => e.message),
    };
  }
  
  // Convert each rule to nodes
  const allNodes: EditorNode[] = [];
  const allEdges: EditorEdge[] = [];
  let nodeOffset = 0;
  
  for (const rule of parseResult.rules) {
    const conversionResult = triggerRuleToNodes(rule, {
      startNodeId: `rule-${rule.id}-`,
      startPosition: { x: 100, y: 100 + nodeOffset * 200 },
    });
    
    // Remap node IDs to avoid collisions
    const idMap = new Map<string, string>();
    for (const node of conversionResult.nodes) {
      const newId = `${rule.id}-${node.id}`;
      idMap.set(node.id, newId);
    }
    
    // Apply ID mapping
    for (const node of conversionResult.nodes) {
      allNodes.push({
        ...node,
        id: idMap.get(node.id) || node.id,
      });
    }
    
    for (const edge of conversionResult.edges) {
      allEdges.push({
        ...edge,
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
      });
    }
    
    nodeOffset++;
  }
  
  return {
    nodes: allNodes,
    edges: allEdges,
    valid: true,
    errors: [],
  };
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse YAML content and convert to nodes and edges
 * 
 * @param yamlContent - Raw YAML string content
 * @param originalYaml - Optional original YAML string (for preserving in import result)
 * @returns ImportResponse with nodes and edges or error
 */
export function parseYamlContent(
  yamlContent: string,
  originalYaml?: string
): ImportResponse {
  try {
    // Use the new SDK utility for parsing and node conversion
    const nodesResult = yamlToNodes(yamlContent, {
      throwOnError: false,
      multiDocument: true
    });
    
    if (!nodesResult.valid) {
      return errorResponse(
        nodesResult.errors.join('; ') || 'Invalid YAML structure',
        'INVALID_STRUCTURE' as ImportErrorCode
      );
    }
    
    if (nodesResult.nodes.length === 0) {
      return errorResponse(
        'No rules found in YAML',
        'INVALID_STRUCTURE' as ImportErrorCode
      );
    }
    
    // Convert EditorNode/EditorEdge to AppNode/AppEdges
    // The SDK nodes use 'event', 'condition', etc. but we need to map to NodeType
    const nodes: AppNodes = nodesResult.nodes.map(node => ({
      ...node,
      type: node.type as any, // Will be mapped by React Flow
    })) as AppNodes;
    
    const edges: AppEdges = nodesResult.edges.map(edge => ({
      ...edge,
    })) as AppEdges;
    
    // Create the import result
    const result = createImportResult(nodes, edges, {
      name: nodesResult.nodes[0]?.data.name as string || 'Imported Rule',
      description: nodesResult.nodes[0]?.data.description as string || '',
      format: 'yaml',
      sourceYaml: originalYaml || yamlContent,
    });
    
    console.log('result', JSON.stringify(result));
    return successResponse(result);
    
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    const lineMatch = message.match(/line (\d+)/i);
    const line = lineMatch && lineMatch[1] ? parseInt(lineMatch[1], 10) : undefined;
    
    return errorResponse(
      `Failed to parse YAML: ${message}`,
      'PARSE_ERROR' as ImportErrorCode,
      { line }
    );
  }
}

/**
 * Parse YAML from a file (string content)
 * Used by the file picker
 */
export function parseYamlFile(content: string, filename: string): ImportResponse {
  return parseYamlContent(content, content);
}

// ============================================================================
// File Picker
// ============================================================================

/**
 * Create a YAML file import picker
 * Opens a file dialog and imports the selected YAML file
 */
export function createYamlImportPicker(): Promise<ImportResponse> {
  return createYamlFilePicker(parseYamlFile);
}