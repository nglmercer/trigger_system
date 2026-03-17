import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ActionGroupNodeData } from '../types.ts';
import { NodeField, NodeType } from '../constants.ts';
import { ClearIcon, ActionGroupIcon } from './Icons.tsx';
import { SelectInput, FormField } from './FormFields.tsx';
import type { ExecutionMode } from '../../../src/types';

const MODE_OPTIONS = [
  { value: 'ALL', label: 'ALL (Run all)' },
  { value: 'EITHER', label: 'EITHER (Run one randomly)' },
  { value: 'SEQUENCE', label: 'SEQUENCE (Run in order)' },
];

export default function ActionGroupNode({ id, data }: { id: string, data: ActionGroupNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if this ActionGroup has ANY incoming connection
  // (from Event, Condition, ConditionGroup, or Action)
  const hasAnyInput = edges.some(e => 
    e.target === id && 
    (getNode(e.source)?.type === NodeType.EVENT ||
     getNode(e.source)?.type === NodeType.CONDITION ||
     getNode(e.source)?.type === NodeType.CONDITION_GROUP ||
     getNode(e.source)?.type === NodeType.ACTION)
  );
  
  // Check if this ActionGroup already has outgoing connections to Actions (for chaining)
  const hasActionOutput = edges.some(e => 
    e.source === id && 
    getNode(e.target)?.type === NodeType.ACTION
  );

  return (
    <div className="drawflow-node action-group">
      <Handle
        type="target"
        position={Position.Left}
        id="action-group-input"
        className="node-input-handle"
        style={{ background: 'var(--action-group-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
        title="Connect from condition"
      />
      <div className="node-title node-title--action-group">
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
          {hasAnyInput ? 'Actions connected. Add more actions to chain.' : 'Connect from a condition or action first.'}
        </div>
      </div>
      {/* Output handle for chaining actions within the group - only show when has any input */}
      {hasAnyInput && (
        <Handle
          type="source"
          position={Position.Right}
          id="action-group-output"
          className="node-output-handle"
          style={{ 
            background: 'var(--action-color)', 
            border: '2px solid var(--bg-color)', 
            width: '12px', 
            height: '12px'
          }}
          title={hasActionOutput ? 'More actions connected' : 'Connect to action'}
        />
      )}
    </div>
  );
}
