import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ActionGroupNodeData } from '../types';
import { NodeField, NodeType, NodeHandle } from '../constants';
import { ClearIcon, ActionGroupIcon } from '../components/Icons';
import { SelectInput, FormField } from '../components/inputs/FormFields';
import type { ExecutionMode } from '../../../src/types';

const MODE_OPTIONS = [
  { value: 'ALL', label: 'ALL (Run all)' },
  { value: 'EITHER', label: 'EITHER (Run one randomly)' },
  { value: 'SEQUENCE', label: 'SEQUENCE (Run in order)' },
];


export default function ActionGroupNode({ id, data }: { id: string, data: ActionGroupNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if this ActionGroup has incoming connection from Event or Condition
  // (for the primary input - actions to execute)
  const hasEventInput = edges.some(e => 
    e.target === id && getNode(e.source)?.type === NodeType.EVENT
  );
  
  // Check if this ActionGroup has incoming connection from Condition (for inline conditionals)
  // Also check for ACTION_GROUP_INPUT since condition -> action_group uses 'input' handle
  const hasConditionInput = edges.some(e => 
    e.target === id && 
    (e.targetHandle === NodeHandle.CONDITION_INPUT || e.targetHandle === NodeHandle.ACTION_GROUP_INPUT) &&
    (getNode(e.source)?.type === NodeType.CONDITION || getNode(e.source)?.type === NodeType.CONDITION_GROUP)
  );
  
  // Check if this ActionGroup has incoming connection from another ActionGroup (chained)
  const hasActionGroupInput = edges.some(e => 
    e.target === id && 
    getNode(e.source)?.type === NodeType.ACTION_GROUP
  );
  
  // Check if this ActionGroup has incoming connection from DO node (explicit DO path)
  const hasDoInput = edges.some(e => 
    e.target === id && 
    getNode(e.source)?.type === NodeType.DO
  );
  
  // Check if this ActionGroup has outgoing connections to Actions (for chaining)
  const hasActionOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === NodeHandle.ACTION_GROUP_OUTPUT &&
    getNode(e.target)?.type === NodeType.ACTION
  );
  
  // Check if this ActionGroup has outgoing connection to a Condition (for inline conditions)
  const hasConditionOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === NodeHandle.ACTION_GROUP_CONDITION_OUTPUT &&
    getNode(e.target)?.type === NodeType.CONDITION
  );
  
  // Show output handles when there's any input connection
  const showOutputHandles = hasEventInput || hasConditionInput || hasActionOutput || hasConditionOutput || hasDoInput || hasActionGroupInput;

  return (
    <div className="drawflow-node action-group">
      {/* Primary input handle - for Event connections (actions to run) */}
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.ACTION_GROUP_INPUT}
        className="node-input-handle"
        style={{ 
          background: 'var(--action-group-color)', 
          border: '2px solid var(--bg-color)', 
          width: '14px', 
          height: '14px',
          zIndex: 15,
          pointerEvents: 'all'
        }}
        title="Connect from Event to run these actions"
      />
      
      {/* Output handles - for chaining actions or inline conditionals */}
      {/* Always show output handles so users can connect actions from the start */}
      {showOutputHandles && (
        <>
          {/* Action output - for chaining actions within the group */}
          <Handle
            type="source"
            position={Position.Right}
            id={NodeHandle.ACTION_GROUP_OUTPUT}
            className="node-output-handle"
            style={{ 
              background: 'var(--action-color)', 
              border: '2px solid var(--bg-color)', 
              width: '12px', 
              height: '12px'
            }}
            title={hasActionOutput ? 'More actions chained' : 'Connect to next action'}
          />
          
          {/* Condition output - for inline conditionals within action group */}
          <Handle
            type="source"
            position={Position.Right}
            id={NodeHandle.ACTION_GROUP_CONDITION_OUTPUT}
            className="node-output-handle"
            style={{ 
              background: 'var(--condition-color)', 
              border: '2px solid var(--bg-color)', 
              width: '12px', 
              height: '12px',
              top: '60%'
            }}
            title={hasConditionOutput ? 'Condition connected' : 'Add inline condition (if/then/else)'}
          />
        </>
      )}
      
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
          {showOutputHandles 
            ? 'Actions configured. Connect more or add conditions.' 
            : 'Connect from an input source to start adding actions.'}
        </div>
      </div>
    </div>
  );
}
