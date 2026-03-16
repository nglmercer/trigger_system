import * as React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { EventNodeData } from '../types.ts';
import { NodeField } from '../constants.ts';

export default function EventNode({ id, data }: { id: string, data: EventNodeData }) {
  const { deleteElements } = useReactFlow();

  return (
    <div className="drawflow-node event">
      <div className="node-title node-title--event">
        <span className="node-icon">◈</span> Event Trigger
        <button className="node-delete" onClick={() => deleteElements({ nodes: [{ id }] })} title="Delete node">✕</button>
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

        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <label className="node-label">Priority</label>
            <input
              type="number"
              className="node-input"
              value={data.priority || 0}
              onChange={(evt) => data.onChange(parseInt(evt.target.value) || 0, NodeField.PRIORITY)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
            <input
              type="checkbox"
              style={{ width: 'auto' }}
              checked={data.enabled !== false}
              onChange={(evt) => data.onChange(evt.target.checked, 'enabled')}
            />
            <label className="node-label" style={{ margin: 0 }}>Enabled</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <div style={{ flex: 1 }}>
            <label className="node-label">Cooldown (ms)</label>
            <input
              type="number"
              className="node-input"
              placeholder="0"
              value={data.cooldown || 0}
              onChange={(evt) => data.onChange(parseInt(evt.target.value) || 0, 'cooldown')}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="node-label">Tags (comma separated)</label>
            <input
              type="text"
              className="node-input"
              placeholder="tag1, tag2"
              value={data.tags?.join(', ') || ''}
              onChange={(evt) => data.onChange(evt.target.value.split(',').map(s => s.trim()).filter(Boolean), 'tags')}
            />
          </div>
        </div>
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
