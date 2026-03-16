import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { ActionGroupNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';
import { ClearIcon, ActionGroupIcon } from './Icons.tsx';
import { SelectInput, FormField } from './FormFields.tsx';
import type { ExecutionMode } from '../../../src/types';

const MODE_OPTIONS = [
  { value: 'ALL', label: 'ALL (Run all)' },
  { value: 'EITHER', label: 'EITHER (Run one randomly)' },
  { value: 'SEQUENCE', label: 'SEQUENCE (Run in order)' },
];

export default function ActionGroupNode({ id, data }: { id: string, data: ActionGroupNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node action-group">
      <Handle
        type="target"
        position={Position.Left}
        className="node-input-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--action">
        <span className="node-icon"><ActionGroupIcon /></span> Action Group
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        <FormField label="Execution Mode">
          <SelectInput
            value={data.mode || 'ALL'}
            options={MODE_OPTIONS}
            onChange={(val) => data.onChange(val as ExecutionMode, NodeField.MODE)}
          />
        </FormField>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          Connect actions to the output to group them.
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="node-output-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
