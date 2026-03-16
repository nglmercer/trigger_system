import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ConditionNodeData } from '../types.ts';
import { NodeField, NodeType } from '../constants.ts';
import { ClearIcon, ConditionIcon } from './Icons.tsx';
import { TextInput, SelectInput, FormField } from './FormFields.tsx';
import type { ComparisonOperator } from '../../../src/types';

const OPERATOR_OPTIONS = [
  { value: 'EQ', label: 'Equals (==)' },
  { value: 'NEQ', label: 'Not Equals (!=)' },
  { value: 'GT', label: 'Greater Than (>)' },
  { value: 'GTE', label: 'Greater Than or Equal (>=)' },
  { value: 'LT', label: 'Less Than (<)' },
  { value: 'LTE', label: 'Less Than or Equal (<=)' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'NOT_CONTAINS', label: 'Not Contains' },
  { value: 'STARTS_WITH', label: 'Starts With' },
  { value: 'ENDS_WITH', label: 'Ends With' },
];

export default function ConditionNode({ id, data }: { id: string, data: ConditionNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Detection logic to hide "next" handle if part of a group
  const isPartofGroup = edges.some(e => {
    const sourceNode = getNode(e.source);
    return e.target === id && sourceNode?.type === NodeType.CONDITION_GROUP;
  });

  return (
    <div className="drawflow-node condition">
      <Handle
        type="target"
        position={Position.Left}
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
        <FormField label="Field">
          <TextInput
            value={data.field || ''}
            onChange={(val) => data.onChange(val as string, NodeField.FIELD)}
            placeholder="data.amount"
          />
        </FormField>
        
        <FormField label="Operator">
          <SelectInput
            value={data.operator || 'EQ'}
            options={OPERATOR_OPTIONS}
            onChange={(val) => data.onChange(val as ComparisonOperator, NodeField.OPERATOR)}
          />
        </FormField>
        
        <FormField label="Value">
          <TextInput
            value={data.value || ''}
            onChange={(val) => data.onChange(val as string, NodeField.VALUE)}
            placeholder="100"
          />
        </FormField>
      </div>
      {!isPartofGroup && (
        <Handle
          type="source"
          position={Position.Right}
          className="node-output-handle"
          style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
        />
      )}
    </div>
  );
}
