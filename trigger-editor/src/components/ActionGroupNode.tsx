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
  
  // Check if this ActionGroup has incoming connection from Condition
  const hasConditionInput = edges.some(e => 
    e.target === id && getNode(e.source)?.type === NodeType.CONDITION
  );
  
  // Check if this ActionGroup already has outgoing connections to Actions (for chaining)
  const hasActionOutput = edges.some(e => 
    e.source === id && 
    getNode(e.target)?.type === NodeType.ACTION
  );
  
  // Check if this ActionGroup has outgoing connection to a Condition (for inline conditions)
  const hasConditionOutput = edges.some(e => 
    e.source === id && 
    getNode(e.target)?.type === NodeType.CONDITION
  );

  // Show condition input handle when connected from a Condition
  const showConditionInput = hasConditionInput;
  
  // Show output handles when there's input OR when there's already an output connection
  const showOutputHandles = hasAnyInput || hasActionOutput || hasConditionOutput;

  return (
    <div className="drawflow-node action-group">
      {/* Primary input handle - for Event, Action, or general connections } */}
      <Handle
        type="target"
        position={Position.Left}
        id="action-group-input"
        className="node-input-handle"
        style={{ 
          background: 'var(--action-group-color)', 
          border: '2px solid var(--bg-color)', 
          width: '14px', 
          height: '14px',
          zIndex: 15,
          pointerEvents: 'all'
        }}
        title="Connect from condition or action"
      />
      
      {/* Condition input handle - appears when connected from a Condition node */}
      {showConditionInput && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="condition-input"
            className="node-input-handle"
            style={{ 
              background: 'var(--condition-color)', 
              border: '2px solid var(--bg-color)', 
              width: '12px', 
              height: '12px',
              zIndex: 15,
              pointerEvents: 'all',
              top: '60%'
            }}
            title="Connect from Condition for inline conditional"
          />
          <div 
            className="condition-input-label"
            style={{ 
              position: 'absolute', 
              left: '-50px', 
              top: '60%', 
              transform: 'translateY(-50%)',
              fontSize: '10px',
              color: 'var(--condition-color)',
              fontWeight: 'bold',
              pointerEvents: 'none'
            }}
          >
            IF
          </div>
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
          {hasAnyInput ? 'Actions connected. Add more actions to chain.' : 'Connect from a condition or action first.'}
        </div>
      </div>
      {/* Output handle for chaining actions within the group - show when has input OR has outputs */}
      {showOutputHandles && (
        <>
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
          {/* Condition output for connecting to Condition nodes - for inline conditionals */}
          <Handle
            type="source"
            position={Position.Right}
            id="condition-output"
            className="node-output-handle"
            style={{ 
              background: 'var(--condition-color)', 
              border: '2px solid var(--bg-color)', 
              width: '12px', 
              height: '12px',
              top: '60%'
            }}
            title={hasConditionOutput ? 'More conditions connected' : 'Connect to Condition for inline conditional'}
          />
        </>
      )}
    </div>
  );
}
