import * as React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Sidebar from './components/Sidebar.tsx';
import OutputPanel from './components/OutputPanel.tsx';
import { ParamsModal } from './components/ParamsModal.tsx';
import { AlertProvider, useAlert } from './components/Alert.tsx';

import { nodeTypes } from './nodes';

import { useRuleBuilder, useNodeEdgeState, useImportExport, useConnectionValidation } from './hooks';
import { NodeType, DRAG_DATA_FORMAT } from './constants.ts';
import { generateRandomId } from './utils.ts';
import type { AppNode } from './types.ts';
import { loadImports } from './lsp/engine.ts';
import type { ImportConfig } from './lsp/types.ts';
import { getSharedDataFromUrl, clearShareDataFromUrl } from './utils/exportImport.ts';

// Node types are now imported from ./nodes/index.ts

// Helper to generate unique node IDs
const getId = () => `node_${Math.random().toString(36).substring(2, 7)}`;

function NodeEditor() {
  // Use modular hooks for state management
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges,
    onNodesChange, 
    onEdgesChange, 
    onNodeDataChange, 
    onConnect, 
    onReconnect, 
    clearAll,
    setGraph
  } = useNodeEdgeState();

  const { success } = useAlert();

  // Import/Export hook
  const {
    handleExportJson,
    handleExportYaml,
    handleImport,
    handleImportYaml,
    handleShare,
    loadSharedData,
    clearSharedData
  } = useImportExport(
    nodes, 
    edges, 
    () => yaml || '',
    onNodeDataChange,
    setGraph,
    success
  );

  // Connection validation hook
  const { isValidConnection } = useConnectionValidation(nodes, edges);

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

  // Load shared data from URL - runs after initial render
  useEffect(() => {
    const sharedData = loadSharedData();
    if (sharedData && sharedData.nodes.length > 0) {
      setGraph(sharedData.nodes, sharedData.edges || []);
      clearSharedData();
      console.log('Loaded shared project with', sharedData.nodes.length, 'nodes');
    }
  }, [loadSharedData, clearSharedData, setGraph]);

  const buildRule = useRuleBuilder(nodes, edges);
  
  // Compute rule, yaml and errors in real-time
  const { rule, yaml, errors } = useMemo(() => buildRule(), [buildRule]);

  // Screen to flow position hook
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
          } : {}),
          ...(type === NodeType.DO ? {
            branchType: 'do' as const
          } : {})
        },
      };
      setNodes((nds) => nds.concat(newNode as AppNode));
    },
    [screenToFlowPosition, setNodes, clearAll]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="react-flow-wrapper" style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0d1117' }}>
      <Sidebar 
        onClear={clearAll} 
        onExportJson={handleExportJson}
        onExportYaml={handleExportYaml}
        onImport={handleImport}
        onImportYaml={handleImportYaml}
        onShare={handleShare}
        hasNodes={nodes.length > 0}
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
