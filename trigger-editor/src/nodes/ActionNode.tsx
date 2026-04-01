import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import { useRFStore } from '../store/rfStore';
import type { ActionNodeData } from '../types';
import { NodeField, NodeType, NodeHandle } from '../constants';
import { ClearIcon, ActionIcon, CopyIcon, ChevronIcon } from '../components/Icons';
import { TextInput, FormField, SelectInput, Collapsible } from '../components/inputs/FormFields';
import { ParamsBuilder } from '../components/ParamsBuilder';
import { useTranslation } from 'react-i18next';

export default function ActionNode({ id, data }: { id: string, data: ActionNodeData }) {
  const { t } = useTranslation();
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  const errors = useRFStore(s => s.errors);
  const nodeErrors = React.useMemo(() => 
    errors.filter((e): e is import('../../../src/sdk/graph-parser').GraphParserError => 
      typeof e === 'object' && e !== null && 'eventId' in e && e.eventId === id
    ), [errors, id]);

  const hasError = (field: string) => nodeErrors.some(e => e.field === field);
  const hasAnyError = nodeErrors.length > 0;
  
  // Show output handle for connecting to ActionGroup or chaining actions
  const isConnectedToActionGroup = edges.some(e => 
    (e.target === id && getNode(e.source)?.type === NodeType.ACTION_GROUP) ||
    (e.source === id && getNode(e.target)?.type === NodeType.ACTION_GROUP)
  );

  return (
    <div className={`drawflow-node action ${hasAnyError ? 'node-error' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.ACTION_INPUT}
        className="node-input-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--action">
        <span className="node-icon"><ActionIcon /></span> {t('nodeDetails.actionTitle')}
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
        <FormField label={t('nodeDetails.actionType')}>
          <TextInput
            value={data.type || ''}
            onChange={(val) => data.onChange(val as string, NodeField.TYPE)}
            placeholder={t('nodeDetails.actionTypePlaceholder')}
            autocompleteMode="variable"
            error={hasError('type')}
          />
        </FormField>
        <FormField label={t('nodeDetails.params')}>
          <ParamsBuilder
            value={data.params || '{}' }
            onChange={(val) => data.onChange(val, NodeField.PARAMS)}
            placeholder='{"key": "value"}'
          />
        </FormField>
        
        <Collapsible 
          title={t('nodeDetails.advancedSettings', 'Advanced Settings')} 
          icon={<ChevronIcon size={14} direction="right" />}
          defaultOpen={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <FormField label={t('nodeDetails.delay', 'Delay (ms)')}>
              <TextInput
                type="number"
                value={data.delay !== undefined ? String(data.delay) : ''}
                onChange={(val) => data.onChange(val !== '' ? Number(val) : undefined, NodeField.DELAY)}
                placeholder="0"
              />
            </FormField>
            <FormField label={t('nodeDetails.probability', 'Probability (0-1)')}>
              <TextInput
                type="number"
                value={data.probability !== undefined ? String(data.probability) : ''}
                onChange={(val) => data.onChange(val !== '' ? Number(val) : undefined, NodeField.PROBABILITY)}
                placeholder="1.0"
              />
            </FormField>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                <FormField label={t('nodeDetails.break', 'Break')}>
                  <SelectInput
                    value={data.break ? 'true' : 'false'}
                    options={[{ value: 'false', label: 'False' }, { value: 'true', label: 'True' }]}
                    onChange={(val) => data.onChange(val === 'true', NodeField.BREAK)}
                  />
                </FormField>
              </div>
              <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                <FormField label={t('nodeDetails.continue', 'Continue')}>
                  <SelectInput
                    value={data.continue ? 'true' : 'false'}
                    options={[{ value: 'false', label: 'False' }, { value: 'true', label: 'True' }]}
                    onChange={(val) => data.onChange(val === 'true', NodeField.CONTINUE)}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </Collapsible>

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
