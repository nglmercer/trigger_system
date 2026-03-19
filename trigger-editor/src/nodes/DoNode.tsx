import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { DoNodeData } from '../types';
import { NodeField, NodeType, NodeHandle, BranchType } from '../constants';

const BRANCH_OPTIONS = [
  { value: BranchType.DO, label: 'DO (then)' },
  { value: BranchType.ELSE, label: 'ELSE' },
];
import { ClearIcon, DoIcon, ElseIcon } from '../components/Icons';
import { SelectInput, FormField } from '../components/FormFields';



/**
 * DoNode - Explicit DO path for complex condition branches
 * 
 * This node provides explicit control over the "then" branch of a condition
 * when the implicit connection is not sufficient (e.g., complex nesting).
 * 
 * By default, condition -> action/action_group is implicit DO,
 * but for more complex cases, you can explicitly use a DO node.
 */
export default function DoNode({ id, data }: { id: string, data: DoNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if this DoNode has incoming connection from Condition
  // Accepts from Condition via output handle
  const hasConditionInput = edges.some(e => 
    e.target === id &&
    (
      (getNode(e.source)?.type === NodeType.CONDITION && e.sourceHandle === NodeHandle.CONDITION_OUTPUT) ||
      (getNode(e.source)?.type === NodeType.CONDITION_GROUP)
    )
  );
  
  // Check if DoNode has outgoing connections to Actions or ActionGroups
  const hasActionOutput = edges.some(e => 
    e.source === id && 
    (getNode(e.target)?.type === NodeType.ACTION ||
     getNode(e.target)?.type === NodeType.ACTION_GROUP
    )
  );
  // Determine colors based on branch type
  const isElse = data.branchType === BranchType.ELSE;
  
  //console.log('edges', edges,hasConditionInput,hasActionOutput);
  // Show output when there's input connection
  const showOutput = hasConditionInput;
  const nodeColor = isElse ? '#ff6b6b' : 'var(--do-color, #9b59b6)';

  return (
    <div className="drawflow-node do">
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.DO_INPUT}
        className="node-input-handle"
        style={{ 
          background: nodeColor, 
          border: '2px solid var(--bg-color)', 
          width: '12px', 
          height: '12px' 
        }}
        title={`Connect from Condition (explicit ${isElse ? 'ELSE' : 'DO'} path)`}
      />
      
      {showOutput && (
        <Handle
          type="source"
          position={Position.Right}
          id={NodeHandle.DO_OUTPUT}
          className="node-output-handle"
          style={{ 
            background: nodeColor, 
            border: '2px solid var(--bg-color)', 
            width: '12px', 
            height: '12px'
          }}
          title="Connect to Action or ActionGroup"
        />
      )}
      
      <div className="node-title node-title--do">
        <span className="node-icon">{isElse ? <ElseIcon /> : <DoIcon />}</span> 
        {isElse ? 'ELSE' : 'DO'}
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      
      <div className="node-body">
        <FormField label="Branch Type">
          <SelectInput
            value={data.branchType || 'do'}
            options={BRANCH_OPTIONS}
            onChange={(val) => data.onChange(val as BranchType, NodeField.BRANCH_TYPE)}
          />
        </FormField>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          {hasConditionInput 
            ? (hasActionOutput ? `${isElse ? 'ELSE' : 'DO'} path configured` : 'Connect to Action or ActionGroup')
            : 'Connect from Condition to start'}
        </div>
      </div>
    </div>
  );
}
