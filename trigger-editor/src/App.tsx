import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
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
import { useRFStore } from './store/rfStore.ts';
import { DEFAULT_SHORTCUTS, isShortcut } from './utils/shortcuts.ts';
import type { AppNode } from './types.ts';
import type { ImportConfig } from './lsp/types.ts';
import { getSharedDataFromUrl, clearShareDataFromUrl } from './utils/exportImport.ts';
import { TriggerEngine } from '../../src/core/trigger-engine.ts';

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
    addNodes,
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
    handleExportSelected,
    handleImport,
    handleImportYaml,
    handleImportNodesOnly,
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
    success,
    addNodes
  );

  const buildRule = useRuleBuilder(nodes, edges);
  const { rules, yaml, errors } = useMemo(() => buildRule(), [buildRule]);

  // Maintain a live ref to the rules for testing decoupled from UI re-renders
  const currentRules = useRef(rules);
  useEffect(() => {
    currentRules.current = rules;
  }, [rules]);

  // Parent postMessage integration
  useEffect(() => {
    // Default hostIntegration to false if not set
    if (window.hostIntegration === undefined) {
      window.hostIntegration = false;
    }

    // Expose methods to window for desktop/IPC integration
    window.triggerEditor = {
      ...(window.triggerEditor || {}),
      importJson: importJsonData,
      importYaml: importYamlData,
      requestExport: handleHostExport,
      clear: clearAll,
      testEvent: async (eventName: string, data = {}, vars = {}, state = {}) => {
        // Run TriggerEngine simulation using the ONLY the active editing rules
        const engine = new TriggerEngine(currentRules.current);
        const context = {
          event: eventName,
          data,
          vars,
          state,
          timestamp: Date.now()
        };
        try {
          return await engine.processEvent(context);
        } catch (err) {
          console.error('[TriggerEngine Simulation] Error:', err);
          return { error: String(err) };
        }
      }
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
      if (window.triggerEditor) {
        delete window.triggerEditor.importJson;
        delete window.triggerEditor.importYaml;
        delete window.triggerEditor.requestExport;
        delete window.triggerEditor.clear;
        delete window.triggerEditor.testEvent;
      }
    };
  }, [importYamlData, importJsonData, handleHostExport, clearAll]);

  // Connection validation hook
  const { isValidConnection } = useConnectionValidation(nodes, edges);

  // Clipboard for copy/paste nodes
  const clipboard = useRef<AppNode[]>([]);

  const undo = useRFStore(s => s.undo);
  const redo = useRFStore(s => s.redo);
  const takeSnapshot = useRFStore(s => s.takeSnapshot);

  // Keyboard shortcuts for copy/paste/undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        return;
      }

      // Undo
      if (isShortcut(event, DEFAULT_SHORTCUTS.UNDO)) {
        event.preventDefault();
        undo();
        return;
      }

      // Redo
      if (isShortcut(event, DEFAULT_SHORTCUTS.REDO)) {
        event.preventDefault();
        redo();
        return;
      }

      // Copy
      if (isShortcut(event, DEFAULT_SHORTCUTS.COPY)) {
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length > 0) {
          const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
          const selectedEdges = edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
          
          const nodesToCopy = selectedNodes.map(node => {
            const { onChange, onDuplicate, ...cleanData } = (node.data || {}) as any;
            return {
              ...node,
              selected: false,
              data: cleanData
            };
          });
          
          clipboard.current = nodesToCopy as AppNode[];
          
          try {
            const clipboardData = { nodes: nodesToCopy, edges: selectedEdges };
            navigator.clipboard.writeText(JSON.stringify(clipboardData));
          } catch (e) {
            console.error('Clipboard copy failed:', e);
          }
          success(t('notifications.nodesCopied', { count: selectedNodes.length }));
        }
        return;
      }

      // Paste
      if (isShortcut(event, DEFAULT_SHORTCUTS.PASTE)) {
        const handlePasteData = (nodesToPaste: any[], edgesToPaste: any[] = []) => {
          if (!nodesToPaste || nodesToPaste.length === 0) return;

          const nodeMap = new Map<string, string>();
          const pastedNodes = nodesToPaste.map(node => {
            const newId = getId();
            nodeMap.set(node.id, newId);
            return {
              ...node,
              id: newId,
              selected: true,
              position: {
                x: node.position.x + 40,
                y: node.position.y + 40,
              },
              data: {
                ...node.data,
                _id: newId,
              }
            };
          });

          const validEdges = (edgesToPaste || []).map(edge => ({
            ...edge,
            id: `edge-${getId()}`,
            source: nodeMap.get(edge.source),
            target: nodeMap.get(edge.target),
            selected: true,
          })).filter(e => e.source && e.target);

          // Deselect current nodes and edges
          setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
          setEdges((eds) => eds.map(e => ({ ...e, selected: false })));

          addNodes(pastedNodes as AppNode[]);
          if (validEdges.length > 0) {
            setEdges((eds) => [...eds, ...(validEdges as Edge[])]);
          }
          success(t('notifications.nodesPasted', { count: pastedNodes.length }));
        };

        const tryPasteFromJson = async () => {
          try {
            const text = await navigator.clipboard.readText();
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
              handlePasteData(parsed);
              return true;
            } else if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
              handlePasteData(parsed.nodes, parsed.edges);
              return true;
            }
          } catch (e) {
            // Not JSON or permission denied
          }
          return false;
        };

        tryPasteFromJson().then(wasPasted => {
          if (!wasPasted && clipboard.current.length > 0) {
            handlePasteData(clipboard.current, []);
          }
        });
        
        return;
      }

      // Export/Save
      if (isShortcut(event, DEFAULT_SHORTCUTS.EXPORT) || isShortcut(event, DEFAULT_SHORTCUTS.SAVE)) {
        event.preventDefault();
        handleHostExport();
        return;
      }

      // Clear Canvas
      if (isShortcut(event, DEFAULT_SHORTCUTS.CLEAR)) {
        event.preventDefault();
        if (window.confirm(t('sidebar.resetCanvas') + '?')) {
           clearAll();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, addNodes, onNodeDataChange, setNodes, success, t, undo, redo, handleHostExport, clearAll]);

  // ImportManager handles loading imports from localStorage automatically
  // No need to manually load here anymore

  // Load shared data from URL - runs after initial render
  useEffect(() => {
    const sharedData = loadSharedData();
    if (sharedData && sharedData.nodes.length > 0) {
      setGraph(sharedData.nodes, sharedData.edges || []);
      clearSharedData();
      console.log('Loaded shared project with', sharedData.nodes.length, 'nodes');
    }
  }, [loadSharedData, clearSharedData, setGraph]);

  // (Moved rules computation above for testEvent referencing)

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
        onExportSelected={handleExportSelected}
        onImport={handleImport}
        onImportYaml={handleImportYaml}
        onImportNodesOnly={handleImportNodesOnly}
        onShare={handleShare}
        onAddNode={addNode}
        handleHostExport={handleHostExport}
        hasNodes={nodes.length > 0}
        hasSelectedNodes={nodes.some(n => n.selected)}
      />

      <main style={{ flexGrow: 1, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onNodeDragStart={() => takeSnapshot()}
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
