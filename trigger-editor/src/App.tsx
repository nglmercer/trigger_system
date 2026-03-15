import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  useReactFlow,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EventNode from './components/EventNode.tsx';
import ConditionNode from './components/ConditionNode.tsx';
import ActionNode from './components/ActionNode.tsx';

import { RuleBuilder } from '../../src/sdk/builder.ts';
import { RuleExporter } from '../../src/sdk/exporter.ts';

const nodeTypes = {
  event: EventNode,
  condition: ConditionNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: 'node-start',
    type: 'event',
    position: { x: 400, y: 250 },
    data: { event: '', onChange: () => {} },
  },
];

const initialEdges: Edge[] = [];

let id = 0;
const getId = () => `node_${id++}`;

function NodeEditor() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [yaml, setYaml] = useState<string>('');
  const [hint, setHint] = useState<string>('Add an Event Trigger node to start building a rule...');

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
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

  // Update nodes with onChange handlers
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onChange: (val: any, field: string) => onNodeDataChange(node.id, val, field),
        },
      }))
    );
  }, [onNodeDataChange]);

  const generateYaml = useCallback(() => {
    try {
      const eventNode = nodes.find((n) => n.type === 'event');
      if (!eventNode) {
        setYaml('');
        setHint('Add an Event Trigger node to start building a rule...');
        return;
      }

      const eventName = eventNode.data.event;
      if (!eventName) {
        setYaml('');
        setHint('Give your Event Trigger a name (e.g. PAYMENT_RECEIVED)...');
        return;
      }

      const builder = new RuleBuilder();
      builder.on(eventName);

      // Simple traversal: Event -> Condition(s) -> Action(s)
      // This is a simplified version of the previous logic
      let currentNodeId = eventNode.id;
      let hasConnections = false;

      // Find all connected paths
      const traverse = (nodeId: string) => {
        const connectedEdges = edges.filter((e) => e.source === nodeId);
        connectedEdges.forEach((edge) => {
          hasConnections = true;
          const target = nodes.find((n) => n.id === edge.target);
          if (target) {
            if (target.type === 'condition') {
              const { field, operator, value } = target.data;
              if (field && operator && value) {
                builder.if(field, operator, value);
              }
              traverse(target.id);
            } else if (target.type === 'action') {
              const { type, params } = target.data;
              if (type) {
                try {
                  const parsedParams = params ? JSON.parse(params) : {};
                  builder.do(type, parsedParams);
                } catch (e) {
                  // Fallback if JSON is invalid
                  builder.do(type, {});
                }
              }
            }
          }
        });
      };

      traverse(currentNodeId);

      if (!hasConnections) {
        setYaml('');
        setHint('Connect a Condition or Action node to complete the rule...');
        return;
      }

      // Check if we have at least one action
      const rule = builder.build();
      if (!rule.do || rule.do.length === 0) {
        setYaml('');
        setHint('Connect at least one Action node...');
        return;
      }

      const yamlOutput = RuleExporter.toCleanYaml(rule);
      setYaml(yamlOutput);
      setHint('');
    } catch (e) {
      console.error('Error generating YAML:', e);
    }
  }, [nodes, edges]);

  useEffect(() => {
    generateYaml();
  }, [nodes, edges, generateYaml]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { onChange: () => {} },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  const clearEditor = () => {
    setNodes(initialNodes);
    setEdges([]);
  };

  const copyYaml = () => {
    if (yaml) {
      navigator.clipboard.writeText(yaml);
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
  };

  return (
    <div className="react-flow-wrapper" style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0d1117' }}>
      <aside className="panel sidebar" style={{ width: '300px', flexShrink: 0 }}>
        <div className="sidebar-header">
            <h1 className="sidebar-title">Components</h1>
            <p className="sidebar-subtitle">Drag onto canvas</p>
        </div>

        <div className="drag-group">
            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData('application/reactflow', 'event'); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--event">◈</span>
                <div className="drag-info">
                    <span className="drag-name">Event Trigger</span>
                    <span className="drag-desc">Starts the rule</span>
                </div>
            </div>

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData('application/reactflow', 'condition'); event.dataTransfer.effectAllowed = 'move'; }}>
                <span className="drag-icon drag-icon--condition">⚖</span>
                <div className="drag-info">
                    <span className="drag-name">Condition</span>
                    <span className="drag-desc">Filter by field value</span>
                </div>
            </div>

            <div className="drag-item" draggable onDragStart={(event) => { event.dataTransfer.setData('application/reactflow', 'action'); event.dataTransfer.effectAllowed = 'move'; }}>
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

      <aside className="panel output-panel" style={{ width: '400px', flexShrink: 0 }}>
        <div className="output-header">
            <div className="output-header-left">
                <span className="output-title">YAML Output</span>
                <span className="output-badge">React Flow</span>
            </div>
            <button id="btn-copy" className="btn btn-icon" onClick={copyYaml} title="Copy YAML to clipboard">
                ⎘ Copy
            </button>
        </div>
        <pre id="output" className={`output-content ${!yaml ? 'output-content--hint' : ''}`}>
          {yaml || `# ${hint}`}
        </pre>
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
