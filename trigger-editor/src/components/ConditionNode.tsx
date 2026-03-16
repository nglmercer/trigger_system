import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ConditionNodeData } from '../types.ts';
import { NodeField, NodeType } from '../constants.ts';
import { getOperatorOptions, getOperatorDescription, getFieldTooltip } from '../shared-constants.ts';
import { ClearIcon, ConditionIcon } from './Icons.tsx';
import { TextInput, SelectInput, FormField } from './FormFields.tsx';
import type { ComparisonOperator } from '../../../src/types';

const OPERATOR_OPTIONS = getOperatorOptions();

export default function ConditionNode({ id, data }: { id: string, data: ConditionNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Detection logic to hide "next" handle if part of a group
  const isPartofGroup = edges.some(e => {
    const sourceNode = getNode(e.source);
    return e.target === id && sourceNode?.type === NodeType.CONDITION_GROUP;
  });

  // Check if this condition already has an output connection to an action
  const hasActionOutput = edges.some(e => 
    e.source === id && 
    (getNode(e.target)?.type === NodeType.ACTION ||
     getNode(e.target)?.type === NodeType.ACTION_GROUP)
  );

  return (
    <div className="drawflow-node condition">
      <Handle
        type="target"
        position={Position.Left}
        id="condition-input"
        className="node-input-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--condition">
        <span className="node-icon"><ConditionIcon /></span> Condition
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">
          <ClearIcon size={14} />
        </button>
      </div>
      <div className="node-body">
        <FormField 
          label="Field" 
          hint={getFieldTooltip('field')}
        >
          <TextInput
            value={data.field || ''}
            onChange={(val) => data.onChange(val as string, NodeField.FIELD)}
            placeholder="data.amount"
          />
        </FormField>
        
        <FormField 
          label="Operator"
          hint={getOperatorDescription(data.operator) || 'Select comparison operator'}
        >
          <SelectInput
            value={data.operator || 'EQ'}
            options={OPERATOR_OPTIONS}
            onChange={(val) => data.onChange(val as ComparisonOperator, NodeField.OPERATOR)}
          />
        </FormField>
        
        <FormField 
          label="Value"
          hint={getFieldTooltip('value')}
        >
          <TextInput
            value={data.value || ''}
            onChange={(val) => data.onChange(val as string, NodeField.VALUE)}
            placeholder="100"
          />
        </FormField>
      </div>
      
        <Handle
          type="source"
          position={Position.Right}
          id="condition-output"
          className="node-output-handle"
          style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
          title="Connect to action or next condition"
        />

    </div>
  );
}
