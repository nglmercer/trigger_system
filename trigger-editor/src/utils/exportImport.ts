import type { Node, Edge } from '@xyflow/react';
import type {
  EventNodeData,
  ConditionNodeData,
  ConditionGroupNodeData,
  ActionNodeData,
  ActionGroupNodeData,
  DoNodeData,
} from '../types';
import { NodeType, NodeHandle } from '../constants';

export type AppNode = Node<
  | EventNodeData
  | ConditionNodeData
  | ConditionGroupNodeData
  | ActionNodeData
  | ActionGroupNodeData
  | DoNodeData
>;

/**
 * Export format version for future compatibility
 */
export const EXPORT_VERSION = '1.0.0';

/**
 * Complete export data structure - contains both nodes/edges and optional YAML
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  nodes: AppNode[];
  edges: Edge[];
  /** Optional: pre-generated YAML (useful for quick preview) */
  yaml?: string;
  /** Metadata about the export */
  metadata?: {
    name?: string;
    description?: string;
    nodeCount: number;
    edgeCount: number;
  };
}

/**
 * Export nodes and edges as JSON file
 * This is the RECOMMENDED format for import/export as it preserves all data
 */
export function exportToJson(nodes: AppNode[], edges: Edge[], yaml?: string): string {
  const exportData: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    nodes,
    edges,
    yaml,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download data as a JSON file
 */
export function downloadJson(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download data as a YAML file
 */
export function downloadYaml(yaml: string, filename: string): void {
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate imported JSON data
 */
export function parseImportData(jsonString: string): ExportData | null {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data.nodes || !Array.isArray(data.nodes)) {
      console.error('Invalid import: missing nodes array');
      return null;
    }
    
    if (!data.edges || !Array.isArray(data.edges)) {
      console.error('Invalid import: missing edges array');
      return null;
    }
    
    // Validate version (forward compatibility)
    if (data.version && data.version !== EXPORT_VERSION) {
      console.warn(`Import version mismatch: expected ${EXPORT_VERSION}, got ${data.version}`);
    }
    
    return data as ExportData;
  } catch (e) {
    console.error('Failed to parse import data:', e);
    return null;
  }
}

/**
 * Create a file input for importing
 * Returns a promise that resolves with the parsed data
 */
export function createImportPicker(): Promise<ExportData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      try {
        const text = await file.text();
        const data = parseImportData(text);
        resolve(data);
      } catch (err) {
        console.error('Failed to read file:', err);
        resolve(null);
      }
    };
    
    input.click();
  });
}

/**
 * Sanitize imported nodes to ensure they have proper onChange handlers
 * This is needed because the onChange function is recreated on import
 */
export function sanitizeNodesForImport(
  nodes: AppNode[],
  onNodeDataChange: (id: string, value: any, field: string) => void
): AppNode[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      _id: node.id,
      onChange: (val: any, f: string) => onNodeDataChange(node.id, val, f),
    },
  }));
}

/**
 * Map of node types to their expected handle configurations
 * This ensures edges have the correct handles when importing from external sources
 * Uses NodeType and NodeHandle enums from constants
 */
const NODE_HANDLE_MAP: Record<string, { source?: string; target?: string }> = {
  [NodeType.EVENT]: {
    source: NodeHandle.EVENT_OUTPUT,
  },
  [NodeType.CONDITION]: {
    source: NodeHandle.CONDITION_OUTPUT,
    target: NodeHandle.CONDITION_INPUT,
  },
  [NodeType.CONDITION_GROUP]: {
    source: NodeHandle.CONDITION_GROUP_OUTPUT,
    target: NodeHandle.CONDITION_GROUP_INPUT,
  },
  [NodeType.ACTION]: {
    source: NodeHandle.ACTION_OUTPUT,
    target: NodeHandle.ACTION_INPUT,
  },
  [NodeType.ACTION_GROUP]: {
    source: NodeHandle.ACTION_GROUP_OUTPUT,
    target: NodeHandle.ACTION_GROUP_INPUT,
  },
  [NodeType.DO]: {
    source: NodeHandle.DO_OUTPUT,
    target: NodeHandle.DO_INPUT,
  },
};

/**
 * Fix edge handles based on source/target node types
 * This ensures imported edges have the correct handle names for the editor
 */
