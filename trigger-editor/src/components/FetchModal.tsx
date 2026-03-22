import * as React from 'react';
import { useState } from 'react';
import { Modal } from './Modal.tsx';
import { DatabaseIcon, PlusIcon, XCircleIcon, CheckCircleIcon } from './Icons.tsx';
import { useAlert } from './Alert.tsx';
import { useTranslation } from 'react-i18next';

interface FetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFetch: (url: string, headers?: Record<string, string>) => Promise<void>;
}

export function FetchModal({ isOpen, onClose, onFetch }: FetchModalProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const { error } = useAlert();

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleFetch = async () => {
    if (!url) {
      error(t('fetchModal.urlRequired'));
      return;
    }
    
    setLoading(true);
    try {
      const headerObj: Record<string, string> = {};
      headers.forEach(h => {
        if (h.key && h.value) headerObj[h.key] = h.value;
      });
      await onFetch(url, headerObj);
      onClose();
    } catch (e) {
      error(e instanceof Error ? e.message : t('fetchModal.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('fetchModal.title')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {t('fetchModal.getUrl')}
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/data.json"
            style={{
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {t('fetchModal.headersOptional')}
            </label>
            <button
              onClick={handleAddHeader}
              style={{
                fontSize: '11px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {t('fetchModal.addHeader')}
            </button>
          </div>
          
          {headers.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={t('fetchModal.keyPlaceholder')}
                value={h.key}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[i]!.key = e.target.value;
                  setHeaders(newHeaders);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              <input
                type="text"
                placeholder={t('fetchModal.valuePlaceholder')}
                value={h.value}
                onChange={(e) => {
                  const newHeaders = [...headers];
                  newHeaders[i]!.value = e.target.value;
                  setHeaders(newHeaders);
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={() => handleRemoveHeader(i)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <XCircleIcon size={18} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleFetch}
          disabled={loading}
          style={{
            marginTop: '8px',
            background: 'var(--action-color)',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? t('fetchModal.fetching') : (
            <>
              <DatabaseIcon size={16} /> {t('fetchModal.loadData')}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
