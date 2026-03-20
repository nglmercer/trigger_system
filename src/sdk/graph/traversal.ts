/**
 * Graph Traversal Utilities
 * Provides utilities for traversing and finding nodes in the graph
 */

import { HandleId } from '../constants';
import type { SDKGraphNode, SDKGraphEdge } from '../../types';

/**
 * Context for graph traversal operations
 */
export interface GraphTraversalContext {
  nodes: SDKGraphNode[];
  edges: SDKGraphEdge[];
}

/** Type for handle arrays - accepts both mutable and readonly */
export type HandleArray = readonly string[] | string[];

/**
 * Find a node by ID in the context
 */
export function findNodeById(
  ctx: GraphTraversalContext,
  nodeId: string
): SDKGraphNode | undefined {
  return ctx.nodes.find(n => n.id === nodeId);
}

/**
 * Find edges matching a specific source node and handle
 */
export function findEdgesBySource(
  ctx: GraphTraversalContext,
  sourceId: string,
  handles: HandleArray
): SDKGraphEdge[] {
  const handlesArray = [...handles];
  return ctx.edges.filter(e => 
    e.source === sourceId && 
    handlesArray.includes(e.sourceHandle || '')
  );
}

/**
 * Find edges matching a specific target node
 */
export function findEdgesByTarget(
  ctx: GraphTraversalContext,
  targetId: string
): SDKGraphEdge[] {
  return ctx.edges.filter(e => e.target === targetId);
}

/**
 * Find all nodes connected from a source node via specific handles
 */
export function findConnectedNodeIds(
  ctx: GraphTraversalContext,
  sourceId: string,
  handles: HandleArray
): string[] {
  return findEdgesBySource(ctx, sourceId, handles)
    .map(e => e.target)
    .filter(id => id);
}

/**
 * Find all nodes of a specific type connected from a source node
 */
export function findConnectedNodes<T extends SDKGraphNode>(
  ctx: GraphTraversalContext,
  sourceId: string,
  handles: HandleArray,
  typeFilter: (node: SDKGraphNode) => boolean
): T[] {
  return findEdgesBySource(ctx, sourceId, handles)
    .map(e => ctx.nodes.find(n => n.id === e.target))
    .filter((n): n is T => n !== undefined && typeFilter(n));
}

/**
 * Find nodes directly connected to a source node (any handle)
 */
export function findDirectSuccessors(
  ctx: GraphTraversalContext,
  sourceId: string
): SDKGraphNode[] {
  return ctx.edges
    .filter(e => e.source === sourceId)
    .map(e => ctx.nodes.find(n => n.id === e.target))
    .filter((n): n is SDKGraphNode => n !== undefined);
}

/**
 * Find nodes that connect to a target node
 */
export function findDirectPredecessors(
  ctx: GraphTraversalContext,
  targetId: string
): SDKGraphNode[] {
  return ctx.edges
    .filter(e => e.target === targetId)
    .map(e => ctx.nodes.find(n => n.id === e.source))
    .filter((n): n is SDKGraphNode => n !== undefined);
}

/**
 * Get all outgoing edges from a node
 */
export function getOutgoingEdges(
  ctx: GraphTraversalContext,
  nodeId: string
): SDKGraphEdge[] {
  return ctx.edges.filter(e => e.source === nodeId);
}

/**
 * Get all incoming edges to a node
 */
export function getIncomingEdges(
  ctx: GraphTraversalContext,
  nodeId: string
): SDKGraphEdge[] {
  return ctx.edges.filter(e => e.target === nodeId);
}

/**
 * Get connected edges with optional handle filtering
 */
