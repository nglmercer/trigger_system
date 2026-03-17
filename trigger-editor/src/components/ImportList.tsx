import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlert } from './Alert.tsx';
import { DatabaseIcon, PlusIcon, TrashIcon, ChevronIcon, CodeIcon, CheckCircleIcon, XCircleIcon, CopyIcon } from './Icons.tsx';
import { loadFromFile } from './ContextConfig.ts';
import { loadImports } from '../lsp/engine.ts';
import type { ImportConfig, ImportMode, LSPContext } from '../lsp/types.ts';

/** A single import entry */
export interface ImportEntry {
  id: string;
  alias: string;
  mode: ImportMode;
  data: LSPContext;
  filename: string;
}

interface ImportListProps {
  /** Callback when imports change */
  onImportsChange?: (imports: ImportEntry[]) => void;
}

/** Get type summary from data */
function getDataSummary(data: LSPContext): { keys: number; types: string[] } {
  if (!data || typeof data !== 'object') {
    return { keys: 0, types: ['unknown'] };
  }
  
  const keys = Object.keys(data).length;
  const typeSet = new Set<string>();
  
  const inspect = (obj: unknown, depth = 0) => {
    if (depth > 3) return; // Limit recursion
    if (obj === null) { typeSet.add('null'); return; }
    if (Array.isArray(obj)) { typeSet.add('array'); return; }
    if (typeof obj === 'object') {
      typeSet.add('object');
      Object.values(obj).forEach(v => inspect(v, depth + 1));
      return;
    }
    typeSet.add(typeof obj);
  };
  
  inspect(data);
  return { keys, types: Array.from(typeSet) };
}

/**
 * ImportList - Enhanced component for managing unlimited imports
 * Features: drag-drop, data preview, validation, stats
 */
