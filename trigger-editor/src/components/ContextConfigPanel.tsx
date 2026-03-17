import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useAlert } from './Alert.tsx';
import { SettingsIcon, DatabaseIcon, BracketsIcon, PlusIcon, TrashIcon } from './Icons.tsx';
import type { DataSourceConfig, ContextType, ImportConfig, ImportMode } from './ContextConfig.ts';
import {
  DEFAULT_DATA_SOURCES,
  getLastContextId,
  setLastContextId,
  getDataFromSource,
  loadFromFile,
  fetchFromApi,
  setContextData,
  loadContextFromSource,
  loadImports
} from './ContextConfig.ts';
import type { LSPContext } from '../lsp/types.ts';

/** Configuration for a single context type display */
interface ContextDisplayConfig {
  /** The type of context */
  contextType: ContextType;
  /** Label to display */
  label: string;
  /** Description for what this context is used for */
  description?: string;
}

/**
 * Extended import configuration for unlimited imports
 */
interface ImportState {
  id: string;
  alias: string;
  mode: ImportMode;
  data: LSPContext;
  sourceId: string;
  sourceName: string;
}

interface ContextConfigPanelProps {
  /** Single context config (for backward compatibility) */
  contextType?: ContextType;
  /** Label for this context panel */
  label?: string;
  /** Description for what this context is used for */
  description?: string;
  /** Array of context configs (for unified modal) */
  contexts?: ContextDisplayConfig[];
  /** Whether to show in preview mode (compact with edit button) or full config mode */
  previewMode?: boolean;
  /** Callback when edit button is clicked (for preview mode) */
  onEdit?: () => void;
  /** Whether to use unlimited imports mode */
  unlimitedImports?: boolean;
}

/** State for a single context type */
interface ContextState {
  selectedContextId: string;
  contextName: string;
}

