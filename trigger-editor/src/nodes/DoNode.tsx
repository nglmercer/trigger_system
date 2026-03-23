import * as React from 'react';
import { Handle, Position, useReactFlow, useEdges } from '@xyflow/react';
import type { DoNodeData } from '../types';
import { NodeField, NodeType, NodeHandle, BranchType } from '../constants';

const BRANCH_OPTIONS = [
  { value: BranchType.DO, label: 'DO (then)' },
  { value: BranchType.ELSE, label: 'ELSE' },
];
import { ClearIcon, DoIcon, ElseIcon, CopyIcon } from '../components/Icons';
import { SelectInput, FormField } from '../components/inputs/FormFields';



/**
 * DoNode - Explicit DO path for complex condition branches
 * 
 * This node provides explicit control over the "then" branch of a condition
 * when the implicit connection is not sufficient (e.g., complex nesting).
 * 
 * By default, condition -> action/action_group is implicit DO,
 * but for more complex cases, you can explicitly use a DO node.
 * 
 * Also supports "after do allow conditions" - connecting to Condition nodes
 * for inline conditional actions within the DO branch.
 */
import { useTranslation } from 'react-i18next';

export default function DoNode({ id, data }: { id: string, data: DoNodeData }) {
  const { t } = useTranslation();
  const { deleteElements, getNode } = useReactFlow();
  const edges = useEdges();
  
  // Check if this DoNode has incoming connection from Condition
  // Accepts from Condition via output handle
  const hasConditionInput = edges.some(e => 
    e.target === id &&
    (
      (getNode(e.source)?.type === NodeType.CONDITION && e.sourceHandle === NodeHandle.CONDITION_OUTPUT) ||
      (getNode(e.source)?.type === NodeType.CONDITION_GROUP) ||
      (getNode(e.source)?.type === NodeType.ACTION_GROUP) ||
      (getNode(e.source)?.type === NodeType.EVENT)
    )
  );
  
  // Check if DoNode has outgoing connections to Actions or ActionGroups
  const hasActionOutput = edges.some(e => 
    e.source === id && 
    (getNode(e.target)?.type === NodeType.ACTION ||
     getNode(e.target)?.type === NodeType.ACTION_GROUP)
  );
  
  // Check if DoNode has outgoing connection to Condition (for "after do allow conditions")
  const hasConditionOutput = edges.some(e => 
    e.source === id && 
    e.sourceHandle === NodeHandle.DO_CONDITION_OUTPUT &&
    getNode(e.target)?.type === NodeType.CONDITION
  );
  
  // Determine colors based on branch type
  const isElse = data.branchType === BranchType.ELSE;
  
  // Show outputs when there's input connection
  const showOutput = hasConditionInput;
  const showConditionOutput = hasConditionInput; // Show condition output handle when there's input
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
        <>
          {/* Action output handle */}
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
          {/* Condition output handle - for "after do allow conditions" */}
          <Handle
            type="source"
            position={Position.Right}
            id={NodeHandle.DO_CONDITION_OUTPUT}
            className="node-output-handle"
            style={{ 
              background: 'var(--condition-color)', 
              border: '2px solid var(--bg-color)', 
              width: '12px', 
              height: '12px',
              top: '60%'
            }}
            title={hasConditionOutput ? 'Condition connected' : 'Add condition after DO (inline if/then/else)'}
          />
        </>
      )}
      
      <div className="node-title node-title--do">
        <span className="node-icon">{isElse ? <ElseIcon /> : <DoIcon />}</span> 
        {isElse ? t('nodeDetails.elseTitle') : t('nodeDetails.doTitle')}
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
        <FormField label={t('nodeDetails.branchType')}>
          <SelectInput
            value={data.branchType || 'do'}
            options={BRANCH_OPTIONS.map(opt => ({
              ...opt,
              label: opt.value === BranchType.DO ? t('nodeDetails.doTitle') + ' (then)' : t('nodeDetails.elseTitle')
            }))}
            onChange={(val) => data.onChange(val as BranchType, NodeField.BRANCH_TYPE)}
          />
        </FormField>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          {hasConditionInput 
            ? (hasActionOutput || hasConditionOutput 
              ? t('nodeHints.doPathConfigured', { branch: isElse ? t('nodeDetails.elseTitle') : t('nodeDetails.doTitle') }) 
              : t('nodeHints.doConnectPath'))
            : t('nodeHints.doConnectStart')}
        </div>
      </div>
    </div>
  );
}
