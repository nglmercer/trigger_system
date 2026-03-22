import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ActionNodeData } from '../types';
import { NodeField, NodeType, NodeHandle } from '../constants';
import { ClearIcon, ActionIcon } from '../components/Icons';
import { TextInput, FormField } from '../components/inputs/FormFields';
import { ParamsBuilder } from '../components/ParamsBuilder';
import { useTranslation } from 'react-i18next';

export default function ActionNode({ id, data }: { id: string, data: ActionNodeData }) {
  const { t } = useTranslation();
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Show output handle for connecting to ActionGroup or chaining actions
  const isConnectedToActionGroup = edges.some(e => 
    (e.target === id && getNode(e.source)?.type === NodeType.ACTION_GROUP) ||
    (e.source === id && getNode(e.target)?.type === NodeType.ACTION_GROUP)
  );

  return (
    <div className="drawflow-node action">
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.ACTION_INPUT}
        className="node-input-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--action">
        <span className="node-icon"><ActionIcon /></span> {t('nodeDetails.actionTitle')}
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title={t('nodeDetails.deleteNode')}>
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        <FormField label={t('nodeDetails.actionType')}>
          <TextInput
            value={data.type || ''}
            onChange={(val) => data.onChange(val as string, NodeField.TYPE)}
            placeholder={t('nodeDetails.actionTypePlaceholder')}
            autocompleteMode="variable"
          />
        </FormField>
        <FormField label={t('nodeDetails.params')}>
          <ParamsBuilder
            value={data.params || '{}' }
            onChange={(val) => data.onChange(val, NodeField.PARAMS)}
            placeholder='{"key": "value"}'
          />
        </FormField>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id={NodeHandle.ACTION_OUTPUT}
        className="node-output-handle"
        style={{ 
          background: 'var(--action-color)', 
          border: '2px solid var(--bg-color)', 
          width: '12px', 
          height: '12px'
        }}
        title="Connect to ActionGroup or another Action"
      />
    </div>
  );
}
