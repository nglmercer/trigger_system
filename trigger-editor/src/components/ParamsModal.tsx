import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { TextInput, TextAreaInput } from './FormFields.tsx';

// Type for param values - using any for flexibility in the editor
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Single param entry
export interface ParamEntry {
  key: string;
  value: JsonValue;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  id: string;
}

export const generateId = () => Math.random().toString(36).substring(2, 9);

export function parseParams(jsonStr: string): ParamEntry[] {
  try {
    const parsed = JSON.parse(jsonStr || '{}');
    if (typeof parsed !== 'object' || parsed === null) {
      return [];
    }
    
    const entries: ParamEntry[] = [];
    
    function flatten(obj: { [key: string]: JsonValue }, prefix = ''): void {
      for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const type = getValueType(val);
        
        entries.push({
          key: fullKey,
          value: val,
          type,
          id: generateId()
        });
        
        if (type === 'object' && val !== null && typeof val === 'object') {
          flatten(val as { [key: string]: JsonValue }, fullKey);
        }
      }
    }
    
    flatten(parsed as { [key: string]: JsonValue });
    return entries;
  } catch {
    return [];
  }
}

export function getValueType(val: JsonValue): ParamEntry['type'] {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  return 'string';
}

export function valueToString(val: JsonValue): string {
  if (val === null) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function stringToValue(str: string, type: ParamEntry['type']): JsonValue {
  switch (type) {
    case 'number':
      return str === '' ? 0 : parseFloat(str) || 0;
    case 'boolean':
      return str === 'true' || str === '1';
    case 'array':
      try {
        return JSON.parse(str);
      } catch {
        return [];
      }
    case 'object':
      try {
        return JSON.parse(str);
      } catch {
        return {};
      }
    default:
      return str;
  }
}

export const openParamsModal = (value: string, onChange: (val: string) => void) => {
  window.dispatchEvent(new CustomEvent('open-params-modal', { detail: { value, onChange } }));
};

export function ParamsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ParamEntry[]>([]);
  const [viewMode, setViewMode] = useState<'builder' | 'json'>('builder');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [localJson, setLocalJson] = useState('{}');
  const onChangeRef = useRef<((val: string) => void) | null>(null);

  useEffect(() => {
    const handleOpen = (e: any) => {
      const { value, onChange } = e.detail;
      setLocalJson(value || '{}');
      setEntries(parseParams(value || '{}'));
      setJsonError(null);
      onChangeRef.current = onChange;
      setIsOpen(true);
    };

    window.addEventListener('open-params-modal', handleOpen);
    return () => window.removeEventListener('open-params-modal', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSave = () => {
    if (onChangeRef.current) {
        const jsonToEmit = viewMode === 'builder' ? entriesToJson(entries) : localJson;
        onChangeRef.current(jsonToEmit);
    }
    setIsOpen(false);
  };

  const entriesToJson = (ents: ParamEntry[]): string => {
    const result: { [key: string]: JsonValue } = {};
    for (const entry of ents) {
      if (!entry.key) continue;
      const keys = entry.key.split('.');
      let current: { [key: string]: JsonValue } = result;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!k) continue;
        if (!(k in current)) current[k] = {};
        current = current[k] as { [key: string]: JsonValue };
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey) current[lastKey] = entry.value;
    }
    return JSON.stringify(result, null, 2) || '{}';
  };

  const handleChange = (ents: ParamEntry[]) => {
    setEntries(ents);
    setLocalJson(entriesToJson(ents));
    setJsonError(null);
  };

  const addEntry = () => {
    const newEntry: ParamEntry = {
      key: `param_${generateId().substring(0, 4)}`,
      value: '',
      type: 'string',
      id: generateId()
    };
    handleChange([...entries, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<ParamEntry>) => {
    const newEntries = entries.map(e => e.id === id ? { ...e, ...updates } : e);
    handleChange(newEntries);
  };

  const removeEntry = (id: string) => {
    handleChange(entries.filter(e => e.id !== id));
  };

  const handleJsonChange = (jsonStr: string) => {
    setLocalJson(jsonStr);
    try {
      JSON.parse(jsonStr);
      setJsonError(null);
      setEntries(parseParams(jsonStr));
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const groupedEntries = React.useMemo(() => {
    const groups: { [key: string]: ParamEntry[] } = {};
    for (const entry of entries) {
      const topKey = entry.key.split('.')[0] || 'Uncategorized';
      if (!groups[topKey]) groups[topKey] = [];
      groups[topKey].push(entry);
    }
    return groups;
  }, [entries]);

  if (!isOpen) return null;

  return (
    <div 
      className="params-modal-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(2px)'
      }}
      onClick={handleClose}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div 
        className="params-modal-content nodrag nopan"
        style={{
          backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)',
          borderRadius: '8px', padding: '16px', width: '500px', maxWidth: '90vw', maxHeight: '80vh',
          overflowY: 'auto', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-color)', fontWeight: 600 }}>Edit Parameters</h3>
          <button 
            onClick={handleClose} 
            className="node-btn"
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
        
        <div className="params-builder">
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
            <button type="button" className={`node-btn ${viewMode === 'builder' ? 'node-btn--primary' : ''}`} onClick={() => setViewMode('builder')} style={{ flex: 1, fontSize: '11px', padding: '4px 8px' }}>Builder</button>
            <button type="button" className={`node-btn ${viewMode === 'json' ? 'node-btn--primary' : ''}`} onClick={() => setViewMode('json')} style={{ flex: 1, fontSize: '11px', padding: '4px 8px' }}>JSON</button>
          </div>

          {viewMode === 'builder' ? (
            <div className="params-builder__list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {entries.map((entry) => (
                <div key={entry.id} className="params-builder__entry" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput 
                      value={entry.key} 
                      onChange={(val) => updateEntry(entry.id, { key: String(val) })} 
                      placeholder="key" 
                    />
                  </div>
                  <select className="node-input" value={entry.type} onChange={(e) => {
                    const newType = e.target.value as ParamEntry['type'];
                    const defaultVal = newType === 'string' ? '' : newType === 'number' ? 0 : newType === 'boolean' ? false : newType === 'array' ? [] : newType === 'object' ? {} : null;
                    updateEntry(entry.id, { type: newType, value: defaultVal });
                  }} style={{ width: '70px', fontSize: '11px', padding: '4px' }}>
                    <option value="string">Text</option><option value="number">Number</option><option value="boolean">Bool</option><option value="array">Array</option><option value="object">Object</option>
                  </select>
                  {entry.type === 'boolean' ? (
                    <select className="node-input" value={String(entry.value)} onChange={(e) => updateEntry(entry.id, { value: e.target.value === 'true' })} style={{ width: '60px', fontSize: '11px', padding: '4px' }}>
                      <option value="true">true</option><option value="false">false</option>
                    </select>
                  ) : entry.type === 'array' || entry.type === 'object' ? (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TextInput 
                        value={JSON.stringify(entry.value)} 
                        onChange={(val) => updateEntry(entry.id, { value: stringToValue(String(val), entry.type) })} 
                        placeholder={entry.type === 'array' ? '[]' : '{}'} 
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TextInput 
                        type={entry.type === 'number' ? 'number' : 'text'} 
                        value={valueToString(entry.value)} 
                        onChange={(val) => updateEntry(entry.id, { value: stringToValue(String(val), entry.type) })} 
                        placeholder={entry.type === 'number' ? '0' : 'value'} 
                      />
                    </div>
                  )}
                  <button type="button" onClick={() => removeEntry(entry.id)} className="node-btn node-btn--danger" style={{ padding: '4px 6px', fontSize: '12px' }} title="Remove">×</button>
                </div>
              ))}
              {entries.length === 0 && <div className="params-builder__empty" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '12px' }}>No parameters defined</div>}
              <button type="button" onClick={addEntry} className="node-btn node-btn--secondary" style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}>+ Add Parameter</button>
            </div>
          ) : (
            <div className="params-builder__json">
              <TextAreaInput 
                value={localJson} 
                onChange={handleJsonChange} 
                placeholder="{}" 
                rows={6} 
                style={{ fontFamily: 'monospace', fontSize: '12px', borderColor: jsonError ? 'var(--error)' : undefined }} 
              />
              {jsonError && <div className="node-hint" style={{ color: 'var(--error)', marginTop: '4px' }}>{jsonError}</div>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button onClick={handleClose} className="node-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
          <button onClick={handleSave} className="node-btn node-btn--primary" style={{ padding: '6px 12px', fontSize: '12px', opacity: jsonError ? 0.5 : 1 }} disabled={!!jsonError}>Save Changes</button>
        </div>

      </div>
    </div>
  );
}
