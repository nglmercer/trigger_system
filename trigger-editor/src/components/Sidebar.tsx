import * as React from 'react';
import { useState } from 'react';
import { NodeType, DRAG_DATA_FORMAT } from '../constants.ts';
import { EventIcon, ConditionIcon, ConditionGroupIcon, ActionIcon, ActionGroupIcon, ChevronIcon, GridIcon, PlayIcon, ClearIcon, DatabaseIcon, SettingsIcon } from './Icons.tsx';
import { Modal } from './Modal.tsx';
import { ImportList } from './ImportList.tsx';

interface SidebarProps {
  onPlay: () => void;
  onClear: () => void;
}

export default function Sidebar({ onPlay, onClear }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData(DRAG_DATA_FORMAT, nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
          title="Open Components"
        >
          <GridIcon />
        </button>
      )}

      <aside 
        className="panel sidebar" 
        style={{ 
          width: isOpen ? '300px' : '0px', 
          flexShrink: 0, 
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          position: 'relative',
          zIndex: 999
        }}
      >
        <div className="sidebar-header" style={{ padding: isOpen ? '18px 20px' : '0', opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h1 className="sidebar-title">Components</h1>
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
              title="Hide Sidebar"
            >
              <ChevronIcon direction="left" />
            </button>
          </div>
          <p className="sidebar-subtitle">Drag onto canvas</p>
        </div>

        {isOpen && (
          <>
            <div className="drag-group">
              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.EVENT)}>
                <span className="drag-icon drag-icon--event"><EventIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">Event Trigger</span>
                  <span className="drag-desc">Starts the rule</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.CONDITION)}>
                <span className="drag-icon drag-icon--condition"><ConditionIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">Condition</span>
                  <span className="drag-desc">Filter by field value</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.CONDITION_GROUP)}>
                <span className="drag-icon drag-icon--condition"><ConditionGroupIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">Condition Group</span>
                  <span className="drag-desc">AND / OR logical group</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.ACTION)}>
                <span className="drag-icon drag-icon--action"><ActionIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">Action</span>
                  <span className="drag-desc">Execute a handler</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.ACTION_GROUP)}>
                <span className="drag-icon drag-icon--action"><ActionGroupIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">Action Group</span>
                  <span className="drag-desc">Group of actions</span>
                </div>
              </div>
            </div>

            <div className="sidebar-divider"></div>
            
            {/* Data Imports Section - Opens Modal */}
            <div style={{ padding: '0 20px', marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <DatabaseIcon size={14} />
                  Data Imports
                </span>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px'
                  }}
                >
                  <SettingsIcon size={12} /> Config
                </button>
              </div>
              
              {/* Quick info card */}
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <DatabaseIcon size={16} />
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: 500, 
                    color: 'var(--text-primary)'
                  }}>
                    Configure JSON Data
                  </span>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5'
                }}>
                  Load unlimited JSON files to use in condition values and action types with autocomplete.
                </div>
              </div>
            </div>

            <div className="sidebar-footer">
              <button 
                className="btn btn-primary" 
                onClick={onPlay} 
                style={{ marginBottom: '8px', background: 'var(--condition-color)' }}
              >
                <PlayIcon /> Play / Test
              </button>
              <button id="btn-clear" className="btn btn-secondary" onClick={onClear} style={{ marginTop: '8px' }}>
                <ClearIcon /> Clear
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Import Configuration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Data Imports"
      >
        <ImportList />
      </Modal>
    </>
  );
}
