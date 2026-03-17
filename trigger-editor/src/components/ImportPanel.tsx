import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAlert } from './Alert.tsx';
import { DatabaseIcon, PlusIcon, TrashIcon } from './Icons.tsx';
import { loadFromFile } from './ContextConfig.ts';
import { loadImports } from '../lsp/engine.ts';
import type { ImportConfig, ImportMode, LSPContext } from '../lsp/types.ts';

/**
 * A single import entry
 */
interface ImportEntry {
  id: string;
  alias: string;
  mode: ImportMode;
  data: LSPContext;
  filename: string;
}

/**
 * Simple Import Panel - allows unlimited imports with custom aliases and modes
 * No tabs, no modal, no "Current Contexts" - just simple imports
 */
export function ImportPanel() {
  const [imports, setImports] = useState<ImportEntry[]>([]);
  const { success, error } = useAlert();
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement>>({});

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
      } catch (e) {
        console.warn('Failed to load imports:', e);
      }
    }
  }, []);

  // Save to localStorage
  const saveImports = (newImports: ImportEntry[]) => {
    localStorage.setItem('trigger-editor-imports', JSON.stringify(newImports));
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

  // Handle file load
  const handleFileLoad = async (id: string, file: File) => {
    try {
      const json = await loadFromFile(file);
      const imp = imports.find(i => i.id === id);
      updateImport(id, { data: json, filename: file.name });
      success(`Loaded ${file.name}`);
    } catch (e) {
      error('Failed to load file');
    }
  };

  // Render
  return (
    <div style={{ 
      padding: '16px', 
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          Data Imports
        </h2>
        
        <button
          onClick={addImport}
          style={{
            background: 'var(--action-color)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 16px',
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
            <p style={{ margin: '12px 0 0 0' }}>
              No imports yet. Click "Add Import" to get started.
            </p>
          </div>
        ) : (
          imports.map((imp) => (
            <div
              key={imp.id}
              style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid var(--border)'
              }}
            >
              {/* Top row: alias + mode + delete */}
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <input
                  type="text"
                  value={imp.alias}
                  onChange={(e) => updateImport(imp.id, { alias: e.target.value })}
                  placeholder="alias (e.g., data, values, actions)"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                />
                
                <select
                  value={imp.mode}
                  onChange={(e) => updateImport(imp.id, { mode: e.target.value as ImportMode })}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    minWidth: '120px'
                  }}
                >
                  <option value="path">Path: $&#123;alias.x&#125;</option>
                  <option value="value">Value: raw</option>
                </select>
                
                <button
                  onClick={() => removeImport(imp.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px'
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
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {imp.filename ? '\uD83D\uDCC4 ' + imp.filename : '\uD83D\uDCC4 Load JSON file'}
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
            </div>
          ))
        )}
      </div>

      {/* Help */}
      {imports.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          background: 'var(--bg-tertiary)',
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <strong>How it works:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Path mode:</strong> Use $&#123;alias.property&#125; in your rules</li>
            <li><strong>Value mode:</strong> Inserts raw value (1, "text", true) directly</li>
          </ul>
        </div>
      )}
    </div>
  );
}
