import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { TextInput, TextAreaInput } from './inputs/FormFields.tsx';
import { JsonPreview } from './JsonPreview.tsx';
import type { ParamEntry, JsonValue } from '../utils/getData.ts';
import { getValueType, stringToValue, valueToString, generateId, parseParams } from '../utils/getData.ts';
import { TrashIcon } from './Icons.tsx';
import { useTranslation } from 'react-i18next';
export const openParamsModal = (value: string, onChange: (val: string) => void) => {
  window.dispatchEvent(new CustomEvent('open-params-modal', { detail: { value, onChange } }));
};

export function ParamsModal() {
  const { t } = useTranslation();
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
          border: '1px solid var(--border-color)',
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
              grid-template-columns: 1.2fr 110px 1.8fr auto;
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
            .params-modal-input {
              font-size: 13px !important;
              padding: 10px 14px !important;
              background: rgba(0, 0, 0, 0.3) !important;
            }
          `}
        </style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-color)', fontWeight: 600 }}>{t('paramsModal.editParams')}</h3>
          <button 
            onClick={handleClose} 
            className="node-btn"
            style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
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
          </div>

          {viewMode === 'builder' ? (
            <div className="params-builder__list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 110px 1.8fr 36px', gap: '16px', padding: '0 12px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                <span>{t('paramsModal.paramName')}</span>
                <span>{t('paramsModal.type')}</span>
                <span>{t('paramsModal.valueVariable')}</span>
                <span></span>
              </div>
              {entries.map((entry) => (
                <div key={entry.id} className="params-builder__entry">
                  <div style={{ minWidth: 0 }}>
                    <TextInput 
                      className="params-modal-input"
                      value={entry.key} 
                      onChange={(val) => updateEntry(entry.id, { key: String(val) })} 
                      placeholder="e.g. user.id" 
                    />
                  </div>
                  <select className="node-input params-modal-input" value={entry.type} onChange={(e) => {
                    const newType = e.target.value as ParamEntry['type'];
                    const defaultVal = newType === 'string' ? '' : newType === 'number' ? 0 : newType === 'boolean' ? false : newType === 'array' ? [] : newType === 'object' ? {} : null;
                    updateEntry(entry.id, { type: newType, value: defaultVal });
                  }}>
                    <option value="string">{t('paramsModal.types.string')}</option>
                    <option value="number">{t('paramsModal.types.number')}</option>
                    <option value="boolean">{t('paramsModal.types.boolean')}</option>
                    <option value="array">{t('paramsModal.types.array')}</option>
                    <option value="object">{t('paramsModal.types.object')}</option>
                  </select>
                  
                  <div style={{ minWidth: 0 }}>
                    {entry.type === 'boolean' ? (
                      <select className="node-input params-modal-input" value={String(entry.value)} onChange={(e) => updateEntry(entry.id, { value: e.target.value === 'true' })}>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : entry.type === 'array' || entry.type === 'object' ? (
                      <TextInput 
                        className="params-modal-input"
                        value={typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value)} 
                        onChange={(val) => updateEntry(entry.id, { value: stringToValue(String(val), entry.type) })} 
                        placeholder={entry.type === 'array' ? '[...]' : '{...}'} 
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
                  
                  <button type="button" onClick={() => removeEntry(entry.id)} className="node-btn node-btn--danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '32px', width: '32px', borderRadius: '6px' }} title={t('paramsModal.remove')}><TrashIcon /></button>
                </div>
              ))}
              {entries.length === 0 && <div className="params-builder__empty" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: '8px' }}>{t('paramsModal.noParams')}</div>}
              <button 
                type="button" 
                onClick={addEntry} 
                className="node-btn node-btn--secondary" 
                style={{ width: '100%', marginTop: '12px', padding: '10px', fontSize: '13px', borderStyle: 'dashed' }}
              >
                {t('paramsModal.addParam')}
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
                  maxHeight="600px"
                />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button onClick={handleClose} className="node-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>{t('paramsModal.cancel')}</button>
          <button onClick={handleSave} className="node-btn node-btn--primary" style={{ padding: '6px 12px', fontSize: '12px', opacity: jsonError ? 0.5 : 1 }} disabled={!!jsonError}>{t('paramsModal.save')}</button>
        </div>

      </div>
    </div>
  );
}
