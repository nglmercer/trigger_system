import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ConditionGroupNodeData } from '../types';
import { NodeField, NodeType, NodeHandle } from '../constants';
import { CONDITION_GROUP_OPTIONS } from '../shared-constants';
import { ClearIcon, ConditionGroupIcon, CopyIcon } from '../components/Icons';
import { SelectInput, FormField } from '../components/inputs/FormFields';
import { useTranslation } from 'react-i18next';

export default function ConditionGroupNode({ id, data }: { id: string, data: ConditionGroupNodeData }) {
  const { t } = useTranslation();
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if this ConditionGroup has incoming connection from Event or Condition
  const hasInput = edges.some(e => 
    e.target === id && 
    (getNode(e.source)?.type === NodeType.EVENT ||
     getNode(e.source)?.type === NodeType.CONDITION)
  );
  
  // Count how many conditions are connected to this group
  // Support both 'cond-output' (editor standard) and 'cond-0', 'cond-1', etc. (from imports)
  const connectedConditions = edges.filter(e => 
    e.source === id && (
      e.sourceHandle?.startsWith(NodeHandle.CONDITION_GROUP_OUTPUT) || 
      e.sourceHandle?.startsWith('cond-')
    )
  ).length;

  // Condition Group has LEFT input and RIGHT output - standard 2-point connection
  // Output is always visible (connects to conditions in sequence)

  return (
    <div className="drawflow-node condition-group">
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.CONDITION_GROUP_INPUT}
        className="node-input-handle"
        style={{ background: 'var(--condition-group-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
        title="Connect from event or condition"
      />
      {/* Right handle for connecting to conditions (always visible) */}
      <Handle
        type="source"
        position={Position.Right}
        id={NodeHandle.CONDITION_GROUP_OUTPUT}
        className="node-output-handle"
        style={{ 
          background: 'var(--condition-group-color)', 
          border: '2px solid var(--bg-color)', 
          width: '12px', 
          height: '12px'
        }}
        title="Connect to condition"
      />
      {/* Explicit THEN output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={NodeHandle.THEN_OUTPUT}
        className="node-output-handle"
        style={{ 
          background: 'var(--condition-group-color)', 
          border: '2px solid var(--bg-color)', 
          width: '12px', 
          height: '12px',
          top: '30%'
        }}
        title="Connect to DO (then) path"
      />

      {/* Explicit ELSE output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id={NodeHandle.ELSE_OUTPUT}
        className="node-output-handle"
        style={{ 
          background: 'var(--condition-group-color)', 
          border: '2px solid var(--bg-color)', 
          width: '12px', 
          height: '12px',
          top: '70%'
        }}
        title="Connect to ELSE path"
      />
      <div className="node-title node-title--condition-group">
        <span className="node-icon"><ConditionGroupIcon /></span> {t('nodeDetails.conditionGroupTitle')}
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
        <FormField 
          label={t('nodeDetails.operator')}
          hint={t('nodeHints.condGroupAndOrHint')}
        >
          <SelectInput
            value={data.operator || 'AND'}
            options={CONDITION_GROUP_OPTIONS.map(opt => ({
              ...opt,
              label: t(`shared.condGroup.${opt.value}`, opt.label)
            }))}
            onChange={(val) => data.onChange(val, NodeField.OPERATOR)}
          />
        </FormField>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          {connectedConditions > 0 
            ? t('nodeHints.condGroupConnected', { count: connectedConditions })
            : t('nodeHints.condGroupConnect')
          }
        </div>
      </div>
    </div>
  );
}
