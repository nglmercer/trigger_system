import * as React from 'react';
import { useState } from 'react';
import { NodeType, DRAG_DATA_FORMAT } from '../constants.ts';
import { ConditionGroupIcon, ActionIcon, ActionGroupIcon, ChevronIcon, GridIcon, ClearIcon, DatabaseIcon, SettingsIcon, DownloadIcon, UploadIcon, DoIcon } from './Icons.tsx';
import { IfIcon, StarIcon } from './Icons.tsx';
import { Modal } from './Modal.tsx';
import { ImportList } from './ImportList.tsx';
import { ExchangeModals } from './ExchangeModals.tsx';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  onClear: () => void;
  onExportJson: () => void;
  onExportYaml: () => void;
  onImport: () => void;
  onImportYaml: () => void;
  onShare: () => void;
  hasNodes: boolean;
}

export default function Sidebar({ onClear, onExportJson, onExportYaml, onImport, onImportYaml, onShare, hasNodes }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { t, i18n } = useTranslation();
  
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
          title={t('sidebar.components')}
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
            <h1 className="sidebar-title">{t('sidebar.components')}</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                value={i18n.language} 
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  borderRadius: '4px',
                  padding: '2px 4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <option value="en">EN</option>
                <option value="es">ES</option>
              </select>
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
          </div>
          <p className="sidebar-subtitle">{t('sidebar.dragCanvas')}</p>
        </div>

        {isOpen && (
          <>
            <div className="drag-group">
              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.EVENT)}>
                <span className="drag-icon drag-icon--event"><StarIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">{t('sidebar.nodes.eventTrigger')}</span>
                  <span className="drag-desc">{t('sidebar.nodes.startsRule')}</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.CONDITION_GROUP)}>
                <span className="drag-icon drag-icon--condition-group"><ConditionGroupIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">{t('sidebar.nodes.conditionGroup')}</span>
                  <span className="drag-desc">{t('sidebar.nodes.logicalGroup')}</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.CONDITION)}>
                <span className="drag-icon drag-icon--condition"><IfIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">{t('sidebar.nodes.condition')}</span>
                  <span className="drag-desc">{t('sidebar.nodes.filterFieldValue')}</span>
                </div>
              </div>
              
              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.DO)}>
                <span className="drag-icon drag-icon--do"><DoIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">{t('sidebar.nodes.do')}</span>
                  <span className="drag-desc">{t('sidebar.nodes.explicitThenPath')}</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.ACTION_GROUP)}>
                <span className="drag-icon drag-icon--action-group"><ActionGroupIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">{t('sidebar.nodes.actionGroup')}</span>
                  <span className="drag-desc">{t('sidebar.nodes.groupActions')}</span>
                </div>
              </div>

              <div className="drag-item" draggable onDragStart={(e) => onDragStart(e, NodeType.ACTION)}>
                <span className="drag-icon drag-icon--action"><ActionIcon /></span>
                <div className="drag-info">
                  <span className="drag-name">{t('sidebar.nodes.action')}</span>
                  <span className="drag-desc">{t('sidebar.nodes.executeHandler')}</span>
                </div>
              </div>

            </div>

            <div className="sidebar-divider"></div>
            
            {/* Context Data Section */}
            <div style={{ padding: '0 20px', marginBottom: '24px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <DatabaseIcon size={12} /> {t('sidebar.dataContext')}
                </span>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    background: 'rgba(88, 166, 255, 0.1)',
                    border: '1px solid rgba(88, 166, 255, 0.2)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                  title="Configure definitions for autocomplete and hover"
                >
                  <SettingsIcon size={12} /> {t('sidebar.config')}
                </button>
              </div>
              <div style={{
                background: 'linear-gradient(180deg, rgba(48, 54, 61, 0.2) 0%, rgba(48, 54, 61, 0.4) 100%)',
                borderRadius: '10px',
                padding: '12px',
                border: '1px solid var(--border)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                {t('sidebar.loadExternalJson')}
              </div>
            </div>

            <div className="sidebar-footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={!hasNodes}
                  style={{ flex: 1 }}
                >
                  <DownloadIcon size={14} /> {t('sidebar.export')}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setIsImportModalOpen(true)}
                  style={{ flex: 1 }}
                >
                  <UploadIcon size={14} /> {t('sidebar.import')}
                </button>
              </div>

              <div className="sidebar-divider" style={{ margin: '12px 0 8px 0' }}></div>
              
              <button id="btn-clear" className="btn btn-secondary" onClick={onClear} style={{ fontSize: '11px', marginTop: '4px' }}>
                <ClearIcon size={13} /> {t('sidebar.resetCanvas')}
              </button>
            </div>
          </>
        )}
      </aside>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={t('sidebar.dataContext')}
      >
        <ImportList />
      </Modal>

      <ExchangeModals 
        isImportOpen={isImportModalOpen}
        isExportOpen={isExportModalOpen}
        onCloseImport={() => setIsImportModalOpen(false)}
        onCloseExport={() => setIsExportModalOpen(false)}
        onImportJson={onImport}
        onImportYaml={onImportYaml}
        onExportJson={onExportJson}
        onExportYaml={onExportYaml}
        onShare={onShare}
      />
    </>
  );
}
