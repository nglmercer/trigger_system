import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlert } from './Alert.tsx';
import { 
  DatabaseIcon, 
  PlusIcon, 
  TrashIcon, 
  ChevronIcon, 
  CodeIcon, 
  CheckCircleIcon, 
  CopyIcon, 
  LinkIcon, 
  RefreshIcon,
  UploadIcon,
  XCircleIcon
} from './Icons.tsx';
import { loadFromFile } from '../utils.ts';
import { loadImports } from '../lsp/engine.ts';
import type { ImportConfig, ImportMode, LSPContext } from '../lsp/types.ts';
import { JsonPreview } from './JsonPreview.tsx';
import { FetchModal } from './FetchModal.tsx';
import { TestEventModal } from './TestEventModal.tsx';
import { getDataSummary, fetchData } from '../utils/getData.ts';
import { useTranslation } from 'react-i18next';

/** A single import entry */
export interface ImportEntry {
  id: string;
  alias: string;
  mode: ImportMode;
  data: LSPContext;
  filename: string;
  url?: string;
  headers?: Record<string, string>;
  lastUpdated?: number;
}

interface ImportListProps {
  /** Callback when imports change */
  onImportsChange?: (imports: ImportEntry[]) => void;
}

/**
 * ImportList - Enhanced component for managing unlimited imports
 * Features: drag-drop, data preview, URL fetch, validation, stats
 */
