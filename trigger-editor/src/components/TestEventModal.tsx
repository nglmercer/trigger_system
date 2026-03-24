import * as React from 'react';
import { useState, useEffect } from 'react';
import { Modal } from './Modal.tsx';
import { CheckCircleIcon, CodeIcon } from './Icons.tsx';
import { useTranslation } from 'react-i18next';
import { useAlert } from './Alert.tsx';
import type { ImportEntry } from './ImportList.tsx';

interface TestEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  importEntry: ImportEntry | null;
}

export function TestEventModal({ isOpen, onClose, importEntry }: TestEventModalProps) {
  const { t } = useTranslation();
  const { success, error } = useAlert();
  const [eventName, setEventName] = useState(importEntry?.alias || '');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (isOpen && importEntry) {
      if (typeof importEntry.data.event === 'string') {
        setEventName(importEntry.data.event);
        setCount(Object.keys(importEntry.data).length);
      } else {
        setEventName(importEntry.filename || 'test_event');
        setCount(Object.keys(importEntry.data).length);
      }
    }
  }, [isOpen, importEntry]);

  const handleRunTest = async () => {
    if (!importEntry) return;

    setLoading(true);
    try {
      const dataPayload = (importEntry.data.data ? importEntry.data.data : importEntry.data) as Record<string, any>;
      const varsPayload = (importEntry.data.vars ? importEntry.data.vars : {}) as Record<string, any>;
      const statePayload = (importEntry.data.state ? importEntry.data.state : {}) as Record<string, any>;

      success(t('importList.runningTest', 'Simulating execution...'));
      const result = await window.triggerEditor?.testEvent?.(
        eventName,
        dataPayload,
        varsPayload,
        statePayload
      );

      console.log('[Test Execution Result]', result);

      if (result?.error) {
        error("Failed: " + result.error);
      } else {
        success("Execution completed! Check DevTools console.");
        onClose();
      }
    } catch (e) {
      error("Execution failed: " + e);
    } finally {
      setLoading(false);
    }
  };

  if (!importEntry) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('importList.testSimulationTitle', 'Simulate engine with this data payload')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '400px' }}>
        
        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {t('importList.dataSource', 'Data Source')}: {importEntry.alias}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {t('importList.usingElements', 'Using {count} root elements from the payload.', { count: count })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
           {t('importList.eventName', 'Event Name')}
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. USER_REGISTERED"
            style={{
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 600
            }}
          />
        </div>

        <button
          onClick={handleRunTest}
          disabled={loading || !eventName.trim()}
          style={{
            marginTop: '8px',
            background: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading || !eventName.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !eventName.trim() ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Running...' : (
            <>▶ {t('importList.runTest', 'Test')}</>
          )}
        </button>
      </div>
    </Modal>
  );
}
