import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  useReactFlow,
  reconnectEdge,
} from '@xyflow/react';
import type {
  Node,
  Edge,
  Connection,
  EdgeChange,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Sidebar from './components/Sidebar.tsx';
import OutputPanel from './components/OutputPanel.tsx';
import RulePlayer from './components/RulePlayer.tsx';
import { ParamsModal } from './components/ParamsModal.tsx';
import { AlertProvider } from './components/Alert.tsx';

import EventNode from './components/EventNode.tsx';
import ConditionNode from './components/ConditionNode.tsx';
import ConditionGroupNode from './components/ConditionGroupNode.tsx';
import ActionNode from './components/ActionNode.tsx';
import ActionGroupNode from './components/ActionGroupNode.tsx';

import { useRuleBuilder } from './hooks/useRuleBuilder.ts';
import { NodeType, DRAG_DATA_FORMAT } from './constants.ts';
import { generateRandomId } from './utils.ts';
import type { 
  EventNodeData, 
  ConditionNodeData, 
  ConditionGroupNodeData, 
  ActionNodeData, 
  ActionGroupNodeData 
} from './types.ts';
import { loadImports } from './lsp/engine.ts';
import type { ImportConfig } from './lsp/types.ts';

const nodeTypes = {
  [NodeType.EVENT]: EventNode,
  [NodeType.CONDITION]: ConditionNode,
  [NodeType.CONDITION_GROUP]: ConditionGroupNode,
  [NodeType.ACTION]: ActionNode,
  [NodeType.ACTION_GROUP]: ActionGroupNode,
};

type AppNode = Node<
  EventNodeData | 
  ConditionNodeData | 
  ConditionGroupNodeData | 
  ActionNodeData | 
  ActionGroupNodeData
>;

const getId = () => `node_${Math.random().toString(36).substring(2, 7)}`;

function NodeEditor() {
  const [nodes, setNodes] = useState<AppNode[]>([]);
  
  // Initialize imports from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('trigger-editor-imports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const configs: ImportConfig[] = parsed.map((p: any) => ({
          id: p.id,
          alias: p.alias,
          data: p.data,
          mode: p.mode
        }));
        if (configs.length > 0) {
          loadImports(configs);
        }
      } catch (e) {
        console.warn('Failed to load imports:', e);
      }
    }
  }, []);
  
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as AppNode[]),
    []
  );

  const [edges, setEdges] = useState<Edge[]>([]);
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const buildRule = useRuleBuilder(nodes, edges);
  
  // Compute rule, yaml and errors in real-time
  const { rule, yaml, errors } = useMemo(() => buildRule(), [buildRule]);

  const onNodeDataChange = useCallback((id: string, value: any, field: string) => {
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
  }, [setNodes]);

  // Ensure nodes have their onChange and latest state
  useEffect(() => {
    setNodes((nds) => 
      nds.map((node) => {
        if (typeof node.data.onChange !== 'function' || node.data._id !== node.id) {
          return {
            ...node,
            data: {
              ...node.data,
              _id: node.id,
              onChange: (val: any, f: string) => onNodeDataChange(node.id, val, f),
            },
          };
        }
        return node;
      })
    );
  }, [nodes.length, onNodeDataChange, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds: Edge[]) => {
        const sourceNode = nodes.find(n => n.id === params.source);
        const targetNode = nodes.find(n => n.id === params.target);

        // Logic: If a Condition is being connected TO a Group (Forward Discovery)
        // We should clean up any outgoing edges from the Condition
        // because "cannot have action when in a group".
        if (sourceNode?.type === NodeType.CONDITION_GROUP && targetNode?.type === NodeType.CONDITION) {
           return addEdge(params, eds.filter(e => e.source !== targetNode.id));
        }

        // Generate unique edge ID to prevent merging
        const edgeId = `edge_${params.source}_${params.target}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Create edge with unique ID and class for coloring
        const newEdge: Edge = {
          id: edgeId,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          className: `source-${sourceNode?.type}`,
        };
        
        // Add edge directly to allow multiple edges between same nodes
        return [...eds, newEdge];
      });
    },
    [setEdges, nodes]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els: Edge[]) => reconnectEdge(oldEdge, newConnection, els)),
    [setEdges]
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return false;
    if (targetNode.type === NodeType.EVENT) return false;
    
    // Node Category Helpers
    const isSourceAction = sourceNode.type === NodeType.ACTION || sourceNode.type === NodeType.ACTION_GROUP;
    const isTargetAction = targetNode.type === NodeType.ACTION || targetNode.type === NodeType.ACTION_GROUP;
    const isSourceCondition = sourceNode.type === NodeType.CONDITION || sourceNode.type === NodeType.CONDITION_GROUP;
    const isTargetCondition = targetNode.type === NodeType.CONDITION || targetNode.type === NodeType.CONDITION_GROUP;

    // ============================================================
    // RULE 1: Event Node can only have ONE single connection
    // ============================================================
    if (sourceNode.type === NodeType.EVENT) {
      const existingOutgoingEdges = edges.filter(e => e.source === sourceNode.id);
      if (existingOutgoingEdges.length >= 1) {
        return false; // Event can only have one outgoing connection
      }
    }

    // ============================================================
    // RULE 2: Condition Group - Input handle only accepts Event or Condition
    // ============================================================
    if (targetNode.type === NodeType.CONDITION_GROUP && connection.targetHandle === 'input') {
      // Input of ConditionGroup can only accept from Event or Condition (not from Action or ActionGroup)
      if (sourceNode.type === NodeType.ACTION || sourceNode.type === NodeType.ACTION_GROUP) {
        return false;
      }
    }

    // ============================================================
    // RULE 3: Condition Group - Output connects to Conditions
    // ConditionGroup can connect to multiple Conditions in sequence
    // ============================================================
    if (sourceNode.type === NodeType.CONDITION_GROUP) {
      // Right handle of ConditionGroup can connect to Conditions
      if (connection.sourceHandle?.startsWith('cond')) {
        // Can only connect to Conditions (not to Actions or ActionGroups)
        if (targetNode.type !== NodeType.CONDITION) {
          return false;
        }
      }
    }

    // ============================================================
    // RULE 4: Conditions chain - Only the LAST condition can connect to Action/ActionGroup
    // Conditions cannot connect to Condition Groups
    // ============================================================
    if (sourceNode.type === NodeType.CONDITION) {
      // Condition cannot connect to ConditionGroup
      if (targetNode.type === NodeType.CONDITION_GROUP) {
        return false;
      }
      
      // Check outputs of this condition
      const conditionHasActionOutput = edges.some(e => 
        e.source === sourceNode.id && 
        (nodes.find(n => n.id === e.target)?.type === NodeType.ACTION ||
         nodes.find(n => n.id === e.target)?.type === NodeType.ACTION_GROUP)
      );

      const conditionHasConditionOutput = edges.some(e => 
        e.source === sourceNode.id && 
        nodes.find(n => n.id === e.target)?.type === NodeType.CONDITION
      );
      
      // If connecting to Action
      if (isTargetAction || targetNode.type === NodeType.ACTION_GROUP) {
        // Only one Action output allowed, and ONLY if we don't already have a Condition output (only the last condition can connect to Action)
        if (conditionHasActionOutput || conditionHasConditionOutput) {
          return false;
        }
      }
      
      // If connecting to another Condition, that's a chain (allowed)
      if (targetNode.type === NodeType.CONDITION) {
        // Cannot connect to another condition if it already has an Action output
        if (conditionHasActionOutput || conditionHasConditionOutput) {
          return false;
        }

        // Check if target condition already has an input from another condition
        const targetHasConditionInput = edges.some(e => 
          e.target === targetNode.id &&
          nodes.find(n => n.id === e.source)?.type === NodeType.CONDITION
        );
        // Allow if target has no condition input yet (for chaining)
        if (targetHasConditionInput) {
          return false;
        }
      }
    }

    // ============================================================
    // RULE 5: Action Group - Input can accept from Event, Condition, ConditionGroup, or Action
    // (Action can connect directly to ActionGroup for grouping)
    // ============================================================
    if (targetNode.type === NodeType.ACTION_GROUP) {
      // ActionGroup can receive from Event, Condition, ConditionGroup, or Action
      const isValidSource = 
        sourceNode.type === NodeType.EVENT || 
        sourceNode.type === NodeType.CONDITION || 
        sourceNode.type === NodeType.CONDITION_GROUP ||
        sourceNode.type === NodeType.ACTION;
      if (!isValidSource) {
        return false; // ActionGroup can only receive from Event/Condition/ConditionGroup/Action
      }
    }

    // ============================================================
    // RULE 6: Action can connect to ActionGroup (for grouping)
    // AND can connect to another Action (for chaining in ActionGroup context)
    // ============================================================
    if (sourceNode.type === NodeType.ACTION) {
      // Action can connect to ActionGroup
      if (targetNode.type === NodeType.ACTION_GROUP) {
        return true;
      }
      
      // Action can also connect to another Action (for chaining)
      // This enables sequential action execution within an ActionGroup
      if (targetNode.type === NodeType.ACTION) {
        // Allow any Action-to-Action connection since handles are now always visible
        // The actual execution order will be determined by the ActionGroup mode
        return true;
      }
      
      // Action cannot connect directly to Condition or ConditionGroup
      if (isTargetCondition) {
        return false;
      }
    }

    // ============================================================
    // RULE 7: Action Group can connect to Actions (for chaining within group)
    // ============================================================
    if (sourceNode.type === NodeType.ACTION_GROUP) {
      // ActionGroup can connect to Actions (for sequential execution)
      if (targetNode.type === NodeType.ACTION) {
        return true;
      }
      
      // ActionGroup cannot connect to Conditions
      if (isTargetCondition) {
        return false;
      }
    }

    // ============================================================
    // RULE 8: Prevent circular connections
    // ============================================================
    // Check if creating this edge would create a cycle
    const wouldCreateCycle = (sourceId: string, targetId: string): boolean => {
      const visited = new Set<string>();
      const stack = [targetId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === sourceId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        edges.filter(e => e.source === current).forEach(e => stack.push(e.target));
      }
      return false;
    };
    
    if (wouldCreateCycle(sourceNode.id, targetNode.id)) {
      return false;
    }
    
    return true;
  }, [nodes, edges]);

  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_DATA_FORMAT);
      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: getId(),
        type,
        position,
        data: { 
          onChange: () => {},
          ...(type === NodeType.EVENT ? { 
            id: generateRandomId(), 
            name: 'New Rule', 
            enabled: true, 
            priority: 0,
            event: ''
          } : {})
        },
      };
      // please fix or implement a better types or builder for make and build, never use any
      //@ts-expect-error
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="react-flow-wrapper" style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0d1117' }}>
      <Sidebar 
        onPlay={() => setIsPlayerOpen(true)} 
        onClear={() => { setNodes([]); setEdges([]); }} 
      />

      <main style={{ flexGrow: 1, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          fitView
          colorMode="dark"
        >
          <Background color="#30363d" gap={20} />
          <Controls />
        </ReactFlow>
      </main>

      <OutputPanel yaml={yaml} errors={errors} />

      <RulePlayer 
        isOpen={isPlayerOpen} 
        onClose={() => setIsPlayerOpen(false)} 
        rule={rule}
        errors={errors}
      />
      
      <ParamsModal />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AlertProvider>
        <NodeEditor />
      </AlertProvider>
    </ReactFlowProvider>
  );
}
