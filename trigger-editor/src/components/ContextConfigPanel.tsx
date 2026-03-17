import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { loadContext } from '../lsp/engine.ts';
import { useAlert } from './Alert.tsx';
import { SettingsIcon, DatabaseIcon } from './Icons.tsx';
import type { DataSourceConfig, ContextType } from './ContextConfig.ts';
import {
  DEFAULT_DATA_SOURCES,
  getLastContextId,
  setLastContextId,
  getDataFromSource,
  loadFromFile,
  fetchFromApi,
  setContextData,
  loadContextFromSource
} from './ContextConfig.ts';

interface ContextConfigPanelProps {
  /** The type of context this panel configures */
  contextType: ContextType;
  /** Label for this context panel */
  label: string;
  /** Description for what this context is used for */
  description?: string;
}

export function ContextConfigPanel({ 
  contextType, 
  label,
  description 
}: ContextConfigPanelProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string>('empty');
  const [apiUrl, setApiUrl] = useState('');
  const [apiQueryParams, setApiQueryParams] = useState('');
  const [dataSources] = useState<DataSourceConfig[]>(DEFAULT_DATA_SOURCES);
  const [currentContextName, setCurrentContextName] = useState<string>('Empty Context');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useAlert();
  
  // Load last used context on mount
  useEffect(() => {
    const lastId = getLastContextId(contextType);
    if (lastId) {
      setSelectedContextId(lastId);
      // Auto-load the last used context
      const lastSource = dataSources.find(ds => ds.id === lastId);
      if (lastSource && lastSource.type === 'config') {
        setContextData(lastSource.data || {}, contextType, true);
        setCurrentContextName(lastSource.name);
      }
    }
  }, []);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const json = await loadFromFile(file);
        setContextData(json, contextType, true);
        setLastContextId('file', contextType);
        setCurrentContextName(file.name);
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
  
  const handleContextChange = async (contextId: string) => {
    setSelectedContextId(contextId);
    
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
      await loadContextFromSource(source, contextType);
      setLastContextId(contextId, contextType);
      setCurrentContextName(source.name);
      success(`Loaded ${label}: ${source.name}`);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to load context');
    }
  };
  
  const handleCustomApiLoad = async () => {
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
      
      setContextData(data, contextType, true);
      setLastContextId('custom-api', contextType);
      setCurrentContextName(new URL(apiUrl.trim()).hostname);
      success('Loaded data from API');
      setIsConfigOpen(false);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Failed to fetch from API');
    }
  };

  return (
    <div className="context-config-section" style={{ padding: '0 20px', marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <span style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </span>
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px'
          }}
          title="Configure Data Source"
        >
          <SettingsIcon />
        </button>
      </div>
      
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
          {currentContextName}
        </div>
        {description && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {description}
          </div>
        )}
      </div>
      
      {/* Data Source Select */}
      <select
        value={selectedContextId}
        onChange={(e) => handleContextChange(e.target.value)}
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
      {isConfigOpen && selectedContextId === 'custom-api' && (
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
            onClick={handleCustomApiLoad}
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
      
      {/* Hidden file input */}
      <input 
        type="file" 
        accept=".json" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
    </div>
  );
}
