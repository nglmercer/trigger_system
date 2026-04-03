import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { TextInput, TextAreaInput, SelectInput, SwitchInput, MediaSelectInput } from './inputs/FormFields.tsx';
import { JsonPreview } from './JsonPreview.tsx';
import type { ParamEntry, JsonValue } from '../utils/getData.ts';
import { getValueType, stringToValue, valueToString, generateId, parseParams } from '../utils/getData.ts';
import { TrashIcon, ClearIcon, PlusIcon, UploadIcon, InfoIcon } from './Icons.tsx';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SHORTCUTS, isShortcut } from '../utils/shortcuts.ts';
import { useRFStore } from '../store/rfStore.ts';

export const openParamsModal = (value: string, onChange: (val: string) => void, actionType?: string) => {
  window.dispatchEvent(new CustomEvent('open-params-modal', { detail: { value, onChange, actionType } }));
};

export function ParamsModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<ParamEntry[]>([]);
  const [viewMode, setViewMode] = useState<'builder' | 'json'>('builder');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [localJson, setLocalJson] = useState('{}');
  const [collapsedPrefixes, setCollapsedPrefixes] = useState<string[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | undefined>(undefined);
  const onChangeRef = useRef<((val: string) => void) | null>(null);
  const actionConfigs = useRFStore(s => s.actionConfigs);

  const toggleCollapse = (prefix: string) => {
    const dotPrefix = prefix + '.';
    if (collapsedPrefixes.includes(dotPrefix)) {
      setCollapsedPrefixes(collapsedPrefixes.filter(p => p !== dotPrefix));
    } else {
      setCollapsedPrefixes([...collapsedPrefixes, dotPrefix]);
    }
  };

  useEffect(() => {
    const handleOpen = (e: any) => {
      const { value, onChange, actionType: type } = e.detail;
      const parsed = parseParams(value || '{}');
      setLocalJson(value || '{}');
      setEntries(parsed);
      setJsonError(null);
      setActionType(type);
      
      const objectKeys = parsed.filter(en => en.type === 'object').map(en => en.key + '.');
      setCollapsedPrefixes(objectKeys);
      
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

  const addEntryWithKey = (key: string) => {
    const newEntry: ParamEntry = {
      key,
      value: '',
      type: 'string',
      id: generateId()
    };
    handleChange([...entries, newEntry]);
  };

  const addEntry = () => {
    addEntryWithKey(`param_${generateId().substring(0, 4)}`);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // Add param: Alt+N
      if (isShortcut(event, DEFAULT_SHORTCUTS.ADD_PARAM)) {
        event.preventDefault();
        addEntry();
        return;
      }

      // Remove param: Delete
      if (isShortcut(event, DEFAULT_SHORTCUTS.REMOVE_PARAM)) {
        // Only if an entry is selected AND we are NOT in an input/textarea
        if (selectedEntryId && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
           event.preventDefault();
           removeEntry(selectedEntryId);
           setSelectedEntryId(null);
        }
        return;
      }

      // Save: Ctrl+S or Enter (if not in textarea)
      if (isShortcut(event, DEFAULT_SHORTCUTS.SAVE) || (event.key === 'Enter' && (event.target as HTMLElement).tagName !== 'TEXTAREA')) {
         event.preventDefault();
         handleSave();
         return;
      }

      // Close: Escape
      if (event.key === 'Escape') {
         handleClose();
         return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedEntryId, entries]);

  const updateEntry = (id: string, updates: Partial<ParamEntry>) => {
    setEntries(prevEntries => {
      const targetEntry = prevEntries.find(e => e.id === id);
      if (!targetEntry) return prevEntries;

      const oldKey = targetEntry.key;
      const newKey = updates.key !== undefined ? updates.key : oldKey;

      const nextEntries = prevEntries.map(entry => {
        if (entry.id === id) {
          return { ...entry, ...updates };
        }
        
        if (oldKey !== newKey && entry.key.startsWith(oldKey + '.')) {
          const childSubKey = entry.key.substring(oldKey.length);
          return { ...entry, key: newKey + childSubKey };
        }
        
        return entry;
      });

      const jsonStr = entriesToJson(nextEntries);
      setLocalJson(jsonStr);
      return nextEntries;
    });
  };

  const removeEntry = (id: string) => {
    const entryToRemove = entries.find(e => e.id === id);
    if (!entryToRemove) return;
    
    // Remove entry and all its children
    const prefix = entryToRemove.key + '.';
    const newEntries = entries.filter(e => e.id !== id && !e.key.startsWith(prefix));
    
    handleChange(newEntries);
  };

  const handleJsonUpdate = (newData: any) => {
    const jsonStr = JSON.stringify(newData, null, 2);
    setLocalJson(jsonStr);
    setJsonError(null);
    setEntries(parseParams(jsonStr));
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          const jsonStr = JSON.stringify(parsed, null, 2);
          setLocalJson(jsonStr);
          setJsonError(null);
          setEntries(parseParams(jsonStr));
        } catch (err) {
          setJsonError("Invalid JSON file");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
          backgroundColor: 'var(--bg-color)', 
          border: '1px solid var(--border)',
          borderRadius: '12px', 
          padding: '24px', 
          width: '850px', // Larger size
          maxWidth: '95vw', 
          maxHeight: '90vh',
          overflowY: 'auto', 
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          animation: 'modalSlideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <style>
          {`
            @keyframes modalSlideIn {
              from { opacity: 0; transform: translateY(20px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .params-builder__entry {
              display: grid;
              grid-template-columns: 1.2fr 110px 1.8fr 32px;
              gap: 16px;
              align-items: center;
              padding: 12px;
              border-radius: 10px;
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.05);
              transition: all 0.2s;
            }
            .params-builder__entry:hover {
              background: rgba(255, 255, 255, 0.08);
              border-color: rgba(255, 255, 255, 0.15);
            }
            .params-builder__entry--selected {
              background: rgba(88, 166, 255, 0.1) !important;
              border-color: var(--accent) !important;
              box-shadow: 0 0 0 1px var(--accent);
            }
            .params-modal-input {
              font-size: 13px !important;
              padding: 10px 14px !important;
              background: rgba(13, 17, 23, 0.5) !important;
              border-radius: 8px !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              transition: all 0.2s !important;
            }
            .params-modal-input:hover {
              border-color: rgba(255, 255, 255, 0.2) !important;
              background: rgba(13, 17, 23, 0.7) !important;
            }
            .params-modal-input:focus {
              background: rgba(13, 17, 23, 0.8) !important;
              border-color: var(--accent) !important;
              box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15) !important;
            }
          `}
        </style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.01em' }}>{t('paramsModal.editParams')}</h3>
          <button 
            onClick={handleClose} 
            className="node-btn node-btn--secondary"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid var(--border)', 
              padding: '6px', 
              borderRadius: '8px',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <ClearIcon size={18} />
          </button>
        </div>
        
        <div className="params-builder">
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-secondary)', 
            padding: '4px', 
            borderRadius: '8px', 
            marginBottom: '16px',
            border: '1px solid var(--border)'
          }}>
            <button 
              type="button" 
              className={`node-btn ${viewMode === 'builder' ? 'node-btn--primary' : ''}`} 
              onClick={() => setViewMode('builder')} 
              style={{ flex: 1, fontSize: '12px', padding: '8px', borderRadius: '6px' }}
            >
              {t('paramsModal.builderView')}
            </button>
            <button 
              type="button" 
              className={`node-btn ${viewMode === 'json' ? 'node-btn--primary' : ''}`} 
              onClick={() => setViewMode('json')} 
              style={{ flex: 1, fontSize: '12px', padding: '8px', borderRadius: '6px' }}
            >
              {t('paramsModal.jsonView')}
            </button>
            <label 
              className="node-btn" 
              style={{ 
                flex: 1, 
                fontSize: '12px', 
                padding: '8px', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                textAlign: 'center', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: 'rgba(88, 166, 255, 0.1)',
                color: 'var(--accent)',
                border: '1px solid rgba(88, 166, 255, 0.2)'
              }}
              title={t('paramsModal.uploadJsonUrl', 'Upload JSON file')}
            >
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileUpload} />
              <UploadIcon size={14} /> {t('paramsModal.uploadJson', 'Upload JSON')}
            </label>
          </div>

          {(() => {
            const config = actionConfigs.find(c => c.type === actionType);
            if (config && viewMode === 'builder') {
              const currentData = (() => {
                try { return JSON.parse(localJson); } catch { return {}; }
              })();
              
              const updateField = (key: string, val: any) => {
                const newData = { ...currentData, [key]: val };
                const jsonStr = JSON.stringify(newData, null, 2);
                setLocalJson(jsonStr);
                setEntries(parseParams(jsonStr));
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {t('paramsModal.customConfigActive', 'Using custom configuration for action: ')} <strong>{actionType}</strong>
                  </div>
                  {config.fields.map(field => (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {field.labelKey ? t(field.labelKey) : field.label}
                          {field.required && <span style={{ color: 'var(--error, #f85149)' }}>*</span>}
                          {(field.descriptionKey || field.description) && (
                            <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400 }}>
                              - {field.descriptionKey ? t(field.descriptionKey) : field.description}
                            </span>
                          )}
                        </label>
                        {field.hint && (
                          <div 
                            title={field.hint}
                            style={{ color: 'var(--text-muted)', cursor: 'help', display: 'flex', alignItems: 'center' }}
                          >
                            <InfoIcon size={12} />
                          </div>
                        )}
                      </div>
                      {field.type === 'boolean' ? (
                        <SwitchInput 
                          checked={Boolean(currentData[field.key] ?? field.default ?? false)} 
                          onChange={(val) => updateField(field.key, val)}
                        />
                      ) : field.type === 'select' ? (
                        <MediaSelectInput 
                          value={String(currentData[field.key] ?? field.default ?? '')} 
                          options={(field.options || []).map(opt => ({
                            ...opt,
                            label: opt.labelKey ? t(opt.labelKey) : opt.label
                          }))}
                          onChange={(val) => updateField(field.key, val)}
                        />
                      ) : field.type === 'textarea' ? (
                        <TextAreaInput 
                          value={String(currentData[field.key] ?? field.default ?? '')} 
                          onChange={(val) => updateField(field.key, val)}
                          placeholder={field.placeholder}
                          rows={4}
                        />
                      ) : (
                        <TextInput 
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={String(currentData[field.key] ?? field.default ?? '')} 
                          onChange={(val) => updateField(field.key, field.type === 'number' ? Number(val) : val)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            return viewMode === 'builder' ? (
              <div className="params-builder__list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 110px 1.8fr 32px', gap: '16px', padding: '0 12px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  <span>{t('paramsModal.paramName')}</span>
                  <span>{t('paramsModal.type')}</span>
                  <span>{t('paramsModal.valueVariable')}</span>
                  <span></span>
                </div>
                {(() => {
                  const sorted = [...entries].sort((a, b) => a.key.localeCompare(b.key));
                  
                  return sorted.map((entry) => {
                    const depth = entry.key.split('.').length - 1;
                    const dotPrefix = entry.key + '.';
                    
                    const isHidden = collapsedPrefixes.some(pref => entry.key.startsWith(pref) && entry.key !== pref.slice(0, -1));
                    if (isHidden) return null;
                    
                    const isCollapsed = collapsedPrefixes.includes(dotPrefix);
                    const isSelected = selectedEntryId === entry.id;

                    return (
                      <div
                        key={entry.id}
                        className={`params-builder__entry ${isSelected ? 'params-builder__entry--selected' : ''}`}
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: `${depth * 16}px` }}>
                          {entry.type === 'object' ? (
                            <button 
                              type="button"
                              onClick={() => toggleCollapse(entry.key)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', width: '16px' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>
                          ) : <div style={{width: '16px'}} />}
                          <div style={{ flex: 1 }}>
                            <TextInput 
                              className="params-modal-input"
                              value={entry.key.split('.').pop() || ''} 
                              onBlur={(e) => {
                                  const newFragment = e.target.value.replace(/\./g, '_').trim();
                                  const parts = entry.key.split('.');
                                  
                                  if (newFragment !== parts[parts.length - 1] && newFragment !== "") {
                                    parts[parts.length - 1] = newFragment;
                                    updateEntry(entry.id, { key: parts.join('.') });
                                  }
                              }} 
                              placeholder="name" 
                            />
                          </div>
                        </div>
                        <SelectInput 
                          className="params-modal-input" 
                          value={entry.type} 
                          options={[
                            { value: 'string', label: t('paramsModal.types.string') },
                            { value: 'number', label: t('paramsModal.types.number') },
                            { value: 'boolean', label: t('paramsModal.types.boolean') },
                            { value: 'array', label: t('paramsModal.types.array') },
                            { value: 'object', label: t('paramsModal.types.object') },
                          ]}
                          onChange={(newType) => {
                            const defaultVal = newType === 'string' ? '' : newType === 'number' ? 0 : newType === 'boolean' ? false : newType === 'array' ? [] : newType === 'object' ? {} : null;
                            updateEntry(entry.id, { type: newType as ParamEntry['type'], value: defaultVal });
                          }} 
                        />
                        
                        <div style={{ minWidth: 0 }}>
                          {entry.type === 'boolean' ? (
                            <SelectInput 
                              className="params-modal-input" 
                              value={String(entry.value)} 
                              options={[
                                { value: 'true', label: 'true' },
                                { value: 'false', label: 'false' },
                              ]}
                              onChange={(val) => updateEntry(entry.id, { value: val === 'true' })} 
                            />
                          ) : entry.type === 'object' ? (
                            <button 
                              type="button"
                              onClick={() => {
                                const newKey = `${entry.key}.new_param`;
                                addEntryWithKey(newKey);
                                if (isCollapsed) toggleCollapse(entry.key);
                              }}
                              className="node-btn node-btn--secondary"
                              style={{ width: '100%', fontSize: '11px', padding: '10px', display: 'flex', justifyContent: 'center', gap: '6px' }}
                            >
                              <PlusIcon size={12} /> {t('paramsModal.addProperty', 'Add Property')}
                            </button>
                          ) : entry.type === 'array' ? (
                            <TextAreaInput 
                              className="params-modal-input"
                              value={typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)} 
                              onChange={(val) => updateEntry(entry.id, { value: stringToValue(String(val), entry.type) })} 
                              placeholder="[...]" 
                              rows={1}
                              style={{ minHeight: '38px', resize: 'vertical' }}
                            />
                          ) : (
                            <TextInput 
                              className="params-modal-input"
                              type={entry.type === 'number' ? 'number' : 'text'} 
                              value={valueToString(entry.value)} 
                              onChange={(val) => updateEntry(entry.id, { value: stringToValue(String(val), entry.type) })} 
                              placeholder={entry.type === 'number' ? '0' : 'Enter value...'} 
                            />
                          )}
                        </div>
                        
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }} className="node-btn node-btn--danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px', borderRadius: '6px' }} title={t('paramsModal.remove')}><TrashIcon /></button>
                      </div>
                    );
                  });
                })()}
                {entries.length === 0 && <div className="params-builder__empty" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: '8px' }}>{t('paramsModal.noParams')}</div>}
                <button 
                  type="button" 
                  onClick={addEntry} 
                  className="node-btn node-btn--secondary" 
                  style={{ 
                    width: '100%', 
                    marginTop: '16px', 
                    padding: '12px', 
                    fontSize: '13px', 
                    borderStyle: 'dashed',
                    background: 'rgba(88, 166, 255, 0.05)',
                    borderColor: 'rgba(88, 166, 255, 0.3)',
                    color: 'var(--accent)',
                    display: 'flex',
                    gap: '8px'
                  }}
                >
                  <PlusIcon size={16} /> {t('paramsModal.addParam')}
                </button>
              </div>
            ) : (
              <div className="params-builder__json">
                  <JsonPreview 
                    data={(() => {
                      try { return JSON.parse(localJson); } catch { return {}; }
                    })()} 
                    editable={true}
                    onChange={handleJsonUpdate}
                    maxHeight="100%"
                  />
              </div>
            );
          })()}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button onClick={handleClose} className="node-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('paramsModal.cancel')}</button>
          <button onClick={handleSave} className="node-btn node-btn--primary" style={{ padding: '6px 12px', fontSize: '12px', opacity: jsonError ? 0.5 : 1 }} disabled={!!jsonError}>{t('paramsModal.save')}</button>
        </div>

      </div>
    </div>
  );
}