export function getConnectedEdges(
  ctx: GraphTraversalContext,
  nodeId: string,
  options: {
    direction?: 'outgoing' | 'incoming' | 'both';
    sourceHandles?: HandleArray;
    targetHandles?: HandleArray;
  } = {}
): SDKGraphEdge[] {
  const { direction = 'both', sourceHandles, targetHandles } = options;
  const sourceArray = sourceHandles ? [...sourceHandles] : undefined;
  const targetArray = targetHandles ? [...targetHandles] : undefined;
  
  return ctx.edges.filter(e => {
    const isOutgoing = e.source === nodeId;
    const isIncoming = e.target === nodeId;
    
    if (direction === 'outgoing' && !isOutgoing) return false;
    if (direction === 'incoming' && !isIncoming) return false;
    if (direction === 'both' && !isOutgoing && !isIncoming) return false;
    
    if (sourceArray && isOutgoing && !sourceArray.includes(e.sourceHandle || '')) return false;
    if (targetArray && isIncoming && !targetArray.includes(e.targetHandle || '')) return false;
    
    return true;
  });
}

/**
 * Common handle arrays for graph traversal
 */
export const HandleFilters = {
  /** All condition output handles (for chaining conditions) */
  CONDITION_OUTPUT: [HandleId.CONDITION_OUTPUT, HandleId.CONDITION_OUTPUT_LEGACY],
  
  /** All action output handles */
  ACTION_OUTPUT: [HandleId.ACTION_OUTPUT, HandleId.ACTION_OUTPUT_LEGACY],
  
  /** All DO output handles */
  DO_OUTPUT: [HandleId.DO_OUTPUT, ''],
  
  /** Then/else outputs from conditions (for terminal actions) */
  THEN_ELSE: [HandleId.THEN_OUTPUT, HandleId.ELSE_OUTPUT],
  
  /** DO condition output for inline conditionals */
  DO_CONDITION: [HandleId.DO_CONDITION_OUTPUT],
  
  /** All condition/thence outputs - includes then-output for condition→action_group */
  CONDITION_CHAIN: [HandleId.CONDITION_OUTPUT, HandleId.CONDITION_OUTPUT_LEGACY, HandleId.THEN_OUTPUT, HandleId.ELSE_OUTPUT],
  
  /** Any output handle */
  ANY: [HandleId.CONDITION_OUTPUT, HandleId.CONDITION_OUTPUT_LEGACY, ''],
} as const;

/**
 * GraphTraversal class - Fluent interface for graph traversal
 */
export class GraphTraversal {
  private ctx: GraphTraversalContext;

  constructor(nodes: SDKGraphNode[], edges: SDKGraphEdge[]) {
    this.ctx = { nodes, edges };
  }

  /** Find a node by ID */
  node(id: string): SDKGraphNode | undefined {
    return findNodeById(this.ctx, id);
  }

  /** Get outgoing edges from a node */
  outgoing(nodeId: string): SDKGraphEdge[] {
    return getOutgoingEdges(this.ctx, nodeId);
  }

  /** Get incoming edges to a node */
  incoming(nodeId: string): SDKGraphEdge[] {
    return getIncomingEdges(this.ctx, nodeId);
  }

  /** Get connected edges with filtering */
  connected(
    nodeId: string,
    options: {
      direction?: 'outgoing' | 'incoming' | 'both';
      sourceHandles?: string[];
      targetHandles?: string[];
    } = {}
  ): SDKGraphEdge[] {
    return getConnectedEdges(this.ctx, nodeId, options);
  }

  /** Find connected node IDs by handles */
  successors(nodeId: string, handles: HandleArray): string[] {
    return findConnectedNodeIds(this.ctx, nodeId, handles);
  }

  /** Find connected nodes by type filter */
  find<T extends SDKGraphNode>(
    sourceId: string,
    handles: HandleArray,
    typeFilter: (node: SDKGraphNode) => boolean
  ): T[] {
    return findConnectedNodes(this.ctx, sourceId, handles, typeFilter);
  }

  /** Get direct successors (any handle) */
  directSuccessors(nodeId: string): SDKGraphNode[] {
    return findDirectSuccessors(this.ctx, nodeId);
  }

  /** Get direct predecessors */
  directPredecessors(nodeId: string): SDKGraphNode[] {
    return findDirectPredecessors(this.ctx, nodeId);
  }
}
