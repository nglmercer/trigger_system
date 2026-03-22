import * as React from 'react';
import { openParamsModal } from './ParamsModal.tsx';
import { parseParams } from '../utils/getData.ts';
import { useTranslation } from 'react-i18next';

interface ParamsBuilderProps {
  value: string; // JSON string
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ParamsBuilder({ value, onChange }: ParamsBuilderProps) {
  // Read-only external preview to show how many params we have
  const externalParamsCount = React.useMemo(() => parseParams(value).length, [value]);
  const { t } = useTranslation();
  return (
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
  );
}

export default ParamsBuilder;
