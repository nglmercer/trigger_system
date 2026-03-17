import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ActionNodeData } from '../types.ts';
import { NodeField, NodeType } from '../constants.ts';
import { ClearIcon, ActionIcon } from './Icons.tsx';
import { TextInput, TextAreaInput, FormField } from './FormFields.tsx';
import { ParamsBuilder } from './ParamsBuilder.tsx';

export default function ActionNode({ id, data }: { id: string, data: ActionNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Show output handle for connecting to ActionGroup or chaining actions
  // Always show to allow initial connections
  const isConnectedToActionGroup = edges.some(e => 
    (e.target === id && getNode(e.source)?.type === NodeType.ACTION_GROUP) ||
    (e.source === id && getNode(e.target)?.type === NodeType.ACTION_GROUP)
  );

  return (
    <div className="drawflow-node action">
      <Handle
        type="target"
        position={Position.Left}
        id="action-input"
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
            autocompleteMode="variable"
          />
        </FormField>
        <FormField label="Params">
          <ParamsBuilder
            value={data.params || '{}'}
            onChange={(val) => data.onChange(val, NodeField.PARAMS)}
            placeholder='{"key": "value"}'
          />
        </FormField>
      </div>
      {/* Output handle for connecting to ActionGroup or chaining actions */}
      {/* Always show output handle to allow connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="action-output"
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
