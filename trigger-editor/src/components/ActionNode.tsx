import { Handle, Position } from '@xyflow/react';
import type { ActionNodeData } from '../types.ts';

export default function ActionNode({ data }: { data: ActionNodeData }) {
  return (
    <div className="drawflow-node action">
      <Handle
        type="target"
        position={Position.Left}
        className="node-input-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--action">
        <span className="node-icon">⚡</span> Action
      </div>
      <div className="node-body">
        <label className="node-label">Action Type</label>
        <input
          type="text"
          className="node-input"
          placeholder="log_event"
          value={data.type || ''}
          onChange={(evt) => data.onChange(evt.target.value, 'type')}
        />
        <label className="node-label">Params (JSON)</label>
        <textarea
          className="node-textarea"
          placeholder="{}"
          value={data.params || '{}'}
          onChange={(evt) => data.onChange(evt.target.value, 'params')}
        ></textarea>
      </div>
    </div>
  );
}
