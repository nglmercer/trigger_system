import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal.tsx';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const { t } = useTranslation();

  const shortcutList = [
    { label: t('shortcuts.delete'), keys: t('shortcuts.deleteKeys') },
    { label: t('shortcuts.multiSelect'), keys: t('shortcuts.multiSelectKeys') },
    { label: t('shortcuts.pan'), keys: t('shortcuts.panKeys') },
    { label: t('shortcuts.zoom'), keys: t('shortcuts.zoomKeys') },
    { label: t('shortcuts.copy'), keys: t('shortcuts.copyKeys') },
    { label: t('shortcuts.paste'), keys: t('shortcuts.pasteKeys') },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shortcuts.title')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {shortcutList.map((s, i) => (
          <div 
            key={i} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{s.label}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {s.keys.split('+').map((key, ki) => (
                <React.Fragment key={ki}>
                  <kbd 
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      boxShadow: '0 2px 0 var(--border)',
                      minWidth: '24px',
                      textAlign: 'center',
                      display: 'inline-block'
                    }}
                  >
                    {key.trim()}
                  </kbd>
                  {ki < s.keys.split('+').length - 1 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>+</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
