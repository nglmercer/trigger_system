import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { ActionNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';
import { ClearIcon, ActionIcon } from './Icons.tsx';
import { TextInput, TextAreaInput, FormField } from './FormFields.tsx';

export default function ActionNode({ id, data }: { id: string, data: ActionNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node action">
      <Handle
        type="target"
        position={Position.Left}
        className="node-input-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--action">
        <span className="node-icon"><ActionIcon /></span> Action
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        <FormField label="Action Type">
          <TextInput
            value={data.type || ''}
            onChange={(val) => data.onChange(val as string, NodeField.TYPE)}
            placeholder="log_event"
          />
        </FormField>
        <FormField label="Params (JSON)">
          <TextAreaInput
            value={data.params || '{}'}
            onChange={(val) => data.onChange(val, NodeField.PARAMS)}
            placeholder="{}"
            rows={3}
          />
        </FormField>
      </div>
    </div>
  );
}
