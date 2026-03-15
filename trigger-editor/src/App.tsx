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
import ActionNode from './components/ActionNode.tsx';

import { RuleBuilder } from '../../src/sdk/builder.ts';
import { RuleExporter } from '../../src/sdk/exporter.ts';
import type { EventNodeData, ConditionNodeData, ActionNodeData } from './types.ts';
import type { ComparisonOperator } from '../../src/types.ts';
import { NodeType, DRAG_DATA_FORMAT, INITIAL_HINT } from './constants.ts';
import { copyToClipboard, generateRandomId } from './utils.ts';

const nodeTypes = {
  [NodeType.EVENT]: EventNode,
  [NodeType.CONDITION]: ConditionNode,
  [NodeType.ACTION]: ActionNode,
};

type AppNode = Node<EventNodeData | ConditionNodeData | ActionNodeData>;

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

  const { yaml, hint } = useMemo(() => {
    try {
      const eventNode = nodes.find((n) => n.type === NodeType.EVENT) as Node<EventNodeData> | undefined;
      if (!eventNode) {
        return { yaml: '', hint: INITIAL_HINT };
      }

      const { id: ruleId, event: eventName, name: ruleName, description } = eventNode.data;
      if (!ruleId) {
        return { yaml: '', hint: 'Give your rule a unique ID...' };
      }
      if (!eventName) {
        return { yaml: '', hint: 'Give your Event Trigger a name (e.g. PAYMENT_RECEIVED)...' };
      }

      const builder = new RuleBuilder();
      builder.withId(ruleId).on(eventName);
      if (ruleName) builder.withName(ruleName);
      if (description) builder.withDescription(description);

      let hasActions = false;

      // Find all connected paths
      const traverse = (nodeId: string) => {
        const connectedEdges = edges.filter((e) => e.source === nodeId);
        connectedEdges.forEach((edge) => {
          const target = nodes.find((n) => n.id === edge.target) as AppNode | undefined;
          if (target) {
            if (target.type === NodeType.CONDITION) {
              const { field, operator, value } = target.data as ConditionNodeData;
              if (field && operator && value) {
                builder.if(field, operator as ComparisonOperator, value);
              }
              traverse(target.id);
            } else if (target.type === NodeType.ACTION) {
              const { type, params } = target.data as ActionNodeData;
              if (type) {
                hasActions = true;
                try {
                  const parsedParams = params ? JSON.parse(params) : {};
                  builder.do(type, parsedParams);
                } catch (e) {
                  builder.do(type, {});
                }
              }
            }
          }
        });
      };

      traverse(eventNode.id);

      if (!hasActions) {
        return { yaml: '', hint: 'Connect at least one Action node...' };
      }

      const rule = builder.build();
      const yamlOutput = RuleExporter.toCleanYaml(rule);
      return { yaml: yamlOutput, hint: '' };
    } catch (e) {
      console.error('Error generating YAML:', e);
      return { yaml: '', hint: 'Error generating rule: ' + (e as Error).message };
    }
  }, [nodes, edges]);

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

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData(DRAG_DATA_FORMAT, NodeType.ACTION); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--action">⚡</span>
                <div className="drag-info">
                    <span className="drag-name">Action</span>
                    <span className="drag-desc">Execute a handler</span>
                </div>
            </div>
        </div>

        <div className="sidebar-divider"></div>

        <div className="sidebar-hint">
            <p>Connect <strong>Event → Action</strong> to create a rule. Add <strong>Conditions</strong> in between to filter.</p>
        </div>

        <div className="sidebar-footer">
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
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#0d1117' }}
          colorMode="dark"
        >
          <Background color="#30363d" gap={20} />
          <Controls />
        </ReactFlow>
        
        {hint && (
          <div id="canvas-hint">
            💡 {hint}
          </div>
        )}
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
                    YAML Output ▶
                </button>
            )}
        </div>
        {isPreviewVisible && (
            <pre id="output" className={`output-content ${!yaml ? 'output-content--hint' : ''}`}>
              {yaml || `# ${hint}`}
            </pre>
        )}
      </aside>
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
