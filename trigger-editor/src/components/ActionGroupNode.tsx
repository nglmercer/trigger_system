import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { ActionGroupNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';

export default function ActionGroupNode({ id, data }: { id: string, data: ActionGroupNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node action-group">
      <Handle
        type="target"
        position={Position.Left}
        className="node-input-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
      <div className="node-title node-title--action">
        <span className="node-icon">📦</span> Action Group
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">✕</button>
      </div>
      <div className="node-body">
        <label className="node-label">Execution Mode</label>
        <select
          className="node-input"
          value={data.mode || 'ALL'}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.MODE)}
        >
          <option value="ALL">ALL (Run all)</option>
          <option value="EITHER">EITHER (Run one randomly)</option>
          <option value="SEQUENCE">SEQUENCE (Run in order)</option>
        </select>
        <div className="node-hint" style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
          Connect actions to the output to group them.
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="node-output-handle"
        style={{ background: 'var(--action-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
