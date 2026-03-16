import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { ConditionGroupNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';

export default function ConditionGroupNode({ id, data }: { id: string, data: ConditionGroupNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node condition-group">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="node-input-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="cond-1"
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '10px', height: '10px', top: '-5px' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="cond-2"
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '10px', height: '10px', bottom: '-5px' }}
      />
      <div className="node-title node-title--condition">
        <span className="node-icon">📂</span> Condition Group
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">✕</button>
      </div>
      <div className="node-body">
        <label className="node-label">Operator</label>
        <select
          className="node-input"
          value={data.operator || 'AND'}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.OPERATOR)}
        >
          <option value="AND">AND (All Must Match)</option>
          <option value="OR">OR (Any Must Match)</option>
        </select>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          Connect top/bottom to child conditions, Right to Actions.
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="action"
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
