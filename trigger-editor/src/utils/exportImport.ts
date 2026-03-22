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

  // First pass: collect all condition_group edges to understand the structure
  // Map of condition_group_id -> array of target node IDs in order
  const conditionGroupConnections = new Map<string, { conditionTargets: string[]; actionTarget?: string }>();
  
  edges.forEach(edge => {
    const sourceType = nodeTypeMap.get(edge.source) || '';
    const targetType = nodeTypeMap.get(edge.target) || '';
    
    if (sourceType === NodeType.CONDITION_GROUP) {
      if (!conditionGroupConnections.has(edge.source)) {
        conditionGroupConnections.set(edge.source, { conditionTargets: [], actionTarget: undefined });
      }
      const conn = conditionGroupConnections.get(edge.source)!;
      
      if (targetType === NodeType.CONDITION) {
        conn.conditionTargets.push(edge.target);
      } else if (targetType === NodeType.ACTION_GROUP) {
        conn.actionTarget = edge.target;
      }
    }
  });

  // Create a map of condition index per condition_group
  // condition_group_id -> target_node_id -> cond-N index
  const conditionIndexMap = new Map<string, Map<string, number>>();
  conditionGroupConnections.forEach((conn, groupId) => {
    const indexMap = new Map<string, number>();
    conn.conditionTargets.forEach((targetId, idx) => {
      indexMap.set(targetId, idx);
    });
    conditionIndexMap.set(groupId, indexMap);
  });

  return edges.map(edge => {
    const sourceType = nodeTypeMap.get(edge.source) || '';
    const targetType = nodeTypeMap.get(edge.target) || '';

    const sourceHandles = NODE_HANDLE_MAP[sourceType];
    const targetHandles = NODE_HANDLE_MAP[targetType];

    let sourceHandle = edge.sourceHandle;
    let targetHandle = edge.targetHandle;

    // Fix source handle if needed - always ensure sourceHandle is set for proper visualization
    if (!sourceHandle && sourceHandles?.source) {
      sourceHandle = sourceHandles.source as string;
    }

    // Fix target handle if needed - always ensure targetHandle is set for proper visualization
    if (!targetHandle && targetHandles?.target) {
      targetHandle = targetHandles.target as string;
    }

    // Special case: event to condition_group - ensure target handle is set
    if (sourceType === NodeType.EVENT && targetType === NodeType.CONDITION_GROUP) {
      if (!targetHandle) {
        targetHandle = NodeHandle.CONDITION_GROUP_INPUT;
      }
    }

    // Special case: event to condition - ensure target handle is set
    if (sourceType === NodeType.EVENT && targetType === NodeType.CONDITION) {
      if (!targetHandle) {
        targetHandle = NodeHandle.CONDITION_INPUT;
      }
    }

    // Special case: event to action_group - ensure target handle is set
    if (sourceType === NodeType.EVENT && targetType === NodeType.ACTION_GROUP) {
      if (!targetHandle) {
        targetHandle = NodeHandle.ACTION_GROUP_INPUT;
      }
    }

    // Special case: event to action - ensure proper handles
    if (sourceType === NodeType.EVENT && targetType === NodeType.ACTION) {
      // Event to action should use event-output as source handle
      if (!sourceHandle || sourceHandle === 'do-output') {
        sourceHandle = NodeHandle.EVENT_OUTPUT;
      }
      if (!targetHandle) {
        targetHandle = NodeHandle.ACTION_INPUT;
      }
    }

    // Handle special cases for condition group outputs to conditions
    // Map all outgoing condition edges to the standard cond-output handle
    if (sourceType === NodeType.CONDITION_GROUP && targetType === NodeType.CONDITION) {
      sourceHandle = NodeHandle.CONDITION_GROUP_OUTPUT;
      
      // Ensure target handle is set for condition input
      if (!targetHandle) {
        targetHandle = NodeHandle.CONDITION_INPUT;
      }
    }

    // Handle condition-to-condition chains (condition output to next condition)
    if (sourceType === NodeType.CONDITION && targetType === NodeType.CONDITION) {
      // Condition chains use 'output' handle - ensure it's always set
      if (!sourceHandle) {
        sourceHandle = NodeHandle.CONDITION_OUTPUT;
      }
      // Always set target handle for the condition input
      targetHandle = targetHandle || NodeHandle.CONDITION_INPUT;
    }

    // Handle condition to action_group connection (then path)
    if (sourceType === NodeType.CONDITION && targetType === NodeType.ACTION_GROUP) {
      // Condition to action group - use CONDITION_OUTPUT handle for proper visualization
      // The condition node only has 'output' handle, not 'then-output'
      if (!sourceHandle || sourceHandle === NodeHandle.THEN_OUTPUT) {
        sourceHandle = NodeHandle.CONDITION_OUTPUT;
      }
      // Ensure target handle is set for action group input
      if (!targetHandle) {
        targetHandle = NodeHandle.ACTION_GROUP_INPUT;
      }
    }

    // Handle condition_group to action_group connection
    if (sourceType === NodeType.CONDITION_GROUP && targetType === NodeType.ACTION_GROUP) {
      // Use then-output for the action path from condition group
      if (!sourceHandle || sourceHandle === NodeHandle.CONDITION_GROUP_OUTPUT) {
        sourceHandle = NodeHandle.THEN_OUTPUT;
      }
      // Ensure target handle is set for action group input
      if (!targetHandle) {
        targetHandle = NodeHandle.ACTION_GROUP_INPUT;
      }
    }

    // Handle do node special outputs
    if (sourceType === NodeType.DO) {
      if (targetType === NodeType.CONDITION) {
        // DO node to condition uses do-condition-output for inline conditionals
        // Only set if not already specified (preserve explicit handles)
        if (!sourceHandle) {
          sourceHandle = NodeHandle.DO_CONDITION_OUTPUT;
        }
        // Ensure target handle is set
        if (!targetHandle) {
          targetHandle = NodeHandle.CONDITION_INPUT;
        }
      } else if (targetType === NodeType.ACTION) {
        // DO node to action - determine if it's then or else branch
        // Check if there's another edge from this DO node with else-output
        const hasElseBranch = edges.some(e => 
          e.source === edge.source && 
          e.target !== edge.target && 
          (e.sourceHandle === NodeHandle.ELSE_OUTPUT || e.sourceHandle === 'else')
        );
        
        if (hasElseBranch) {
          // There's an else branch - this edge could be either then or else
          if (sourceHandle === NodeHandle.ELSE_OUTPUT || sourceHandle === 'else') {
            // This IS the else branch
            sourceHandle = NodeHandle.ELSE_OUTPUT;
          } else {
            // This is the then branch
            sourceHandle = sourceHandle || NodeHandle.THEN_OUTPUT;
          }
        } else {
          // No else branch - use then-output for the action path
          if (sourceHandle !== NodeHandle.ELSE_OUTPUT) {
            sourceHandle = sourceHandle || NodeHandle.THEN_OUTPUT;
          }
        }
        // Ensure target handle is set
        if (!targetHandle) {
          targetHandle = NodeHandle.ACTION_INPUT;
        }
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
      
      // If there's an else branch, this edge is the THEN branch (the else is the OTHER edge)
      // If there's no else branch, this is the only action (treated as then)
      if (hasElseBranch) {
        if (sourceHandle === NodeHandle.ELSE_OUTPUT || sourceHandle === 'else') {
          // This IS the else branch - keep explicit else-output
          sourceHandle = NodeHandle.ELSE_OUTPUT;
        } else {
          // This is the then branch (the else branch exists on another edge)
          sourceHandle = sourceHandle || NodeHandle.THEN_OUTPUT;
        }
      } else {
        // No else branch exists - this is the primary action path
        // Use THEN_OUTPUT for consistency (DO_OUTPUT is legacy)
        sourceHandle = sourceHandle || NodeHandle.THEN_OUTPUT;
      }
      // Ensure target handle is set for action input
      if (!targetHandle) {
        targetHandle = NodeHandle.ACTION_INPUT;
      }
    }

    // Handle action_group outputs
    if (sourceType === NodeType.ACTION_GROUP) {
      if (targetType === NodeType.DO || targetType === NodeType.ACTION) {
        // Always use action-output for action group outputs (then-output is for conditions)
        // But preserve explicit else-output handles if present
        if (sourceHandle !== NodeHandle.ELSE_OUTPUT) {
          sourceHandle = NodeHandle.ACTION_GROUP_OUTPUT;
        }
        // Ensure target handle is set
        if (targetType === NodeType.DO && !targetHandle) {
          targetHandle = NodeHandle.DO_INPUT;
        } else if (targetType === NodeType.ACTION && !targetHandle) {
          targetHandle = NodeHandle.ACTION_INPUT;
        }
      }
    }

    return {
      ...edge,
      sourceHandle: sourceHandle ?? null,
      targetHandle: targetHandle ?? null,
      className: `source-${sourceType}`,
      animated: true,
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
