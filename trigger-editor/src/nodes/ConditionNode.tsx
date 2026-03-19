import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ConditionNodeData } from '../types';
import { NodeField, NodeType } from '../constants';
import { getOperatorOptions, getOperatorDescription, getFieldTooltip } from '../shared-constants';
import { ClearIcon, IfIcon } from '../components/Icons';
import { TextInput, SelectInput, FormField } from '../components/FormFields';
import type { ComparisonOperator } from '../../../src/types';

const OPERATOR_OPTIONS = getOperatorOptions();

export default function ConditionNode({ id, data }: { id: string, data: ConditionNodeData }) {
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if output is connected to another condition (chaining)
  const hasConditionChain = edges.some(e => 
    e.source === id && 
    e.sourceHandle === 'output' &&
    getNode(e.target)?.type === NodeType.CONDITION
  );

  // Check if output is connected to DoNode (DO path)
  const hasDoOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === 'output' &&
    getNode(e.target)?.type === NodeType.DO &&
    getNode(e.target)?.data?.branchType === 'do'
  );

  // Check if output is connected to DoNode (ELSE path)
  const hasElseOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === 'output' &&
    getNode(e.target)?.type === NodeType.DO &&
    getNode(e.target)?.data?.branchType === 'else'
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
        <span className="node-icon"><IfIcon /></span> Condition
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
            autocompleteMode="value"
            primitiveOnly={true}
          />
        </FormField>
      </div>
      
      {/* Single output handle - for chaining conditions, DO/ELSE path, or actions */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="node-output-handle"
        style={{ 
          background: 'var(--condition-color)', 
          border: '2px solid var(--bg-color)', 
          width: '12px', 
          height: '12px',
          top: '50%'
        }}
        title={hasConditionChain ? 'Connect to next condition' : hasDoOutput || hasElseOutput ? 'DO/ELSE path configured' : 'Connect to DO/ELSE node, action, or next condition'}
      />

    </div>
  );
}