export function ImportList({ onImportsChange }: ImportListProps) {
  const { t } = useTranslation();
  const [imports, setImports] = useState<ImportEntry[]>([]);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [testTarget, setTestTarget] = useState<ImportEntry | null>(null);
  const { success, error } = useAlert();
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement>>({});
  
  // Load saved imports on mount
  useEffect(() => {
    const saved = localStorage.getItem('trigger-editor-imports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ImportEntry[];
        setImports(parsed);
        updateLSP(parsed);
        onImportsChange?.(parsed);
      } catch (e) {
        console.warn('Failed to load imports:', e);
      }
    }
  }, []);
  
  // Save to localStorage
  const saveImports = useCallback((newImports: ImportEntry[]) => {
    localStorage.setItem('trigger-editor-imports', JSON.stringify(newImports));
    onImportsChange?.(newImports);
  }, [onImportsChange]);

  // Update LSP engine
  const updateLSP = useCallback((impList: ImportEntry[]) => {
    const configs: ImportConfig[] = impList.map(i => ({
      id: i.id,
      alias: i.alias,
      data: i.data,
      mode: i.mode
    }));
    loadImports(configs);
  }, []);

  // Expose autocomplete methods to window
  useEffect(() => {
    window.triggerEditor = window.triggerEditor || {};

    window.triggerEditor.addAutocompleteData = (alias: string, data: any, mode: ImportMode = 'path') => {
      setImports(current => {
        const index = current.findIndex(i => i.alias === alias);
        const newEntry: ImportEntry = {
          id: index >= 0 ? current[index]?.id || `ext-${Date.now()}` : `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          alias,
          mode,
          data,
          filename: 'External API',
          lastUpdated: Date.now()
        };
        const next = index >= 0 
          ? current.map((item, i) => i === index ? newEntry : item)
          : [...current, newEntry];
        
        saveImports(next);
        updateLSP(next);
        return next;
      });
    };

    window.triggerEditor.removeAutocompleteData = (alias: string) => {
      setImports(current => {
        const next = current.filter(i => i.alias !== alias);
        if (next.length !== current.length) {
          saveImports(next);
          updateLSP(next);
        }
        return next;
      });
    };

    return () => {
      if (window.triggerEditor) {
        delete window.triggerEditor.addAutocompleteData;
        delete window.triggerEditor.removeAutocompleteData;
      }
    };
  }, [saveImports, updateLSP]);
  
  // Add new import
  const addImport = () => {
    const newImport: ImportEntry = {
      id: `imp-${Date.now()}`,
      alias: `import${imports.length + 1}`,
      mode: 'path',
      data: {},
      filename: ''
    };
    const newImports = [...imports, newImport];
    setImports(newImports);
    saveImports(newImports);
    updateLSP(newImports);
  };
  
  // Remove import
  const removeImport = (id: string) => {
    const newImports = imports.filter(i => i.id !== id);
    setImports(newImports);
    saveImports(newImports);
    updateLSP(newImports);
  };
  
  // Update import
  const updateImport = (id: string, updates: Partial<ImportEntry>) => {
    const newImports = imports.map(i => i.id === id ? { ...i, ...updates } : i);
    setImports(newImports);
    saveImports(newImports);
    updateLSP(newImports);
  };
  

  
  // Toggle preview expansion
  const togglePreview = (id: string) => {
    setExpandedPreviews(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Handle file load
  const handleFileLoad = async (id: string, file: File) => {
    try {
      const json = await loadFromFile(file);
      if (!json || typeof json !== 'object') {
        error(t('importList.invalidJson'));
        return;
      }
      updateImport(id, { 
        data: json, 
        filename: file.name, 
        url: undefined, 
        lastUpdated: Date.now() 
      });
      success(`${t('importList.loadedFile')} ${file.name} (${Object.keys(json).length} ${t('importList.keys')})`);
    } catch (e) {
      error(t('importList.invalidJson'));
    }
  };

  // Handle URL fetch
  const handleFetchData = async (url: string, headers?: Record<string, string>) => {
    const loadingId = `imp-${Date.now()}`;
    // Create temporary entry or use last one if empty
    const lastEmpty = imports.find(i => !i.filename && !i.url && Object.keys(i.data).length === 0);
    const targetId = lastEmpty?.id || loadingId;

    try {
      const json = await fetchData(url, headers, {
        onSuccess: (data, sourceName) => {
          const entry: Partial<ImportEntry> = {
            id: targetId,
            alias: lastEmpty?.alias || `api_${imports.length + 1}`,
            url,
            headers,
            data,
            filename: sourceName,
            lastUpdated: Date.now()
          };

          if (lastEmpty) {
            updateImport(targetId, entry);
          } else {
            const newImports = [...imports, entry as ImportEntry];
            setImports(newImports);
            saveImports(newImports);
            updateLSP(newImports);
          }
          success(`${t('importList.fetchSuccess')} ${new URL(url).hostname}`);
        },
        onError: (e) => {
          error(`${t('importList.fetchFailed')} ${e.message}`);
        }
      });
    } catch (e) {
      // Errors are handled in the onError callback, but we catch it 
      // here to prevent unhandled promise rejection if needed
    }
  };

  const handleRefresh = async (imp: ImportEntry) => {
    if (!imp.url) return;
    try {
      await handleFetchData(imp.url, imp.headers);
    } catch (e) {
      // Error handled in handleFetchData
    }
  };
  
  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(id);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
  }, []);
  
  const handleDrop = useCallback(async (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      await handleFileLoad(id, file);
    } else {
      error(t('importList.dropJson'));
    }
  }, []);
  
  // Copy alias to clipboard
  const copyAlias = (alias: string) => {
    const text = `\${${alias}}`;
    navigator.clipboard.writeText(text);
    success(`${t('importList.copied')} ${text}`);
  };
  
  // Render data preview
  const renderDataPreviewArea = (imp: ImportEntry) => {
    const isExpanded = expandedPreviews.has(imp.id);
    const summary = getDataSummary(imp.data);
    
    return (
      <div style={{
        marginTop: '12px',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Header with stats */}
        <div 
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent'
          }}
          onClick={() => togglePreview(imp.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              transition: 'transform 0.2s', 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-secondary)'
            }}>
              <ChevronIcon direction="right" size={16} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('importList.dataPreview')}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ 
                fontSize: '10px', 
                padding: '2px 8px', 
                borderRadius: '12px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)'
              }}>
                {summary.keys} {t('importList.keys')}
              </span>
            </div>
          </div>
          
          <div style={{ 
            fontSize: '10px', 
            color: 'var(--text-secondary)',
            opacity: 0.7,
            fontFamily: 'monospace'
          }}>
            {summary.types.slice(0, 3).join(', ')}{summary.types.length > 3 ? '...' : ''}
          </div>
        </div>
        
        {/* Expanded content */}
        {isExpanded && (
          <div style={{ 
            padding: '4px', 
            borderTop: '1px solid var(--border)',
          }}>
            <JsonPreview data={imp.data} maxHeight="200px" />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'rgba(59, 130, 246, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--action-color)'
          }}>
            <DatabaseIcon size={18} />
          </div>
          <div>
            <div style={{ 
              fontSize: '15px', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {t('importList.dataImports')}
              <span style={{
                fontSize: '11px',
                padding: '1px 8px',
                borderRadius: '10px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                border: '1px solid var(--border)'
              }}>
                {imports.length}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t('importList.manageExternal')}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsFetchModalOpen(true)}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <LinkIcon size={14} /> {t('importList.fetchUrl')}
          </button>
          <button
            onClick={addImport}
            style={{
              background: 'var(--action-color)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
          >
            <PlusIcon size={14} /> {t('importList.newImport')}
          </button>
        </div>
      </div>

      {/* Import list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {imports.length === 0 ? (
          <div 
            onClick={addImport}
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '2px dashed var(--border)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--text-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <DatabaseIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
              {t('importList.noDataSources')}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.7 }}>
              {t('importList.uploadOrFetch')}
            </p>
          </div>
        ) : (
          imports.map((imp) => {
            const isLoaded = Object.keys(imp.data).length > 0;
            const isDragOver = dragOverId === imp.id;
            
            return (
              <div
                key={imp.id}
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${isDragOver ? 'var(--action-color)' : 'var(--border)'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onDragOver={(e) => handleDragOver(e, imp.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, imp.id)}
              >
                {/* Top row: alias + mode + status + delete */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  marginBottom: '14px'
                }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
                    <input
                      type="text"
                      value={imp.alias}
                      onChange={(e) => updateImport(imp.id, { alias: e.target.value })}
                      placeholder="Alias..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ 
                      position: 'absolute', 
                      right: '10px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none',
                      opacity: 0.5
                    }}>
                      {t('importList.alias')}
                    </div>
                  </div>
                  
                  {/* Copy button */}
                  {isLoaded && (
                    <button
                      onClick={() => copyAlias(imp.alias)}
                      title={`Copy \${${imp.alias}}`}
                      style={{
                        padding: '10px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <CopyIcon />
                    </button>
                  )}
                  
                  {/* Execute/Test button */}
                  {isLoaded && window.triggerEditor?.testEvent && (
                    <button
                      onClick={() => setTestTarget(imp)}
                      title={t('importList.testSimulationTitle', 'Simulate engine with this data payload')}
                      style={{
                        padding: '0.4rem',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: '8px',
                        color: '#22c55e',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'}
                    >
                      ▶ {t('importList.runTest', 'Test')}
                    </button>
                  )}
                  
                  <select
                    value={imp.mode}
                    onChange={(e) => updateImport(imp.id, { mode: e.target.value as ImportMode })}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      minWidth: '100px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    <option value="path">{t('importList.pathMode')}</option>
                    <option value="value">{t('importList.valueMode')}</option>
                  </select>
                  
                  <button
                    onClick={() => removeImport(imp.id)}
                    style={{
                      background: 'rgba(248, 81, 73, 0.1)',
                      border: '1px solid rgba(248, 81, 73, 0.2)',
                      color: '#f85149',
                      cursor: 'pointer',
                      padding: '10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248, 81, 73, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(248, 81, 73, 0.1)'}
                    title="Remove import"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>

                {/* Source row */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                  <div style={{ 
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 14px',
                    background: isDragOver ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                    border: `1px solid ${isDragOver ? 'var(--action-color)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    minWidth: 0
                  }}>
                    {imp.url ? <LinkIcon size={14} /> : <CodeIcon size={14} />}
                    <div style={{ 
                      flex: 1, 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap',
                      color: isLoaded ? 'var(--text-primary)' : 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <span style={{ fontWeight: 500 }}>
                        {imp.filename || (imp.url ? new URL(imp.url).hostname : t('importList.noFile'))}
                      </span>
                      {imp.url && (
                        <span style={{ fontSize: '10px', opacity: 0.6, textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {imp.url}
                        </span>
                      )}
                    </div>
                    {isLoaded && imp.lastUpdated && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.5 }}>
                        {new Date(imp.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {imp.url && (
                      <button
                        onClick={() => handleRefresh(imp)}
                        title="Refresh from URL"
                        style={{
                          padding: '0 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <RefreshIcon size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRefs.current[imp.id]?.click()}
                      title="Load local JSON file"
                      style={{
                        padding: '0 14px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}
                    >
                      <UploadIcon size={14} /> 
                    </button>
                  </div>

                  <input
                    ref={(el) => { if (el) fileInputRefs.current[imp.id] = el; }}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileLoad(imp.id, file);
                      e.target.value = '';
                    }}
                  />
                </div>
                
                {/* Data preview area */}
                {isLoaded && renderDataPreviewArea(imp)}
              </div>
            );
          })
        )}
      </div>

      {/* Help Card */}
      {imports.length > 0 && (
        <div style={{
          padding: '16px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <strong>{t('importList.pathMode')}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--action-color)' }}>
                  {`\${alias.prop}`}
                </code>
                <span>{t('importList.referenceKey')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <strong>{t('importList.valueMode')}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ opacity: 0.8 }}>{t('importList.insertsValues')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <FetchModal 
        isOpen={isFetchModalOpen} 
        onClose={() => setIsFetchModalOpen(false)} 
        onFetch={handleFetchData} 
      />

      <TestEventModal
        isOpen={!!testTarget}
        onClose={() => setTestTarget(null)}
        importEntry={testTarget}
      />
    </div>
  );
}
