import * as React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { EventNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';

export default function EventNode({ data }: { data: EventNodeData }) {
  return (
    <div className="drawflow-node event">
      <div className="node-title node-title--event">
        <span className="node-icon">◈</span> Event Trigger
      </div>
      <div className="node-body">
        <label className="node-label">Rule ID</label>
        <input
          type="text"
          className="node-input"
          placeholder="e.g. payout-rule-1"
          value={data.id || ''}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.ID)}
        />
        
        <label className="node-label">Display Name</label>
        <input
          type="text"
          className="node-input"
          placeholder="My Amazing Rule"
          value={data.name || ''}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.NAME)}
        />

        <label className="node-label">Event Name</label>
        <input
          type="text"
          className="node-input"
          placeholder="e.g. PAYMENT_RECEIVED"
          value={data.event || ''}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.EVENT)}
        />
        
        <label className="node-label">Description</label>
        <textarea
          className="node-textarea"
          placeholder="What does this rule do?"
          value={data.description || ''}
          onChange={(evt) => data.onChange(evt.target.value, NodeField.DESCRIPTION)}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="node-output"
        style={{ background: 'var(--event-color)', border: '2px solid var(--bg-color)', width: '12px', height: '12px' }}
      />
    </div>
  );
}
