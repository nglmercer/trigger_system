import * as React from 'react';
import { openParamsModal } from './ParamsModal.tsx';
import { parseParams } from '../utils/getData.ts';
import { useTranslation } from 'react-i18next';
import { UploadIcon } from './Icons.tsx';

interface ParamsBuilderProps {
  value: string; // JSON string
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ParamsBuilder({ value, onChange }: ParamsBuilderProps) {
  // Display only top-level key count for accuracy
  const externalParamsCount = React.useMemo(() => {
    try {
      const parsed = JSON.parse(value);
      return Object.keys(parsed || {}).length;
    } catch {
      return 0;
    }
  }, [value]);
  const { t } = useTranslation();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          onChange(JSON.stringify(parsed, null, 2));
        } catch (err) {
          console.error("Invalid JSON file uploaded");
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
    <button 
      type="button" 
      className="node-input" 
      onClick={() => openParamsModal(value, onChange)}
      style={{ 
        width: '100%', 
        fontSize: '12px', 
        padding: '8px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(88, 166, 255, 0.05)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        color: 'var(--text-primary)',
        transition: 'all 0.2s'
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{t('sidebar.nodes.configureParams')}</span>
      <span style={{ 
        background: 'var(--accent)', 
        color: '#fff', 
        padding: '2px 8px', 
        borderRadius: '10px', 
        fontSize: '10px',
        fontWeight: 700
      }}>
        {externalParamsCount}
      </span>
    </button>
    <label 
      className="node-btn" 
      style={{ 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '0 12px',
        background: 'rgba(88, 166, 255, 0.1)',
        border: '1px solid rgba(88, 166, 255, 0.2)',
        color: 'var(--accent)',
        borderRadius: '6px',
      }}
      title={t('paramsBuilder.uploadJson', 'Upload JSON file')}
    >
      <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileUpload} />
      <UploadIcon size={16} />
    </label>
    </div>
  );
}

export default ParamsBuilder;
