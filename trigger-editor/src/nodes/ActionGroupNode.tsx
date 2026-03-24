import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ActionGroupNodeData } from '../types';
import { NodeField, NodeType, NodeHandle } from '../constants';
import { ClearIcon, ActionGroupIcon, CopyIcon } from '../components/Icons';
import { SelectInput, FormField } from '../components/inputs/FormFields';
import type { ExecutionMode } from '../../../src/types';
import { useTranslation } from 'react-i18next';

const MODE_OPTIONS = [
  { value: 'ALL', label: 'ALL (Run all)' },
  { value: 'EITHER', label: 'EITHER (Run one randomly)' },
  { value: 'SEQUENCE', label: 'SEQUENCE (Run in order)' },
];


export default function ActionGroupNode({ id, data }: { id: string, data: ActionGroupNodeData }) {
  const { t } = useTranslation();
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Show output handles
  const showOutputHandles = true;

  return (
    <div className="drawflow-node action-group">
      {/* Primary input handle - for Event connections (actions to run) */}
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.ACTION_GROUP_INPUT}
        className="node-input-handle"
        style={{ 
          background: 'var(--action-group-color)', 
          border: '2px solid var(--bg-color)', 
          width: '14px', 
          height: '14px',
          zIndex: 15,
          pointerEvents: 'all'
        }}
        title="Connect from Event to run these actions"
      />
      
      {/* Output handles - for chaining actions or inline conditionals */}
      {/* Always show output handles so users can connect actions from the start */}
      {showOutputHandles && (
        <>
          {/* Action_output - universal handle for actions OR inline conditions (Smart Parser) */}
          <Handle
            type="source"
            position={Position.Right}
            id={NodeHandle.ACTION_GROUP_OUTPUT}
            className="node-output-handle"
            style={{ 
              background: 'var(--action-color)', 
              border: '2px solid var(--bg-color)', 
              width: '12px', 
              height: '12px'
            }}
            title="Connect to Action or Inline Condition"
          />
        </>
      )}
      
      <div className="node-title node-title--action-group">
        <span className="node-icon"><ActionGroupIcon /></span> {t('nodeDetails.actionGroupTitle')}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button 
            className="node-delete" 
            onClick={(e) => { e.stopPropagation(); data.onDuplicate(); }} 
            title={t('nodeDetails.duplicateNode', 'Duplicate Node')}
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <CopyIcon size={14} />
          </button>
          <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title={t('nodeDetails.deleteNode')}>
            <ClearIcon size={14} />
          </button>
        </div>
      </div>
      
      <div className="node-body">
        <FormField label={t('nodeDetails.executionMode')}>
          <SelectInput
            value={data.mode || 'ALL'}
            options={MODE_OPTIONS.map(opt => ({
              ...opt,
              label: t(`shared.execMode.${opt.value}`, opt.label) as string
            }))}
            onChange={(val) => data.onChange(val as ExecutionMode, NodeField.MODE)}
          />
        </FormField>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          {showOutputHandles 
            ? t('nodeHints.actionGroupConfigured') 
            : t('nodeHints.actionGroupConnect')}
        </div>
      </div>
    </div>
  );
}
