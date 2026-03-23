import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsMobile } from './hooks/useMediaQuery.ts';
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
import { ShortcutsModal } from './components/ShortcutsModal.tsx';
import { AlertProvider, useAlert } from './components/Alert.tsx';
import { KeyboardIcon } from './components/Icons.tsx';
import { useTranslation } from 'react-i18next';

import { nodeTypes } from './nodes';
import DeletableEdge from './edges/DeletableEdge.tsx';

const edgeTypes = {
  deletable: DeletableEdge,
};

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
  const isMobile = useIsMobile();
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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const { t } = useTranslation();

  const { success } = useAlert();

  // Import/Export hook
  const {
    handleExportJson,
    handleExportYaml,
    handleImport,
    handleImportYaml,
    handleShare,
    loadSharedData,
    clearSharedData,
    importYamlData,
    importJsonData,
    handleHostExport
  } = useImportExport(
    nodes, 
    edges, 
    () => yaml || '',
    onNodeDataChange,
    setGraph,
    success
  );

  // Parent postMessage integration
  useEffect(() => {
    // Default hostIntegration to false if not set
    if ((window as any).hostIntegration === undefined) {
      (window as any).hostIntegration = false;
    }

    // Expose methods to window for desktop/IPC integration
    (window as any).triggerEditor = {
      importJson: importJsonData,
      importYaml: importYamlData,
      requestExport: handleHostExport,
      clear: clearAll,
    };

    const events = {
      TRIGGER_EDITOR_IMPORT : 'TRIGGER_EDITOR_IMPORT',
      TRIGGER_EDITOR_REQUEST_EXPORT: 'TRIGGER_EDITOR_REQUEST_EXPORT',
      TRIGGER_EDITOR_CLEAR: 'TRIGGER_EDITOR_CLEAR',
    }
    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;
      switch(data.type) {
        case events.TRIGGER_EDITOR_IMPORT:
          if (data.format === 'yaml' && typeof data.payload === 'string') {
            importYamlData(data.payload);
          } else if (data.format === 'json' && data.payload) {
            importJsonData(data.payload);
          }
          break;
        case events.TRIGGER_EDITOR_REQUEST_EXPORT:
          handleHostExport();
          break;
        case events.TRIGGER_EDITOR_CLEAR:
          clearAll();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      delete (window as any).triggerEditor;
    };
  }, [importYamlData, importJsonData, handleHostExport, clearAll]);

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
  
  // Compute rules, yaml and errors in real-time
  const { rules, yaml, errors } = useMemo(() => buildRule(), [buildRule]);

  // Screen to flow position hook
  const { screenToFlowPosition } = useReactFlow();

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const flowPosition = position 
        ? screenToFlowPosition(position) 
        : screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

      const newNode = {
        id: getId(),
        type,
        position: flowPosition,
        data: { 
          onChange: () => {},
          onDuplicate: () => {},
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
    [screenToFlowPosition, setNodes]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_DATA_FORMAT);
      if (!type) return;

      addNode(type, { x: event.clientX, y: event.clientY });
    },
    [addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="react-flow-wrapper" style={{ 
      display: 'flex', 
      width: '100dvw', 
      height: '100dvh', 
      background: '#0d1117',
      position: 'relative',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      <Sidebar 
        onClear={clearAll} 
        onExportJson={handleExportJson}
        onExportYaml={handleExportYaml}
        onImport={handleImport}
        onImportYaml={handleImportYaml}
        onShare={handleShare}
        onAddNode={addNode}
        handleHostExport={handleHostExport}
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
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'deletable', interactionWidth: 20 }}
          fitView
          colorMode="dark"
        >
          <Background color="#30363d" gap={20} />
          <Controls />
        </ReactFlow>
        
        {/* Floating Help Shortcut Icon */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          style={{
            position: 'absolute',
            left: isMobile ? '2.2rem' : '0.9rem',
            bottom: isMobile ? '9rem' : '8rem', // Above the Controls
            zIndex: 10,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            padding: isMobile ? '6px' : '8px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
          }}
          title={t('shortcuts.title')}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <KeyboardIcon size={isMobile ? 12 : 14} />
        </button>
      </main>

      <OutputPanel yaml={yaml} errors={errors} />
      
      <ParamsModal />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
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
