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
        // We should clean up any existing outgoing edges from the Condition
        // because "cannot have action when in a group".
        if (sourceNode?.type === NodeType.CONDITION_GROUP && targetNode?.type === NodeType.CONDITION) {
           return addEdge(params, eds.filter(e => e.source !== targetNode.id));
        }

        return addEdge(params, eds);
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
    //const isSourceCondition = sourceNode.type === NodeType.CONDITION || sourceNode.type === NodeType.CONDITION_GROUP;
    const isTargetCondition = targetNode.type === NodeType.CONDITION || targetNode.type === NodeType.CONDITION_GROUP;

    // RULE 1: Actions cannot point to Conditions
    if (isSourceAction && isTargetCondition) return false;

    // RULE 2: Condition Group 'input' handle (Left) can be Target of Event or other Conditions
    // RULE 3: Condition Group 'output' handles (Right/Top/Bottom)
    if (sourceNode.type === NodeType.CONDITION_GROUP) {
       // Right point to Actions/Groups
       // Top/Bottom point to child Conditions
       const isDiscoveryEdge = isTargetCondition && (connection.sourceHandle?.includes('cond'));
       const isAllowedTarget = isTargetAction || targetNode.type === NodeType.CONDITION_GROUP || isDiscoveryEdge;
       if (!isAllowedTarget) return false;
    }

    // RULE 4: If EventTrigger is connected to ConditionGroup, it cannot connect to Conditions or Actions directly
    if (sourceNode.type === NodeType.EVENT) {
      // Check if this Event is already connected to a ConditionGroup
      const hasConditionGroupConnection = edges.some(edge => {
        const targetNode = nodes.find(n => n.id === edge.target);
        return edge.source === sourceNode.id && targetNode?.type === NodeType.CONDITION_GROUP;
      });
      
      if (hasConditionGroupConnection && (isTargetCondition || isTargetAction)) {
        return false;
      }
    }

    // RULE 5: If Action is connected to ActionGroup, it cannot connect to Conditions - must go through ActionGroup
    if ((sourceNode.type === NodeType.ACTION || sourceNode.type === NodeType.ACTION_GROUP) && isTargetCondition) {
      // Check if this Action is already connected to an ActionGroup (as target of an ActionGroup)
      const isConnectedToActionGroup = edges.some(edge => {
        const sourceNodeOfEdge = nodes.find(n => n.id === edge.source);
        return edge.target === sourceNode.id && sourceNodeOfEdge?.type === NodeType.ACTION_GROUP;
      });
      
      if (isConnectedToActionGroup) {
        return false;
      }
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
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <NodeEditor />
    </ReactFlowProvider>
  );
}
