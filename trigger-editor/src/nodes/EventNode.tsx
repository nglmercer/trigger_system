import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useRFStore } from '../store/rfStore';
import type { EventNodeData } from '../types.ts';
import { NodeField, NodeHandle } from '../constants';
import { getFieldTooltip } from '../shared-constants';
import { ClearIcon, SettingsIcon, StarIcon, CopyIcon } from '../components/Icons';
import { TextInput, TextAreaInput, CheckboxInput, FormField, Collapsible } from '../components/inputs/FormFields.tsx';
import { useTranslation } from 'react-i18next';

export default function EventNode({ id }: { id: string }) {
  const { deleteElements } = useReactFlow();
  const { t } = useTranslation();
  
  // Connect to store for granular updates
  const data = useRFStore(s => s.nodes.find(n => n.id === id)?.data) as EventNodeData | undefined;
  const updateNodeData = useRFStore(s => s.updateNodeData);
  const duplicateNode = useRFStore(s => s.duplicateNode);
  const errors = useRFStore(s => s.errors);

  const nodeErrors = React.useMemo(() => 
    errors.filter((e): e is import('../../../src/sdk/graph-parser').GraphParserError => 
      typeof e === 'object' && e !== null && 'eventId' in e && e.eventId === id
    ), [errors, id]);

  const hasError = (field: string) => nodeErrors.some(e => e.field === field);
  const hasAnyError = nodeErrors.length > 0;

  if (!data) return null;

  return (
    <div className={`drawflow-node event ${hasAnyError ? 'node-error' : ''}`}>
      <div className="node-title node-title--event">
        <StarIcon /> {t('nodeDetails.eventTriggerTitle')}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button 
            className="node-delete" 
            onClick={(e) => { e.stopPropagation(); duplicateNode(id); }} 
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
        {/* Required Fields - Always Visible */}
        <FormField 
          label={t('nodeDetails.ruleId')}
          hint={getFieldTooltip('id')}
        >
          <TextInput
            value={data.id || ''}
            onChange={(val) => updateNodeData(id, val, NodeField.ID)}
            placeholder={t('nodeDetails.ruleIdPlaceholder')}
            error={hasError('id')}
          />
        </FormField>
        
        <FormField 
          label={t('nodeDetails.displayName')}
          hint={getFieldTooltip('name')}
        >
          <TextInput
            value={data.name || ''}
            onChange={(val) => updateNodeData(id, val, NodeField.NAME)}
            placeholder={t('nodeDetails.displayNamePlaceholder')}
          />
        </FormField>

        <FormField 
          label={t('nodeDetails.eventName')}
          hint={getFieldTooltip('on')}
        >
          <TextInput
            value={data.event || ''}
            onChange={(val) => updateNodeData(id, val, NodeField.EVENT)}
            placeholder={t('nodeDetails.eventNamePlaceholder')}
            error={hasError('event')}
          />
        </FormField>

        {/* Optional Fields - In Collapsible Accordion */}
        <Collapsible 
          title={t('nodeDetails.advancedSettings')} 
          icon={<SettingsIcon size={14} />}
          defaultOpen={false}
        >
          <FormField 
            label={t('nodeDetails.description')}
            hint={getFieldTooltip('description')}
          >
            <TextAreaInput
              value={data.description || ''}
              onChange={(val) => updateNodeData(id, val, NodeField.DESCRIPTION)}
              placeholder={t('nodeDetails.descriptionPlaceholder')}
            />
          </FormField>
            <div style={{ paddingBottom: '12px' }}>
              <CheckboxInput
                checked={data.enabled !== false}
                onChange={(val) => updateNodeData(id, val, 'enabled')}
                label={t('nodeDetails.enabled')}
              />
            </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', alignItems: 'flex-end' }}>
              <FormField 
                label={t('nodeDetails.priority')}
                hint={getFieldTooltip('priority')}
              >
                <TextInput
                  value={data.priority || 0}
                  onChange={(val) => updateNodeData(id, val, NodeField.PRIORITY)}
                  type="number"
                />
              </FormField>
              <FormField 
                label={t('nodeDetails.cooldown')}
                hint={getFieldTooltip('cooldown')}
              >
                <TextInput
                  value={data.cooldown || 0}
                  onChange={(val) => updateNodeData(id, val, 'cooldown')}
                  type="number"
                  placeholder="0"
                />
              </FormField>
            
          </div>


          <FormField 
            label={t('nodeDetails.tags')}
            hint={getFieldTooltip('tags')}
          >
            <TextInput
              value={data.tags?.join(', ') || ''}
              onChange={(val) => {
                const str = typeof val === 'string' ? val : '';
                updateNodeData(id, str.split(',').map(s => s.trim()).filter(Boolean), 'tags');
              }}
              placeholder={t('nodeDetails.tagsPlaceholder')}
            />
          </FormField>
        </Collapsible>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id={NodeHandle.EVENT_OUTPUT}
        className="node-output"
        style={{ background: 'var(--event-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
