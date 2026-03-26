import * as React from 'react';
import { Modal } from './Modal.tsx';
import { DownloadIcon, UploadIcon, ShareIcon, CodeIcon } from './Icons.tsx';
import { useTranslation } from 'react-i18next';
export const EXPORT_CLICKED = 'TRIGGER_EDITOR_EXPORT_CLICKED';
interface ExchangeModalsProps {
  isImportOpen: boolean;
  isExportOpen: boolean;
  onCloseImport: () => void;
  onCloseExport: () => void;
  onImportJson: () => void;
  onImportYaml: () => void;
  onImportNodesOnly: () => void;
  onExportJson: () => void;
  onExportYaml: () => void;
  onExportSelected: () => void;
  onShare: () => void;
  handleHostExport: () => void;
  hasSelectedNodes?: boolean;
}

export function ExchangeModals({
  isImportOpen,
  isExportOpen,
  onCloseImport,
  onCloseExport,
  onImportJson,
  onImportYaml,
  onImportNodesOnly,
  onExportJson,
  onExportYaml,
  onExportSelected,
  onShare,
  handleHostExport,
  hasSelectedNodes
}: ExchangeModalsProps) {
  const { t } = useTranslation();
  
  return (
    <>
      {/* Import Selection Modal */}
      <Modal 
        isOpen={isImportOpen} 
        onClose={onCloseImport} 
        title={t('exchangeModals.importTitle')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div 
            onClick={() => { onImportJson(); onCloseImport(); }}
            style={cardStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(88, 166, 255, 0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          >
            <div style={{ ...iconBoxStyle, background: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent)' }}>
              <UploadIcon size={24} />
            </div>
            <div>
              <div style={cardTitleStyle}>{t('exchangeModals.jsonTitle')}</div>
              <div style={cardDescStyle}>{t('exchangeModals.jsonDesc')}</div>
            </div>
          </div>

          <div 
            onClick={() => { onImportYaml(); onCloseImport(); }}
            style={cardStyle}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--do-color)'; e.currentTarget.style.background = 'rgba(155, 89, 182, 0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          >
            <div style={{ ...iconBoxStyle, background: 'rgba(155, 89, 182, 0.1)', color: 'var(--do-color)' }}>
              <CodeIcon size={24} />
            </div>
            <div>
              <div style={cardTitleStyle}>{t('exchangeModals.yamlTitle')}</div>
              <div style={cardDescStyle}>{t('exchangeModals.yamlDesc')}</div>
            </div>
          </div>

          <div
            onClick={() => { onImportNodesOnly(); onCloseImport(); }}
            style={{ ...cardStyle, gridColumn: 'span 2' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--condition-color)'; e.currentTarget.style.background = 'rgba(46, 204, 113, 0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
          >
            <div style={{ ...iconBoxStyle, background: 'rgba(46, 204, 113, 0.1)', color: 'var(--condition-color)' }}>
              <DownloadIcon size={24} style={{ transform: 'rotate(180deg)' }} />
            </div>
            <div>
              <div style={cardTitleStyle}>{t('exchangeModals.importNodesTitle')}</div>
              <div style={cardDescStyle}>{t('exchangeModals.importNodesDesc')}</div>
            </div>
          </div>

        </div>
      </Modal>

      {/* Export Selection Modal */}
      <Modal 
        isOpen={isExportOpen} 
        onClose={onCloseExport} 
        title={t('exchangeModals.exportTitle')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => { onExportYaml(); onCloseExport(); }}
            style={actionButtonStyle}
          >
            <DownloadIcon size={20} style={{ color: 'var(--accent)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={buttonTitleStyle}>{t('exchangeModals.downloadYaml')}</div>
              <div style={buttonDescStyle}>{t('exchangeModals.downloadYamlDesc')}</div>
            </div>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => { onExportJson(); onCloseExport(); }}
            style={actionButtonStyle}
          >
            <DownloadIcon size={20} style={{ color: '#ffb900' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={buttonTitleStyle}>{t('exchangeModals.saveJson')}</div>
              <div style={buttonDescStyle}>{t('exchangeModals.saveJsonDesc')}</div>
            </div>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => { onExportSelected(); onCloseExport(); }}
            style={{ ...actionButtonStyle, opacity: hasSelectedNodes ? 1 : 0.5 }}
            disabled={!hasSelectedNodes}
          >
            <DownloadIcon size={20} style={{ color: 'var(--condition-color)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={buttonTitleStyle}>{t('exchangeModals.exportSelectedNodes')}</div>
              <div style={buttonDescStyle}>{t('exchangeModals.exportSelectedNodesDesc')}</div>
            </div>
          </button>

          {(window as any)?.hostIntegration && (
            <button 
              className="btn btn-secondary" 
              onClick={() => { 
                // We'll need the current YAML content, but since we don't have it here directly, 
                // we might need a prop or just rely on the parent listener to respond to a request.
                // However, the note said "implement window methods to enable custom export".
                // Let's assume the parent handles the actual "GET_DATA" request if needed, 
                // or we can pass a callback.
                handleHostExport()
                onCloseExport(); 
              }}
              style={actionButtonStyle}
            >
              <ShareIcon size={20} style={{ color: 'var(--text-primary)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={buttonTitleStyle}>{t('exchangeModals.sendHost')}</div>
                <div style={buttonDescStyle}>{t('exchangeModals.sendHostDesc')}</div>
              </div>
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            onClick={() => { onShare(); onCloseExport(); }}
            style={actionButtonStyle}
          >
            <ShareIcon size={20} style={{ color: '#2ecc71' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={buttonTitleStyle}>{t('exchangeModals.shareLink')}</div>
              <div style={buttonDescStyle}>{t('exchangeModals.shareLinkDesc')}</div>
            </div>
          </button>
        </div>
      </Modal>
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)', 
  border: '1px solid var(--border)', 
  borderRadius: '12px', 
  padding: '24px 20px', 
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  transition: 'all 0.2s',
  textAlign: 'center',
  alignItems: 'center'
};

const iconBoxStyle: React.CSSProperties = {
  width: '40px', 
  height: '40px', 
  borderRadius: '10px', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center'
};

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 600, 
  color: 'var(--text-primary)', 
  marginBottom: '4px'
};

const cardDescStyle: React.CSSProperties = {
  fontSize: '11px', 
  color: 'var(--text-secondary)'
};

const actionButtonStyle: React.CSSProperties = {
  justifyContent: 'flex-start', 
  padding: '16px', 
  gap: '15px', 
  border: '1px solid var(--border)', 
  borderRadius: '12px',
  background: 'var(--bg-secondary)'
};

const buttonTitleStyle: React.CSSProperties = {
  color: 'var(--text-primary)', 
  fontWeight: 600
};

const buttonDescStyle: React.CSSProperties = {
  fontSize: '11px', 
  color: 'var(--text-secondary)', 
  fontWeight: 400
};
