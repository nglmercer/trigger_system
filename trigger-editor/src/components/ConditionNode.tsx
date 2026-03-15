import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ConditionNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';

export default function ConditionNode({ data }: { data: ConditionNodeData }) {
  return (
    <div className="drawflow-node condition">
      <Handle
        type="target"
        position={Position.Left}
        className="node-input-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--condition">
        <span className="node-icon">⚖</span> Condition
      </div>
      <div className="node-body">
        <label className="node-label">Field</label>
        <input
          type="text"
          className="node-input"
          placeholder="data.amount"
          value={data.field || ''}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.FIELD)}
        />
        <label className="node-label">Operator</label>
        <select
          className="node-input"
          value={data.operator || 'EQ'}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.OPERATOR)}
        >
          <option value="EQ">Equals (==)</option>
          <option value="NEQ">Not Equals (!=)</option>
          <option value="GT">Greater Than (&gt;)</option>
          <option value="GTE">Greater Than or Equal (&gt;=)</option>
          <option value="LT">Less Than (&lt;)</option>
          <option value="LTE">Less Than or Equal (&lt;=)</option>
          <option value="CONTAINS">Contains</option>
          <option value="NOT_CONTAINS">Not Contains</option>
          <option value="STARTS_WITH">Starts With</option>
          <option value="ENDS_WITH">Ends With</option>
        </select>
        <label className="node-label">Value</label>
        <input
          type="text"
          className="node-input"
          placeholder="100"
          value={data.value || ''}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.VALUE)}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="node-output-handle"
        style={{ background: 'var(--condition-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
