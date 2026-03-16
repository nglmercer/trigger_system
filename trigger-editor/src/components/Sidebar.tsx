import * as React from 'react';
import { NodeType, DRAG_DATA_FORMAT } from '../constants.ts';

interface SidebarProps {
  onPlay: () => void;
  onClear: () => void;
}

export default function Sidebar({ onPlay, onClear }: SidebarProps) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData(DRAG_DATA_FORMAT, nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="panel sidebar" style={{ width: '300px', flexShrink: 0 }}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">Components</h1>
        <p className="sidebar-subtitle">Drag onto canvas</p>
      </div>

      <div className="drag-group">
        <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.EVENT)}>
          <span className="drag-icon drag-icon--event">◈</span>
          <div className="drag-info">
            <span className="drag-name">Event Trigger</span>
            <span className="drag-desc">Starts the rule</span>
          </div>
        </div>

        <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.CONDITION)}>
          <span className="drag-icon drag-icon--condition">⚖</span>
          <div className="drag-info">
            <span className="drag-name">Condition</span>
            <span className="drag-desc">Filter by field value</span>
          </div>
        </div>

        <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.CONDITION_GROUP)}>
          <span className="drag-icon drag-icon--condition">📂</span>
          <div className="drag-info">
            <span className="drag-name">Condition Group</span>
            <span className="drag-desc">AND / OR logical group</span>
          </div>
        </div>

        <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.ACTION)}>
          <span className="drag-icon drag-icon--action">⚡</span>
          <div className="drag-info">
            <span className="drag-name">Action</span>
            <span className="drag-desc">Execute a handler</span>
          </div>
        </div>

        <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.ACTION_GROUP)}>
          <span className="drag-icon drag-icon--action">📦</span>
          <div className="drag-info">
            <span className="drag-name">Action Group</span>
            <span className="drag-desc">Group of actions</span>
          </div>
        </div>
      </div>

      <div className="sidebar-divider"></div>
      <div className="sidebar-footer">
        <button 
          className="btn btn-primary" 
          onClick={onPlay} 
          style={{ marginBottom: '8px', background: 'var(--condition-color)' }}
        >
          ▶ Play / Test
        </button>
        <button id="btn-clear" className="btn btn-secondary" onClick={onClear}>
          ✕ Clear
        </button>
        <p className="version-label">Trigger System Graphics v2.0</p>
      </div>
    </aside>
  );
}