export function ImportList({ onImportsChange }: ImportListProps) {
  const [imports, setImports] = useState<ImportEntry[]>([]);
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const { success, error } = useAlert();
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement>>({});
  const dropZoneRefs = React.useRef<Record<string, HTMLDivElement>>({});
  
  // Load saved imports on mount
  useEffect(() => {
    const saved = localStorage.getItem('trigger-editor-imports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ImportEntry[];
        setImports(parsed);
        // Load into LSP engine
        const configs: ImportConfig[] = parsed.map(p => ({
          id: p.id,
          alias: p.alias,
          data: p.data,
          mode: p.mode
        }));
        if (configs.length > 0) {
          loadImports(configs);
        }
        onImportsChange?.(parsed);
      } catch (e) {
        console.warn('Failed to load imports:', e);
      }
    }
  }, []);
  
  // Save to localStorage
  const saveImports = (newImports: ImportEntry[]) => {
    localStorage.setItem('trigger-editor-imports', JSON.stringify(newImports));
    onImportsChange?.(newImports);
  };
  
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
  
  // Update LSP engine
  const updateLSP = (impList: ImportEntry[]) => {
    const configs: ImportConfig[] = impList.map(i => ({
      id: i.id,
      alias: i.alias,
      data: i.data,
      mode: i.mode
    }));
    if (configs.length > 0) {
      loadImports(configs);
    } else {
      loadImports([]);
    }
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
      // Validate JSON structure
      if (!json || typeof json !== 'object') {
        error('Invalid JSON: must be an object');
        return;
      }
      updateImport(id, { data: json, filename: file.name });
      success(`Loaded ${file.name} (${Object.keys(json).length} keys)`);
    } catch (e) {
      error('Failed to load file: invalid JSON');
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
      error('Please drop a JSON file');
    }
  }, []);
  
  // Copy alias to clipboard
  const copyAlias = (alias: string) => {
    navigator.clipboard.writeText(`\${${alias}}`);
    success(`Copied: \${${alias}}`);
  };
  
  // Render data preview
  const renderPreview = (imp: ImportEntry) => {
    const isExpanded = expandedPreviews.has(imp.id);
    const summary = getDataSummary(imp.data);
    
    return (
      <div style={{
        marginTop: '10px',
        background: 'var(--bg-secondary)',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        {/* Header with stats */}
        <div 
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => togglePreview(imp.id)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ChevronIcon direction={isExpanded ? 'left' : 'right'} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Data Preview
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ 
              fontSize: '10px', 
              padding: '2px 6px', 
              borderRadius: '4px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}>
              {summary.keys} keys
            </span>
            <span style={{ 
              fontSize: '10px', 
              padding: '2px 6px', 
              borderRadius: '4px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}>
              {summary.types.join(', ')}
            </span>
          </div>
        </div>
        
        {/* Expanded content */}
        {isExpanded && (
          <div style={{ 
            padding: '10px 12px', 
            borderTop: '1px solid var(--border)',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            <pre style={{ 
              margin: 0, 
              fontSize: '11px', 
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(imp.data, null, 2).slice(0, 1000)}
              {JSON.stringify(imp.data).length > 1000 && '...'}
            </pre>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DatabaseIcon size={18} />
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 600, 
            color: 'var(--text-primary)'
          }}>
            Data Imports
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)'
          }}>
            {imports.length}
          </span>
        </div>
        
        <button
          onClick={addImport}
          style={{
            background: 'var(--action-color)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <PlusIcon size={14} /> Add Import
        </button>
      </div>

      {/* Import list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {imports.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            border: '2px dashed var(--border)'
          }}>
            <DatabaseIcon size={32} />
            <p style={{ margin: '12px 0 0 0', fontSize: '14px' }}>
              No imports yet. Click "Add Import" to load JSON data.
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
              You can also drag and drop JSON files
            </p>
          </div>
        ) : (
          imports.map((imp) => {
            const isLoaded = imp.filename && Object.keys(imp.data).length > 0;
            const isDragOver = dragOverId === imp.id;
            
            return (
              <div
                key={imp.id}
                ref={(el) => { if (el) dropZoneRefs.current[imp.id] = el; }}
                style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  padding: '14px',
                  border: `2px solid ${isDragOver ? 'var(--action-color)' : 'var(--border)'}`,
                  transition: 'border-color 0.2s'
                }}
                onDragOver={(e) => handleDragOver(e, imp.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, imp.id)}
              >
                {/* Top row: alias + mode + status + delete */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <input
                    type="text"
                    value={imp.alias}
                    onChange={(e) => updateImport(imp.id, { alias: e.target.value })}
                    placeholder="alias (e.g., data)"
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      padding: '8px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  />
                  
                  {/* Copy button */}
                  {isLoaded && (
                    <button
                      onClick={() => copyAlias(imp.alias)}
                      title={`Copy \${${imp.alias}}`}
                      style={{
                        padding: '8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <CopyIcon />
                    </button>
                  )}
                  
                  <select
                    value={imp.mode}
                    onChange={(e) => updateImport(imp.id, { mode: e.target.value as ImportMode })}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      minWidth: '90px'
                    }}
                    title="Path: ${alias.prop} | Value: raw value"
                  >
                    <option value="path">Path</option>
                    <option value="value">Value</option>
                  </select>
                  
                  <button
                    onClick={() => removeImport(imp.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Remove import"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>

                {/* Bottom row: file input */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => fileInputRefs.current[imp.id]?.click()}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: isDragOver ? 'var(--action-color)' : 'var(--bg-secondary)',
                      border: `1px solid ${isDragOver ? 'var(--action-color)' : 'var(--border)'}`,
                      borderRadius: '6px',
                      color: isDragOver ? 'white' : (imp.filename ? 'var(--text-primary)' : 'var(--text-secondary)'),
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isLoaded ? (
                      <>
                        <CheckCircleIcon size={14} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {imp.filename}
                        </span>
                      </>
                    ) : (
                      <>
                        <CodeIcon />
                        Load JSON or drag & drop
                      </>
                    )}
                  </button>
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
                
                {/* Data preview */}
                {isLoaded && renderPreview(imp)}
              </div>
            );
          })
        )}
      </div>

      {/* Help */}
      {imports.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--bg-tertiary)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          <strong>How to use:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px' }}>
            <li><strong>Path mode:</strong> Use <code style={{ background: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '3px' }}>{'${alias.property}'}</code> in your rules</li>
            <li><strong>Value mode:</strong> Inserts raw value (1, "text", true) directly</li>
            <li><strong>Drag & drop:</strong> Drop JSON files directly onto import cards</li>
            <li><strong>Copy:</strong> Click the copy button to quickly copy the alias reference</li>
          </ul>
        </div>
      )}
    </div>
  );
}