export function ContextConfigPanel({ 
  contextType,
  label,
  description,
  contexts,
  previewMode = false,
  onEdit,
  unlimitedImports = false
}: ContextConfigPanelProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiQueryParams, setApiQueryParams] = useState('');
  const [dataSources] = useState<DataSourceConfig[]>(DEFAULT_DATA_SOURCES);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useAlert();
  
  // State for unlimited imports
  const [imports, setImports] = useState<ImportState[]>([]);
  
  // Get the contexts to render - support both old and new API
  const contextConfigs: ContextDisplayConfig[] = contexts || (
    contextType && label ? [{ contextType, label, description }] : []
  );
  
  // State for each context type
  const [contextStates, setContextStates] = useState<Record<string, ContextState>>(() => {
    const initial: Record<string, ContextState> = {};
    contextConfigs.forEach(cfg => {
      initial[cfg.contextType] = {
        selectedContextId: 'empty',
        contextName: 'Empty Context'
      };
    });
    return initial;
  });
  
  const [activeContextType, setActiveContextType] = useState<string>(
    contextConfigs[0]?.contextType || 'values'
  );
  
  // Load last used context for each type on mount
  useEffect(() => {
    if (unlimitedImports) {
      // Load saved imports from localStorage
      loadSavedImports();
    } else {
      // Legacy behavior
      contextConfigs.forEach(async (cfg) => {
        const lastId = getLastContextId(cfg.contextType);
        if (lastId) {
          const lastSource = dataSources.find(ds => ds.id === lastId);
          if (lastSource && lastSource.type === 'config') {
            setContextData(lastSource.data || {}, cfg.contextType as ContextType, true);
            setContextStates(prev => ({
              ...prev,
              [cfg.contextType]: {
                selectedContextId: lastId,
                contextName: lastSource.name
              }
            }));
          }
        }
      });
    }
  }, []);
  
  // Load saved imports from localStorage
  const loadSavedImports = () => {
    try {
      const saved = localStorage.getItem('trigger-editor-imports');
      if (saved) {
        const parsed = JSON.parse(saved) as ImportState[];
        setImports(parsed);
        // Load into LSP engine
        const importConfigs: ImportConfig[] = parsed.map(imp => ({
          id: imp.id,
          alias: imp.alias,
          data: imp.data,
          mode: imp.mode
        }));
        if (importConfigs.length > 0) {
          loadImports(importConfigs);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved imports:', e);
    }
  };
  
  // Save imports to localStorage
  const saveImports = (newImports: ImportState[]) => {
    try {
      localStorage.setItem('trigger-editor-imports', JSON.stringify(newImports));
    } catch (e) {
      console.warn('Failed to save imports:', e);
    }
  };
  
  // Add a new import
  const addImport = () => {
    const newImport: ImportState = {
      id: `import-${Date.now()}`,
      alias: `import${imports.length + 1}`,
      mode: 'path',
      data: {},
      sourceId: 'empty',
      sourceName: 'Empty'
    };
    setImports([...imports, newImport]);
  };
  
  // Remove an import
  const removeImport = (id: string) => {
    const newImports = imports.filter(imp => imp.id !== id);
    setImports(newImports);
    saveImports(newImports);
    // Update LSP engine
    const importConfigs: ImportConfig[] = newImports.map(imp => ({
      id: imp.id,
      alias: imp.alias,
      data: imp.data,
      mode: imp.mode
    }));
    if (importConfigs.length > 0) {
      loadImports(importConfigs);
    } else {
      loadImports([]);
    }
  };
  
  // Update an import
  const updateImport = (id: string, updates: Partial<ImportState>) => {
    const newImports = imports.map(imp => 
      imp.id === id ? { ...imp, ...updates } : imp
    );
    setImports(newImports);
    saveImports(newImports);
    // Update LSP engine
    const importConfigs: ImportConfig[] = newImports.map(imp => ({
      id: imp.id,
      alias: imp.alias,
      data: imp.data,
      mode: imp.mode
    }));
    loadImports(importConfigs);
  };
  
  // Handle file upload for an import
  const handleImportFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, importId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const json = await loadFromFile(file);
        updateImport(importId, {
          data: json,
          sourceId: 'file',
          sourceName: file.name
        });
        success(`Loaded ${file.name}`);
      } catch (err) {
        error('Invalid JSON file.');
      }
      // Reset input
      e.target.value = '';
    }
  };
  
  const updateContextState = (contextType: string, updates: Partial<ContextState>) => {
    setContextStates(prev => {
      const current = prev[contextType] || { selectedContextId: 'empty', contextName: 'Empty Context' };
      return {
        ...prev,
        [contextType]: {
          ...current,
          ...updates
        } as ContextState
      };
    });
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, ctxType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const json = await loadFromFile(file);
        setContextData(json, ctxType as ContextType, true);
        setLastContextId('file', ctxType as ContextType);
        updateContextState(ctxType, {
          selectedContextId: 'file',
          contextName: file.name
        });
        success('Variables loaded from file!');
      } catch (err) {
        error('Invalid JSON file.');
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleContextChange = async (contextId: string, ctxType: string) => {
    updateContextState(ctxType, { selectedContextId: contextId });
    
    if (contextId === 'file') {
      // Trigger file input
      fileInputRef.current?.click();
      return;
    }
    
    if (contextId === 'custom-api') {
      // Don't load yet, user needs to enter API URL
      return;
    }
    
    const source = dataSources.find(ds => ds.id === contextId);
    if (!source) {
      error('Unknown data source');
      return;
    }
    
    try {
      await loadContextFromSource(source, ctxType as ContextType);
      setLastContextId(contextId, ctxType as ContextType);
      updateContextState(ctxType, { contextName: source.name });
      success(`Loaded ${source.name}`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to load context');
    }
  };
  
  const handleCustomApiLoad = async (ctxType: string) => {
    if (!apiUrl.trim()) {
      error('Please enter an API URL');
      return;
    }
    
    try {
      // Parse query params
      const queryParams: Record<string, string> = {};
      if (apiQueryParams.trim()) {
        apiQueryParams.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            queryParams[key.trim()] = value.trim();
          }
        });
      }
      
      const data = await fetchFromApi({
        id: 'custom-api',
        name: 'Custom API',
        type: 'api',
        apiUrl: apiUrl.trim(),
        queryParams
      });
      
      setContextData(data, ctxType as ContextType, true);
      setLastContextId('custom-api', ctxType as ContextType);
      updateContextState(ctxType, {
        selectedContextId: 'custom-api',
        contextName: new URL(apiUrl.trim()).hostname
      });
      success('Loaded data from API');
      setIsConfigOpen(false);
      setApiUrl('');
      setApiQueryParams('');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to fetch from API');
    }
  };

  // Render unlimited imports mode
  if (unlimitedImports) {
    return (
      <div className="context-config-panel" style={{ minWidth: '500px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
            Data Imports
          </h3>
          <button
            onClick={addImport}
            style={{
              background: 'var(--action-color)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <PlusIcon size={14} /> Add Import
          </button>
        </div>
        
        {/* Import list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {imports.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '24px', 
              color: 'var(--text-secondary)',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              border: '1px dashed var(--border)'
            }}>
              No imports configured. Click "Add Import" to create one.
            </div>
          )}
          
          {imports.map((imp) => (
            <div
              key={imp.id}
              style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid var(--border)'
              }}
            >
              {/* Import header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DatabaseIcon size={16} />
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {imp.alias}
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    background: imp.mode === 'value' ? 'var(--action-color)' : 'var(--bg-secondary)',
                    color: imp.mode === 'value' ? 'white' : 'var(--text-secondary)'
                  }}>
                    {imp.mode === 'value' ? 'Value' : 'Path'}
                  </span>
                </div>
                <button
                  onClick={() => removeImport(imp.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
              
              {/* Import config */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* Alias input */}
                <input
                  type="text"
                  placeholder="Alias (e.g., data, values, actions)"
                  value={imp.alias}
                  onChange={(e) => updateImport(imp.id, { alias: e.target.value })}
                  style={{
                    flex: '1',
                    minWidth: '120px',
                    padding: '6px 8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                
                {/* Mode select */}
                <select
                  value={imp.mode}
                  onChange={(e) => updateImport(imp.id, { mode: e.target.value as ImportMode })}
                  style={{
                    padding: '6px 8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="path">Path (${'{alias.path}'})</option>
                  <option value="value">Value (raw value)</option>
                </select>
                
                {/* File input button */}
                <button
                  onClick={() => document.getElementById(`file-${imp.id}`)?.click()}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📄 Load JSON
                </button>
                <input
                  id={`file-${imp.id}`}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImportFileUpload(e, imp.id)}
                />
              </div>
              
              {/* Source info */}
              {imp.sourceName && imp.sourceName !== 'Empty' && (
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-secondary)', 
                  marginTop: '6px' 
                }}>
                  Source: {imp.sourceName}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Help text */}
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: 'var(--bg-tertiary)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <strong>Mode info:</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
            <li><strong>Path:</strong> Use ${'{alias.property}'} in completions (e.g., ${'{data.username}'})</li>
            <li><strong>Value:</strong> Insert raw value directly (e.g., 1, "text", true)</li>
          </ul>
        </div>
      </div>
    );
  }

  // Preview mode - compact view with edit button
  if (previewMode) {
    return (
      <div 
        style={{
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: 'var(--text-primary)'
          }}>
            {contextConfigs[0]?.label || 'Autocomplete Data'}
          </span>
          <button
            onClick={onEdit}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px'
            }}
          >
            <SettingsIcon size={12} /> Edit
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <DatabaseIcon size={14} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {contextStates[contextConfigs[0]?.contextType || 'values']?.contextName || 'Empty Context'}
          </span>
        </div>
        
        {contextConfigs[0]?.description && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {contextConfigs[0].description}
          </div>
        )}
      </div>
    );
  }

  // Full config mode - unified modal with tabs for different context types
  const currentState = contextStates[activeContextType] || { selectedContextId: 'empty', contextName: 'Empty Context' };
  const currentConfig = contextConfigs.find(c => c.contextType === activeContextType);

  return (
    <div className="context-config-panel" style={{ minWidth: '400px' }}>
      {/* Tabs for context types */}
      {contextConfigs.length > 1 && (
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '16px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '8px'
        }}>
          {contextConfigs.map((cfg) => (
            <button
              key={cfg.contextType}
              onClick={() => setActiveContextType(cfg.contextType)}
              style={{
                background: activeContextType === cfg.contextType ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                color: activeContextType === cfg.contextType ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <BracketsIcon size={14} />
              {cfg.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Current Context Display */}
      <div style={{
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        padding: '10px 12px',
        marginBottom: '12px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <DatabaseIcon size={12} /> Current:
        </div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {currentState.contextName}
        </div>
        {currentConfig?.description && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentConfig.description}
          </div>
        )}
      </div>
      
      {/* Data Source Select */}
      <select
        value={currentState.selectedContextId}
        onChange={(e) => handleContextChange(e.target.value, activeContextType)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '8px'
        }}
      >
        <option value="empty" disabled>Select a data source...</option>
        <optgroup label="Built-in Configurations">
          {dataSources.filter(ds => ds.type === 'config').map(ds => (
            <option key={ds.id} value={ds.id}>{ds.name}</option>
          ))}
        </optgroup>
        <optgroup label="External Sources">
          <option value="file">📄 Upload JSON File</option>
          <option value="custom-api">🌐 Load from REST API</option>
        </optgroup>
      </select>
      
      {/* Custom API Configuration Panel */}
      {isConfigOpen && currentState.selectedContextId === 'custom-api' && (
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '8px',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-primary)' }}>
            REST API Configuration
          </div>
          <input
            type="text"
            placeholder="API URL (e.g., https://api.example.com/data)"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              marginBottom: '8px',
              boxSizing: 'border-box'
            }}
          />
          <input
            type="text"
            placeholder="Query params (e.g., key=value&env=prod)"
            value={apiQueryParams}
            onChange={(e) => setApiQueryParams(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={() => handleCustomApiLoad(activeContextType)}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '13px',
              background: 'var(--action-color)'
            }}
          >
            <DatabaseIcon size={14} /> Load from API
          </button>
        </div>
      )}
      
      {/* Toggle API config button */}
      {currentState.selectedContextId === 'custom-api' && !isConfigOpen && (
        <button
          onClick={() => setIsConfigOpen(true)}
          style={{
            width: '100%',
            padding: '8px',
            marginTop: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Configure API
        </button>
      )}
      
      {/* Hidden file input */}
      <input 
        type="file" 
        accept=".json" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e, activeContextType)}
      />
    </div>
  );
}

/** Compact preview component for displaying current context in sidebar */
export function ContextPreviewItem({ 
  contextType, 
  label, 
  description 
}: ContextDisplayConfig) {
  const [contextName, setContextName] = useState('Empty Context');
  
  useEffect(() => {
    const lastId = getLastContextId(contextType);
    if (lastId) {
      const source = DEFAULT_DATA_SOURCES.find(ds => ds.id === lastId);
      if (source) {
        setContextName(source.name);
      }
    }
  }, [contextType]);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <DatabaseIcon size={14} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {contextName}
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
