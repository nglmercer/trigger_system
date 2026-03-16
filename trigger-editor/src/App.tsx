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
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
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
    
    // Strict flow: Event -> Condition -> Action
    const isSourceAction = sourceNode.type === NodeType.ACTION || sourceNode.type === NodeType.ACTION_GROUP;
    const isTargetCondition = targetNode.type === NodeType.CONDITION || targetNode.type === NodeType.CONDITION_GROUP;
    if (isSourceAction && isTargetCondition) return false;
    
    return true;
  }, [nodes]);

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
      setNodes((nds) => nds.concat(newNode as any));
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
