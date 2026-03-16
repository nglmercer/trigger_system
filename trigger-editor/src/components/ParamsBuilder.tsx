import * as React from 'react';
import { openParamsModal, parseParams } from './ParamsModal.tsx';

interface ParamsBuilderProps {
  value: string; // JSON string
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ParamsBuilder({ value, onChange }: ParamsBuilderProps) {
  // Read-only external preview to show how many params we have
  const externalParamsCount = React.useMemo(() => parseParams(value).length, [value]);

  return (
    <button 
      type="button" 
      className="node-btn node-btn--secondary" 
      onClick={() => openParamsModal(value, onChange)}
      style={{ width: '100%', fontSize: '11px', padding: '6px' }}
    >
      Edit Parameters ({externalParamsCount})
    </button>
  );
}

export default ParamsBuilder;