export function sanitizeEdgesForImport(
  edges: Edge[],
  nodes: AppNode[]
): Edge[] {
  // Create a map of node IDs to their types for quick lookup
  const nodeTypeMap = new Map<string, string>();
  nodes.forEach(node => nodeTypeMap.set(node.id, node.type || ''));

  return edges.map(edge => {
    const sourceType = nodeTypeMap.get(edge.source) || '';
    const targetType = nodeTypeMap.get(edge.target) || '';

    const sourceHandles = NODE_HANDLE_MAP[sourceType];
    const targetHandles = NODE_HANDLE_MAP[targetType];

    let sourceHandle = edge.sourceHandle;
    let targetHandle = edge.targetHandle;

    // Fix source handle if needed
    if (sourceHandles?.source && !sourceHandle) {
      sourceHandle = sourceHandles.source as string;
    }

    // Fix target handle if needed
    if (targetHandles?.target && !targetHandle) {
      targetHandle = targetHandles.target as string;
    }

    // Handle special cases for condition group outputs
    if (sourceType === NodeType.CONDITION_GROUP && targetType === NodeType.CONDITION) {
      // Condition group outputs should use cond-* handles
      if (!sourceHandle || sourceHandle === NodeHandle.CONDITION_GROUP_OUTPUT) {
        // Use the existing handle or default to cond-0
        sourceHandle = sourceHandle || 'cond-0';
      }
    }

    // Handle do node special outputs
    if (sourceType === NodeType.DO) {
      if (targetType === NodeType.CONDITION) {
        // DO node to condition uses do-condition-output
        sourceHandle = NodeHandle.DO_CONDITION_OUTPUT;
      } else if (targetType === NodeType.ACTION) {
        // DO node to action uses do-output
        sourceHandle = sourceHandle || NodeHandle.DO_OUTPUT;
      }
    }

    // Handle condition node outputs for inline conditionals (then/else branches)
    if (sourceType === NodeType.CONDITION && targetType === NodeType.ACTION) {
      // For condition → action, we need to determine if it's then or else branch
      // Check if there's another edge from this condition with else-output
      const hasElseBranch = edges.some(e => 
        e.source === edge.source && 
        e.target !== edge.target && 
        (e.sourceHandle === NodeHandle.ELSE_OUTPUT || e.sourceHandle === 'else')
      );
      
      if (hasElseBranch) {
        // This is the else branch - use 'else-output' for the else branch
        sourceHandle = sourceHandle || NodeHandle.ELSE_OUTPUT;
      } else {
        // This is likely the then/do branch
        sourceHandle = sourceHandle || NodeHandle.DO_OUTPUT;
      }
    }

    // Handle action_group conditional outputs
    if (sourceType === NodeType.ACTION_GROUP && (targetType === NodeType.ACTION || targetType === NodeType.DO)) {
      // Default to then-output for action groups
      sourceHandle = sourceHandle || NodeHandle.THEN_OUTPUT;
    }

    return {
      ...edge,
      sourceHandle: sourceHandle ?? null,
      targetHandle: targetHandle ?? null,
    };
  });
}

/**
 * Export rules as YAML only
 * Note: This loses editor-specific data like node positions
 * Use this only for sharing the compiled rule, not for re-importing
 */
export function exportToYamlOnly(yaml: string): string {
  return yaml;
}

/**
 * URL parameter name for sharing
 */
export const SHARE_PARAM_NAME = 'share';

/**
 * Encode project data to a URL-safe string for sharing
 * Uses base64 encoding for URL-safe string
 */
export function encodeShareData(nodes: AppNode[], edges: Edge[]): string {
  try {
    // Create minimal export data (without metadata to reduce size)
    const shareData = {
      v: EXPORT_VERSION,
      n: nodes,
      e: edges,
    };
    
    // Serialize to JSON
    const jsonStr = JSON.stringify(shareData);
    
    // Use base64 encoding and make URL-safe
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    
    // Replace URL-unsafe characters
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Failed to encode share data:', error);
    return '';
  }
}

/**
 * Decode project data from a URL-safe string
 */
export function decodeShareData(encoded: string): { nodes: AppNode[]; edges: Edge[] } | null {
  try {
    // Restore base64 padding and URL-safe characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }
    
    // Decode base64
    const jsonStr = decodeURIComponent(Array.prototype.map.call(
      atob(base64),
      (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    // Parse JSON
    const data = JSON.parse(jsonStr);
    
    if (!data.n || !Array.isArray(data.n) || !data.e || !Array.isArray(data.e)) {
      console.error('Invalid share data structure');
      return null;
    }
    
    return { nodes: data.n, edges: data.e };
  } catch (error) {
    console.error('Failed to decode share data:', error);
    return null;
  }
}

/**
 * Generate a shareable URL with the project data
 */
export function generateShareUrl(nodes: AppNode[], edges: Edge[]): string {
  const encoded = encodeShareData(nodes, edges);
  if (!encoded) return '';
  
  const url = new URL(window.location.href);
  url.searchParams.set(SHARE_PARAM_NAME, encoded);
  return url.toString();
}

/**
 * Check if URL has shared data and extract it
 */
export function getSharedDataFromUrl(): { nodes: AppNode[]; edges: Edge[] } | null {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(SHARE_PARAM_NAME);
  
  if (!encoded) return null;
  
  return decodeShareData(encoded);
}

/**
 * Clear share data from URL (clean up after loading)
 */
export function clearShareDataFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_PARAM_NAME);
  window.history.replaceState({}, '', url.toString());
}
