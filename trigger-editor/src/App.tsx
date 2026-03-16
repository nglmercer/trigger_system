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
  NodeChange,
  EdgeChange,
  Connection,
  XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EventNode from './components/EventNode.tsx';
import ConditionNode from './components/ConditionNode.tsx';
import ConditionGroupNode from './components/ConditionGroupNode.tsx';
import ActionNode from './components/ActionNode.tsx';
import ActionGroupNode from './components/ActionGroupNode.tsx';
import RulePlayer from './components/RulePlayer.tsx';

import { RuleBuilder } from '../../src/sdk/builder.ts';
import { RuleExporter } from '../../src/sdk/exporter.ts';
import type { 
  EventNodeData, 
  ConditionNodeData, 
  ConditionGroupNodeData, 
  ActionNodeData, 
  ActionGroupNodeData 
} from './types.ts';
import type { ComparisonOperator, RuleCondition, Action, ActionGroup, ExecutionMode } from '../../src/types.ts';
import { NodeType, DRAG_DATA_FORMAT, INITIAL_HINT } from './constants.ts';
import { copyToClipboard, generateRandomId } from './utils.ts';

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

const initialNodes: AppNode[] = [
  {
    id: 'node-start',
    type: NodeType.EVENT,
    position: { x: 400, y: 250 },
    data: { 
      id: generateRandomId(),
      name: 'New Trigger Rule',
      description: '',
      event: '', 
      priority: 0,
      enabled: true,
      onChange: () => {} 
    },
  },
];

const initialEdges: Edge[] = [];

const getId = () => `node_${Math.random().toString(36).substring(2, 7)}`;

