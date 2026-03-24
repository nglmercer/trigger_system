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
  
  // Determine colors based on branch type
  const isElse = data.branchType === BranchType.ELSE;
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
      
      {/* Universal output handle for Actions OR Conditions (Smarter Parser) */}
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
        title="Connect to Action, ActionGroup or Condition"
      />
      
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
          {t('nodeHints.doConnectPath')}
        </div>
      </div>
    </div>
  );
}
