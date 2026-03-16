import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { EventNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';
import { ClearIcon } from './Icons.tsx';
import { TextInput, TextAreaInput, CheckboxInput, FormField } from './FormFields.tsx';

export default function EventNode({ id, data }: { id: string, data: EventNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node event">
      <div className="node-title node-title--event">
        <span className="node-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></span> Event Trigger
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        <FormField label="Rule ID">
          <TextInput
            value={data.id || ''}
            onChange={(val) => data.onChange(val as string, NodeField.ID)}
            placeholder="e.g. payout-rule-1"
          />
        </FormField>
        
        <FormField label="Display Name">
          <TextInput
            value={data.name || ''}
            onChange={(val) => data.onChange(val as string, NodeField.NAME)}
            placeholder="My Amazing Rule"
          />
        </FormField>

        <FormField label="Event Name">
          <TextInput
            value={data.event || ''}
            onChange={(val) => data.onChange(val as string, NodeField.EVENT)}
            placeholder="e.g. PAYMENT_RECEIVED"
          />
        </FormField>
        
        <FormField label="Description">
          <TextAreaInput
            value={data.description || ''}
            onChange={(val) => data.onChange(val, NodeField.DESCRIPTION)}
            placeholder="What does this rule do?"
          />
        </FormField>

        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <FormField label="Priority">
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
            <FormField label="Cooldown (ms)">
              <TextInput
                value={data.cooldown || 0}
                onChange={(val) => data.onChange(val as number, 'cooldown')}
                type="number"
                placeholder="0"
              />
            </FormField>
          </div>
          <div style={{ flex: 1 }}>
            <FormField label="Tags (comma separated)">
              <TextInput
                value={data.tags?.join(', ') || ''}
                onChange={(val) => data.onChange((val as string).split(',').map(s => s.trim()).filter(Boolean), 'tags')}
                placeholder="tag1, tag2"
              />
            </FormField>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="node-output"
        style={{ background: 'var(--event-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
