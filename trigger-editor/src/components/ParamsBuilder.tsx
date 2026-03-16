import * as React from 'react';
import { useState, useEffect } from 'react';

// Type for param values - using any for flexibility in the editor
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Single param entry
interface ParamEntry {
  key: string;
  value: JsonValue;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  id: string;
}

interface ParamsBuilderProps {
  value: string; // JSON string
  onChange: (value: string) => void;
  placeholder?: string;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Parse JSON string to entries
function parseParams(jsonStr: string): ParamEntry[] {
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

function getValueType(val: JsonValue): ParamEntry['type'] {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  return 'string';
}

function valueToString(val: JsonValue): string {
  if (val === null) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function stringToValue(str: string, type: ParamEntry['type']): JsonValue {
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

export function ParamsBuilder({ value, onChange, placeholder = '{}' }: ParamsBuilderProps) {
  const [entries, setEntries] = useState<ParamEntry[]>([]);
  const [viewMode, setViewMode] = useState<'builder' | 'json'>('builder');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Parse initial value
  useEffect(() => {
    setEntries(parseParams(value));
  }, [value]);

  // Convert entries back to JSON
  const entriesToJson = (ents: ParamEntry[]): string => {
    const result: { [key: string]: JsonValue } = {};
    
    for (const entry of ents) {
      if (!entry.key) continue;
      
      const keys = entry.key.split('.');
      let current: { [key: string]: JsonValue } = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!k) continue;
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k] as { [key: string]: JsonValue };
      }
      
      const lastKey = keys[keys.length - 1];
      if (lastKey) {
        current[lastKey] = entry.value;
      }
    }
    
    return JSON.stringify(result, null, 2) || '{}';
  };

  const handleChange = (ents: ParamEntry[]) => {
    setEntries(ents);
    const json = entriesToJson(ents);
    setJsonError(null);
    onChange(json);
  };

  const addEntry = () => {
    const newEntry: ParamEntry = {
      key: '',
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
    try {
      JSON.parse(jsonStr);
      setJsonError(null);
      onChange(jsonStr);
      setEntries(parseParams(jsonStr));
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  // Group entries by top-level key for display
  const groupedEntries = React.useMemo(() => {
    const groups: { [key: string]: ParamEntry[] } = {};
    for (const entry of entries) {
      const topKey = entry.key.split('.')[0] || '';
      if (!topKey) continue;
      if (!groups[topKey]) groups[topKey] = [];
      groups[topKey].push(entry);
    }
    return groups;
  }, [entries]);

  return (
    <div className="params-builder">
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        <button
          type="button"
          className={`node-btn ${viewMode === 'builder' ? 'node-btn--primary' : ''}`}
          onClick={() => setViewMode('builder')}
          style={{ flex: 1, fontSize: '11px', padding: '4px 8px' }}
        >
          Builder
        </button>
        <button
          type="button"
          className={`node-btn ${viewMode === 'json' ? 'node-btn--primary' : ''}`}
          onClick={() => setViewMode('json')}
          style={{ flex: 1, fontSize: '11px', padding: '4px 8px' }}
        >
          JSON
        </button>
      </div>

      {viewMode === 'builder' ? (
        <div className="params-builder__list">
          {Object.entries(groupedEntries).map(([topKey, groupEntries]) => (
            <div key={topKey} className="params-builder__group" style={{ marginBottom: '12px' }}>
              <div className="params-builder__group-header" style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {topKey}
              </div>
              {groupEntries.map((entry) => (
                <div key={entry.id} className="params-builder__entry" style={{ 
                  display: 'flex', 
                  gap: '4px', 
                  marginBottom: '4px',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    className="node-input"
                    value={entry.key}
                    onChange={(e) => updateEntry(entry.id, { key: e.target.value })}
                    placeholder="key"
                    style={{ flex: 1, minWidth: 0, fontSize: '12px', padding: '4px 6px' }}
                  />
                  <select
                    className="node-input"
                    value={entry.type}
                    onChange={(e) => {
                      const newType = e.target.value as ParamEntry['type'];
                      const defaultVal = newType === 'string' ? '' : 
                                        newType === 'number' ? 0 : 
                                        newType === 'boolean' ? false :
                                        newType === 'array' ? [] :
                                        newType === 'object' ? {} : null;
                      updateEntry(entry.id, { type: newType, value: defaultVal });
                    }}
                    style={{ width: '70px', fontSize: '11px', padding: '4px' }}
                  >
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Bool</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </select>
                  {entry.type === 'boolean' ? (
                    <select
                      className="node-input"
                      value={String(entry.value)}
                      onChange={(e) => updateEntry(entry.id, { value: e.target.value === 'true' })}
                      style={{ width: '60px', fontSize: '11px', padding: '4px' }}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : entry.type === 'array' || entry.type === 'object' ? (
                    <input
                      type="text"
                      className="node-input"
                      value={JSON.stringify(entry.value)}
                      onChange={(e) => updateEntry(entry.id, { value: stringToValue(e.target.value, entry.type) })}
                      placeholder={entry.type === 'array' ? '[]' : '{}'}
                      style={{ flex: 1, minWidth: 0, fontSize: '12px', padding: '4px 6px' }}
                    />
                  ) : (
                    <input
                      type={entry.type === 'number' ? 'number' : 'text'}
                      className="node-input"
                      value={valueToString(entry.value)}
                      onChange={(e) => updateEntry(entry.id, { value: stringToValue(e.target.value, entry.type) })}
                      placeholder={entry.type === 'number' ? '0' : 'value'}
                      style={{ flex: 1, minWidth: 0, fontSize: '12px', padding: '4px 6px' }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="node-btn node-btn--danger"
                    style={{ padding: '4px 6px', fontSize: '12px' }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))}
          
          {entries.length === 0 && (
            <div className="params-builder__empty" style={{ 
              textAlign: 'center', 
              padding: '16px', 
              color: 'var(--text-secondary)',
              fontSize: '12px'
            }}>
              No parameters defined
            </div>
          )}
          
          <button
            type="button"
            onClick={addEntry}
            className="node-btn node-btn--secondary"
            style={{ width: '100%', marginTop: '8px', fontSize: '12px' }}
          >
            + Add Parameter
          </button>
        </div>
      ) : (
        <div className="params-builder__json">
          <textarea
            className="node-textarea"
            value={value}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={placeholder}
            rows={6}
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px',
              borderColor: jsonError ? 'var(--error)' : undefined 
            }}
          />
          {jsonError && (
            <div className="node-hint" style={{ color: 'var(--error)', marginTop: '4px' }}>
              {jsonError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ParamsBuilder;