function NodeEditor() {
  const [nodes, setNodes] = useState<AppNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [isPreviewVisible, setIsPreviewVisible] = useState<boolean>(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds) as AppNode[]),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } }, eds)),
    []
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    []
  );

  const onNodeDataChange = useCallback((id: string, value: any, field: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      })
    );
  }, []);

  // Ensure nodes always have their onChange handlers
  useEffect(() => {
    setNodes((nds) => {
      let needsUpdate = false;
      const newNodes = nds.map((node) => {
        if (typeof node.data.onChange !== 'function' || node.id !== node.data._id) {
          needsUpdate = true;
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
      });
      return needsUpdate ? newNodes : nds;
    });
  }, [onNodeDataChange, nodes.length]); // Re-run when length changes (new nodes)
  
  const buildRule = useCallback(() => {
    try {
      const eventNode = nodes.find((n) => n.type === NodeType.EVENT) as Node<EventNodeData> | undefined;
      if (!eventNode) return null;

      const { id: ruleId, event: eventName, name: ruleName, description, priority, enabled, cooldown, tags } = eventNode.data;
      if (!ruleId || !eventName) return null;

      const builder = new RuleBuilder();
      builder.withId(ruleId).on(eventName);
      if (ruleName) builder.withName(ruleName);
      if (description) builder.withDescription(description);
      if (priority !== undefined) builder.withPriority(priority);
      if (enabled !== undefined) builder.withEnabled(enabled);
      if (cooldown !== undefined) builder.withCooldown(cooldown);
      if (tags && tags.length > 0) builder.withTags(tags);

      const resolveCondition = (nodeId: string, visited = new Set<string>()): RuleCondition | null => {
        if (visited.has(nodeId)) return null;
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        if (node.type === NodeType.CONDITION) {
          const { field, operator, value } = node.data as ConditionNodeData;
          return (field && operator) ? { field, operator: operator as ComparisonOperator, value } : null;
        } 
        
        if (node.type === NodeType.CONDITION_GROUP) {
          const { operator } = node.data as ConditionGroupNodeData;
          const subEdges = edges.filter(e => e.source === nodeId);
          const subConditions = subEdges
            .map(e => resolveCondition(e.target, visited))
            .filter((c): c is RuleCondition => c !== null);
          
          if (subConditions.length > 0) {
            return { operator: (operator || 'AND') as 'AND' | 'OR', conditions: subConditions };
          }
        }
        return null;
      };

      const resolveAction = (nodeId: string, visited = new Set<string>()): Action | null => {
        if (visited.has(nodeId)) return null;
        visited.add(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return null;

        if (node.type === NodeType.ACTION) {
          const { type, params } = node.data as ActionNodeData;
          if (type) {
            try {
              const parsedParams = params ? JSON.parse(params) : {};
              return { type, params: parsedParams };
            } catch (e) {
              return { type, params: {} };
            }
          }
        } 
        
        if (node.type === NodeType.ACTION_GROUP) {
          const { mode } = node.data as ActionGroupNodeData;
          const subEdges = edges.filter(e => e.source === nodeId);
          const subActions = subEdges
            .map(e => resolveAction(e.target, visited))
            .filter((a): a is Action => a !== null);
          
          if (subActions.length > 0) {
            return { 
              mode: (mode || 'ALL') as ExecutionMode, 
              actions: subActions 
            } as any;
          }
        }
        return null;
      };

      const rootEdges = edges.filter(e => e.source === eventNode.id);
      const conditions: RuleCondition[] = [];
      const actions: (Action | ActionGroup)[] = [];

      rootEdges.forEach(edge => {
        const cond = resolveCondition(edge.target);
        if (cond) conditions.push(cond);
        else {
          const act = resolveAction(edge.target);
          if (act) actions.push(act);
        }
      });

      if (conditions.length > 0) {
        builder.withIf(conditions.length === 1 ? conditions[0]! : conditions);
      }

      if (actions.length > 0) {
        if (actions.length === 1) builder.withDo(actions[0]!);
        else builder.withDo(actions as Action[]);
      }

      if (actions.length === 0) return null;
      return builder.build();
    } catch (e) {
      console.error('Error building rule:', e);
      return null;
    }
  }, [nodes, edges]);

  const { yaml } = useMemo(() => {
    const rule = buildRule();
    if (!rule) return { yaml: '' };
    return { yaml: RuleExporter.toCleanYaml(rule) };
  }, [buildRule]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(DRAG_DATA_FORMAT);

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: AppNode = {
        id: getId(),
        type,
        position,
        data: { onChange: () => {} } as any, // Cast to any temporarily, useEffect will fix it
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  const clearEditor = () => {
    setNodes(initialNodes);
    setEdges([]);
  };

  const copyYaml = async () => {
    if (yaml) {
      const success = await copyToClipboard(yaml);
      if (success) {
        const btn = document.getElementById('btn-copy');
        if (btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = '✓ Copied';
          btn.classList.add('btn--success');
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('btn--success');
          }, 2000);
        }
      }
    }
  };

  const togglePreview = () => setIsPreviewVisible(!isPreviewVisible);

  return (
    <div className="react-flow-wrapper" style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0d1117' }}>
      <aside className="panel sidebar" style={{ width: '300px', flexShrink: 0 }}>
        <div className="sidebar-header">
            <h1 className="sidebar-title">Components</h1>
            <p className="sidebar-subtitle">Drag onto canvas</p>
        </div>

        <div className="drag-group">
            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData(DRAG_DATA_FORMAT, NodeType.EVENT); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--event">◈</span>
                <div className="drag-info">
                    <span className="drag-name">Event Trigger</span>
                    <span className="drag-desc">Starts the rule</span>
                </div>
            </div>

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData(DRAG_DATA_FORMAT, NodeType.CONDITION); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--condition">⚖</span>
                <div className="drag-info">
                    <span className="drag-name">Condition</span>
                    <span className="drag-desc">Filter by field value</span>
                </div>
            </div>

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData(DRAG_DATA_FORMAT, NodeType.CONDITION_GROUP); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--condition">📂</span>
                <div className="drag-info">
                    <span className="drag-name">Condition Group</span>
                    <span className="drag-desc">AND / OR logical group</span>
                </div>
            </div>

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData(DRAG_DATA_FORMAT, NodeType.ACTION); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--action">⚡</span>
                <div className="drag-info">
                    <span className="drag-name">Action</span>
                    <span className="drag-desc">Execute a handler</span>
                </div>
            </div>

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData(DRAG_DATA_FORMAT, NodeType.ACTION_GROUP); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--action">📦</span>
                <div className="drag-info">
                    <span className="drag-name">Action Group</span>
                    <span className="drag-desc">Group of actions</span>
                </div>
            </div>
        </div>

        <div className="sidebar-divider"></div>
        <div className="sidebar-footer">
            <button className="btn btn-primary" onClick={() => setIsPlayerOpen(true)} style={{ marginBottom: '8px', background: 'var(--condition-color)' }}>
                ▶ Play / Test
            </button>
            <button id="btn-clear" className="btn btn-secondary" onClick={clearEditor}>
                ✕ Clear
            </button>
            <p className="version-label">Trigger System Graphics v2.0</p>
        </div>
      </aside>

      <main style={{ flexGrow: 1, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#0d1117' }}
          colorMode="dark"
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode={['Control', 'Meta']}
          selectionKeyCode={['Shift']}
        >
          <Background color="#30363d" gap={20} />
          <Controls />
        </ReactFlow>
        
      </main>

      <aside className="panel output-panel" style={{ width: isPreviewVisible ? '400px' : '60px', flexShrink: 0, transition: 'width 0.3s ease' }}>
        <div className="output-header" style={{ padding: isPreviewVisible ? '18px 20px' : '18px 10px', flexDirection: isPreviewVisible ? 'row' : 'column', gap: '20px' }}>
            {isPreviewVisible ? (
                <>
                    <div className="output-header-left">
                        <span className="output-title">YAML Output</span>
                        <span className="output-badge">React Flow</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button id="btn-copy" className="btn btn-icon" onClick={copyYaml} title="Copy YAML to clipboard">
                             ⎘ Copy
                        </button>
                        <button id="btn-toggle" className="btn btn-icon btn-secondary" onClick={togglePreview} title="Hide preview">
                             ◀
                        </button>
                    </div>
                </>
            ) : (
                <button id="btn-toggle" className="btn btn-icon" onClick={togglePreview} title="Show YAML preview" style={{ height: '40px', writingMode: 'vertical-lr', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '10px' }}>
                    ▶
                </button>
            )}
        </div>
        {isPreviewVisible && (
            <pre id="output" className={`output-content ${!yaml ? 'output-content--hint' : ''}`}>
              {yaml}
            </pre>
        )}
      </aside>

      <RulePlayer 
        isOpen={isPlayerOpen} 
        onClose={() => setIsPlayerOpen(false)} 
        rule={buildRule()} 
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
