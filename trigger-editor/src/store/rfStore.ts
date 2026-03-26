import { create } from 'zustand';
import { 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  reconnectEdge,
  type OnNodesChange, 
  type OnEdgesChange, 
  type OnConnect,
  type Connection, 
  type Edge, 
  type NodeChange, 
  type EdgeChange 
} from '@xyflow/react';
import type { AppNode } from '../types';
import { NodeType } from '../constants';

export interface RFState {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onReconnect: (oldEdge: Edge, newConnection: Connection) => void;
  setNodes: (nodes: AppNode[] | ((nds: AppNode[]) => AppNode[])) => void;
  setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
  updateNodeData: (nodeId: string, value: unknown, field: string) => void;
  duplicateNode: (nodeId: string) => void;
  addNodes: (nodes: AppNode[]) => void;
  clearAll: () => void;
  setGraph: (nodes: AppNode[], edges: Edge[]) => void;
}

export const useRFStore = create<RFState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as AppNode[],
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (params: Connection) => {
    const { nodes, edges } = get();
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    let filteredEdges = edges;

    // Duplicated from useNodeEdgeState's intelligent management logic
    if (sourceNode?.type === NodeType.CONDITION_GROUP && targetNode?.type === NodeType.CONDITION) {
       filteredEdges = edges.filter(e => e.source !== targetNode.id);
    }

    if (sourceNode?.type === NodeType.EVENT) {
      filteredEdges = filteredEdges.filter(e => e.source !== params.source);
    }

    if (sourceNode?.type === NodeType.CONDITION && targetNode) {
      if (params.sourceHandle === 'condition-output' || !params.sourceHandle) {
        filteredEdges = filteredEdges.filter(e => 
          !(e.source === params.source && e.target === params.target && e.sourceHandle === 'else-output')
        );
      } else if (params.sourceHandle === 'else-output') {
        filteredEdges = filteredEdges.filter(e => 
          !(e.source === params.source && e.target === params.target && (e.sourceHandle === 'condition-output' || !e.sourceHandle))
        );
      }
    }

    if (targetNode?.type !== NodeType.CONDITION) {
      filteredEdges = filteredEdges.filter(e => 
        !(e.target === params.target && e.targetHandle === params.targetHandle)
      );
    } else {
      filteredEdges = filteredEdges.filter(e => 
        !(e.target === params.target && e.targetHandle === params.targetHandle && e.sourceHandle === params.sourceHandle)
      );
    }

    if (sourceNode?.type === NodeType.ACTION_GROUP && targetNode?.type === NodeType.CONDITION && params.sourceHandle === 'condition-output') {
      filteredEdges = filteredEdges.filter(e => !(e.source === params.source && e.sourceHandle === 'condition-output'));
    }

    if (sourceNode?.type === NodeType.ACTION_GROUP && targetNode?.type === NodeType.ACTION && params.sourceHandle === 'action-output') {
      filteredEdges = filteredEdges.filter(e => !(e.source === params.source && e.sourceHandle === 'action-output'));
    }

    const edgeId = `edge_${params.source}_${params.target}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEdge: Edge = {
      id: edgeId,
      type: 'deletable',
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      className: `source-${sourceNode?.type}`,
      animated: true,
    };
    
    set({ edges: [...filteredEdges, newEdge] });
  },

  onReconnect: (oldEdge: Edge, newConnection: Connection) => {
    set({
      edges: reconnectEdge(oldEdge, newConnection, get().edges),
    });
  },

  setNodes: (nodesInput) => {
    set({
      nodes: typeof nodesInput === 'function' ? nodesInput(get().nodes) : nodesInput,
    });
  },

  setEdges: (edgesInput) => {
    set({
      edges: typeof edgesInput === 'function' ? edgesInput(get().edges) : edgesInput,
    });
  },

  updateNodeData: (nodeId: string, value: unknown, field: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, [field]: value },
          };
        }
        return node;
      }),
    });
  },

  duplicateNode: (id: string) => {
    const { nodes } = get();
    const nodeToDuplicate = nodes.find(n => n.id === id);
    if (!nodeToDuplicate) return;

    const newNodeId = `node_${Math.random().toString(36).substring(2, 7)}`;
    const newData = { ...nodeToDuplicate.data };
    
    if (nodeToDuplicate.type === NodeType.EVENT) {
      const eventData = newData as import('../types').EventNodeData;
      if (eventData.id) {
        eventData.id = `rule_${Math.random().toString(36).substring(2, 7)}`;
      }
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

    set({ nodes: [...nodes, newNode] });
  },

  addNodes: (newNodes: AppNode[]) => {
    set({
      nodes: [...get().nodes, ...newNodes],
    });
  },

  clearAll: () => {
    set({ nodes: [], edges: [] });
  },

  setGraph: (newNodes: AppNode[], newEdges: Edge[]) => {
    set({
      nodes: newNodes,
      edges: newEdges.map(e => ({ ...e, type: 'deletable' })),
    });
  },
}));
