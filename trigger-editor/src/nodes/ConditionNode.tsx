import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { ConditionNodeData } from '../types';
import { NodeField, NodeType, NodeHandle, BranchType } from '../constants';
import { getOperatorOptions, getOperatorDescription, getFieldTooltip } from '../shared-constants';
import { ClearIcon, IfIcon, CopyIcon } from '../components/Icons';
import { TextInput, SelectInput, FormField } from '../components/inputs/FormFields';
import type { ComparisonOperator } from '../../../src/types';
import { useTranslation } from 'react-i18next';

const OPERATOR_OPTIONS = getOperatorOptions();

export default function ConditionNode({ id, data }: { id: string, data: ConditionNodeData }) {
  const { t } = useTranslation();
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if output is connected to another condition (chaining)
  const hasConditionChain = edges.some(e => 
    e.source === id && 
    e.sourceHandle === NodeHandle.CONDITION_OUTPUT &&
    getNode(e.target)?.type === NodeType.CONDITION
  );

  // Check if output is connected to DoNode (DO path)
  const hasDoOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === NodeHandle.CONDITION_OUTPUT &&
    getNode(e.target)?.type === NodeType.DO &&
    getNode(e.target)?.data?.branchType === BranchType.DO
  );

  // Check if output is connected to DoNode (ELSE path)
  const hasElseOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === NodeHandle.CONDITION_OUTPUT &&
    getNode(e.target)?.type === NodeType.DO &&
    getNode(e.target)?.data?.branchType === BranchType.ELSE
  );

  return (
    <div className="drawflow-node condition">
      <Handle
        type="target"
        position={Position.Left}
        id={NodeHandle.CONDITION_INPUT}
        className="node-input-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--condition">
        <span className="node-icon"><IfIcon /></span> {t('nodeDetails.conditionTitle')}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button 
            className="node-delete" 
            onClick={(e) => { e.stopPropagation(); data.onDuplicate(); }} 
            title={t('nodeDetails.duplicateNode', 'Duplicate Node')}
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <CopyIcon size={14} />
          </button>
          <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title={t('nodeDetails.deleteNode')}>
            <ClearIcon size={14} />
          </button>
        </div>
      </div>
      <div className="node-body">
        <FormField 
          label={t('nodeDetails.field')} 
          hint={getFieldTooltip('field')}
        >
          <TextInput
            value={data.field || ''}
            onChange={(val) => data.onChange(val as string, NodeField.FIELD)}
            placeholder={t('nodeDetails.fieldPlaceholder')}
          />
        </FormField>
        
        <FormField 
          label={t('nodeDetails.operator')}
          hint={getOperatorDescription(data.operator) || t('nodeDetails.operatorHint')}
        >
          <SelectInput
            value={data.operator || 'EQ'}
            options={OPERATOR_OPTIONS}
            onChange={(val) => data.onChange(val as ComparisonOperator, NodeField.OPERATOR)}
          />
        </FormField>
        
        <FormField 
          label={t('nodeDetails.value')}
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
        id={NodeHandle.CONDITION_OUTPUT}
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
