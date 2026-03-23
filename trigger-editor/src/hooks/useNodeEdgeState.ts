import { useState, useCallback, useEffect } from 'react';
import type { Node, Edge, Connection, EdgeChange, NodeChange } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge, reconnectEdge } from '@xyflow/react';
import { NodeType } from '../constants';
import type { AppNode } from '../utils/exportImport';
/**
 * Hook for managing nodes and edges state with common operations
 */
export function useNodeEdgeState() {
  const [nodes, setNodes] = useState<AppNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Handle node changes (drag, select, remove, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as AppNode[]),
    []
  );

  // Handle edge changes (select, remove)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle data changes for a specific node
  const onNodeDataChange = useCallback((id: string, value: unknown, field: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: { ...node.data, [field]: value },
          };
        }
        return node;
      })
    );
  }, []);

  // Duplicate a node with new ID and same data
  const onDuplicateNode = useCallback((id: string) => {
    setNodes((nds) => {
      const nodeToDuplicate = nds.find(n => n.id === id);
      if (!nodeToDuplicate) return nds;

      const newNodeId = `node_${Math.random().toString(36).substring(2, 7)}`;
      // Deep clone data and reset internal IDs
      const newData = { ...nodeToDuplicate.data };
      
      // If it's an event node, it needs a new rule ID
      if (nodeToDuplicate.type === NodeType.EVENT && (newData as any).id) {
        (newData as any).id = `rule_${Math.random().toString(36).substring(2, 7)}`;
      }

      const newNode: AppNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        selected: false,
        position: {
          x: nodeToDuplicate.position.x + 30,
          y: nodeToDuplicate.position.y + 30,
        },
        data: newData,
      };

      return [...nds, newNode];
    });
  }, []);

  // Ensure nodes have their onChange and latest state
  useEffect(() => {
    setNodes((nds) => 
      nds.map((node) => {
        if (typeof node.data.onChange !== 'function' || typeof node.data.onDuplicate !== 'function' || node.data._id !== node.id) {
          return {
            ...node,
            data: {
              ...node.data,
              _id: node.id,
              onChange: (val: unknown, f: string) => onNodeDataChange(node.id, val, f),
              onDuplicate: () => onDuplicateNode(node.id),
            },
          };
        }
        return node;
      })
    );
  }, [nodes.length, onNodeDataChange]);

  // Handle new connections with intelligent edge management
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds: Edge[]) => {
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);

        // ============================================================
        // Intelligent Edge Handling
        // ============================================================
        let filteredEdges = eds;

        // Logic: If a Condition is being connected TO a Group (Forward Discovery)
        // We should clean up any outgoing edges from the Condition
        // because "cannot have action when in a group".
        if (sourceNode?.type === NodeType.CONDITION_GROUP && targetNode?.type === NodeType.CONDITION) {
           filteredEdges = eds.filter(e => e.source !== targetNode.id);
        }

        // ============================================================
        // Rule 1: Event can only have ONE outgoing connection
        // Remove any existing outgoing edges from Event
        // ============================================================
        if (sourceNode?.type === NodeType.EVENT) {
          filteredEdges = filteredEdges.filter(e => e.source !== params.source);
        }

        // ============================================================
        // Rule 2: Condition - manage multiple outputs intelligently
        // If connecting condition-output, remove else-output to same target
        // If connecting else-output, remove condition-output to same target
        // ============================================================
        if (sourceNode?.type === NodeType.CONDITION && targetNode) {
          if (params.sourceHandle === 'condition-output' || !params.sourceHandle) {
            // Connecting condition-output: remove any existing else-output to same target
            filteredEdges = filteredEdges.filter(e => 
              !(e.source === params.source && 
                e.target === params.target &&
                e.sourceHandle === 'else-output')
            );
          } else if (params.sourceHandle === 'else-output') {
            // Connecting else-output: remove any existing condition-output to same target
            filteredEdges = filteredEdges.filter(e => 
              !(e.source === params.source && 
                e.target === params.target &&
                (e.sourceHandle === 'condition-output' || !e.sourceHandle))
            );
          }
        }

        // ============================================================
        // Rule 3: Target can only have ONE incoming connection
        // Remove any existing incoming edges to the target (except for Condition nodes with separate handles)
        // ============================================================
        if (targetNode?.type !== NodeType.CONDITION) {
          // For non-condition targets, remove existing edges to same target handle
          filteredEdges = filteredEdges.filter(e => 
            !(e.target === params.target && e.targetHandle === params.targetHandle)
          );
        } else {
          // For Condition nodes, only remove if connecting to same handle
          filteredEdges = filteredEdges.filter(e => 
            !(e.target === params.target && 
              e.targetHandle === params.targetHandle &&
              e.sourceHandle === params.sourceHandle)
          );
        }

        // ============================================================
        // Rule 4: ActionGroup -> Condition (inline conditional)
        // When connecting ActionGroup's condition-output to Condition
        // ============================================================
        if (sourceNode?.type === NodeType.ACTION_GROUP && 
            targetNode?.type === NodeType.CONDITION &&
            params.sourceHandle === 'condition-output') {
          // Remove any existing edge from this ActionGroup to a Condition
          filteredEdges = filteredEdges.filter(e => 
            !(e.source === params.source && e.sourceHandle === 'condition-output')
          );
        }

        // ============================================================
        // Rule 5: ActionGroup -> Action (chaining)
        // When connecting ActionGroup's action-output to Action
        // ============================================================
        if (sourceNode?.type === NodeType.ACTION_GROUP && 
            targetNode?.type === NodeType.ACTION &&
            params.sourceHandle === 'action-output') {
          // Remove any existing edge from this ActionGroup to an Action
          filteredEdges = filteredEdges.filter(e => 
            !(e.source === params.source && e.sourceHandle === 'action-output')
          );
        }

        // Generate unique edge ID to prevent merging
        const edgeId = `edge_${params.source}_${params.target}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Create edge with unique ID and class for coloring
        const newEdge: Edge = {
          id: edgeId,
          type: 'deletable', // Use custom deletable edge type
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          className: `source-${sourceNode?.type}`,
          animated: true, // Add animation for better visibility
        };
        
        // Add the new edge to filtered edges
        return [...filteredEdges, newEdge];
      });
    },
    [nodes]
  );

  // Handle edge reconnection
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els: Edge[]) => reconnectEdge(oldEdge, newConnection, els)),
    []
  );

  // Clear all nodes and edges
  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, []);

  // Set nodes and edges (for import)
  const setGraph = useCallback((newNodes: AppNode[], newEdges: Edge[]) => {
    setNodes(newNodes);
    // Ensure all imported edges have the deletable type
    setEdges(newEdges.map(e => ({ ...e, type: 'deletable' })));
  }, []);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onNodeDataChange,
    onConnect,
    onReconnect,
    onDuplicateNode,
    clearAll,
    setGraph,
  };
}
