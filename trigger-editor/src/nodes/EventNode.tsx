import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { EventNodeData } from '../types.ts';
import { NodeField, NodeHandle } from '../constants';
import { getFieldTooltip } from '../shared-constants';
import { ClearIcon, SettingsIcon, StarIcon } from '../components/Icons';
import { TextInput, TextAreaInput, CheckboxInput, FormField, Collapsible } from '../components/inputs/FormFields.tsx';

export default function EventNode({ id, data }: { id: string, data: EventNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node event">
      <div className="node-title node-title--event">
        <StarIcon /> Event Trigger
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        {/* Required Fields - Always Visible */}
        <FormField 
          label="Rule ID (required)"
          hint={getFieldTooltip('id')}
        >
          <TextInput
            value={data.id || ''}
            onChange={(val) => data.onChange(val as string, NodeField.ID)}
            placeholder="e.g. payout-rule-1"
          />
        </FormField>
        
        <FormField 
          label="Display Name (required)"
          hint={getFieldTooltip('name')}
        >
          <TextInput
            value={data.name || ''}
            onChange={(val) => data.onChange(val as string, NodeField.NAME)}
            placeholder="My Amazing Rule"
          />
        </FormField>

        <FormField 
          label="Event Name (required)"
          hint={getFieldTooltip('on')}
        >
          <TextInput
            value={data.event || ''}
            onChange={(val) => data.onChange(val as string, NodeField.EVENT)}
            placeholder="e.g. PAYMENT_RECEIVED"
          />
        </FormField>

        {/* Optional Fields - In Collapsible Accordion */}
        <Collapsible 
          title="Advanced Settings" 
          icon={<SettingsIcon size={14} />}
          defaultOpen={false}
        >
          <FormField 
            label="Description"
            hint={getFieldTooltip('description')}
          >
            <TextAreaInput
              value={data.description || ''}
              onChange={(val) => data.onChange(val, NodeField.DESCRIPTION)}
              placeholder="What does this rule do?"
            />
          </FormField>

          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField 
                label="Priority"
                hint={getFieldTooltip('priority')}
              >
                <TextInput
                  value={data.priority || 0}
                  onChange={(val) => data.onChange(val as number, NodeField.PRIORITY)}
                  type="number"
                />
              </FormField>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
              <CheckboxInput
                checked={data.enabled !== false}
                onChange={(val) => data.onChange(val, 'enabled')}
                label="Enabled"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
            <div style={{ flex: 1 }}>
              <FormField 
                label="Cooldown (ms)"
                hint={getFieldTooltip('cooldown')}
              >
                <TextInput
                  value={data.cooldown || 0}
                  onChange={(val) => data.onChange(val as number, 'cooldown')}
                  type="number"
                  placeholder="0"
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField 
                label="Tags (comma separated)"
                hint={getFieldTooltip('tags')}
              >
                <TextInput
                  value={data.tags?.join(', ') || ''}
                  onChange={(val) => data.onChange((val as string).split(',').map(s => s.trim()).filter(Boolean), 'tags')}
                  placeholder="tag1, tag2"
                />
              </FormField>
            </div>
          </div>
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
