import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { ConditionGroupNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';
import { CONDITION_GROUP_OPTIONS } from '../shared-constants.ts';
import { ClearIcon, ConditionGroupIcon } from './Icons.tsx';
import { SelectInput, FormField } from './FormFields.tsx';

export default function ConditionGroupNode({ id, data }: { id: string, data: ConditionGroupNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node condition-group">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="node-input-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="cond-1"
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '10px', height: '10px', top: '-5px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="cond-2"
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '10px', height: '10px', bottom: '-5px' }}
      />
      <div className="node-title node-title--condition">
        <span className="node-icon"><ConditionGroupIcon /></span> Condition Group
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        <FormField 
          label="Operator"
          hint="AND: All conditions must match. OR: Any condition can match."
        >
          <SelectInput
            value={data.operator || 'AND'}
            options={CONDITION_GROUP_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
            onChange={(val) => data.onChange(val, NodeField.OPERATOR)}
          />
        </FormField>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          Connect conditions to top/bottom handles
        </div>
      </div>
      
      {/* Output to actions after conditions are evaluated */}
      <Handle
        type="source"
        position={Position.Right}
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
        title="Connect to action"
      />
    </div>
  );
}
