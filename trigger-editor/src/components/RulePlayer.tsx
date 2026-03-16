import * as React from 'react';
import { useState } from 'react';
import { RuleEngine } from '../../../src/core/rule-engine-new.ts';
import type { TriggerRule, TriggerResult, TriggerContext, ExecutedAction } from '../../../src/types.ts';

interface RulePlayerProps {
  rule: TriggerRule | null;
  errors: string[];
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_EVENTS = [
  {
    name: 'Request Log',
    event: 'request',
    data: {
      method: 'GET',
      path: '/api/v1/users',
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0'
    }
  },
  {
    name: 'Payment Success',
    event: 'PAYMENT_SUCCESS',
    data: {
      amount: 49.99,
      currency: 'USD',
      userId: 'user_123',
      transactionId: 'tx_555'
    }
  },
  {
    name: 'Error Alert',
    event: 'error',
    data: {
      code: 'DB_CONNECTION_FAILED',
      severity: 'high',
      message: 'Could not connect to database at 10.0.0.5'
    }
  }
];

export default function RulePlayer({ rule, errors, isOpen, onClose }: RulePlayerProps) {
  const [selectedEvent, setSelectedEvent] = useState(DEFAULT_EVENTS[0]!);
  const [customEvent, setCustomEvent] = useState(DEFAULT_EVENTS[0]!.event);
  const [customData, setCustomData] = useState(JSON.stringify(DEFAULT_EVENTS[0]!.data, null, 2));
  const [results, setResults] = useState<TriggerResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const runTest = async () => {
    if (!rule) return;
    setIsRunning(true);
    setResults(null);

    try {
      const engine = new RuleEngine({
        rules: [rule],
        globalSettings: { debugMode: true }
      });

      const data = JSON.parse(customData);
      const result = await engine.processEvent({
        event: customEvent,
        data,
        timestamp: Date.now(),
        vars: {}
      } as TriggerContext);

      setResults(result);
    } catch (e) {
      console.error('Execution error:', e);
      setResults([{
        ruleId: rule?.id || 'unknown',
        success: false,
        executedActions: [],
        error: e as Error
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="player-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="player-modal">
        <div className="player-header">
          <h2 className="player-title">Rule Analytics & Execution</h2>
          <button className="player-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="player-body">
          {errors.length > 0 && (
            <div className="player-section validation-errors">
              <label className="node-label label-error">Graph Validation Errors</label>
              <div className="errors-list">
                {errors.map((err, i) => (
                  <div key={i} className="error-item">
                    <span className="bullet">⚡</span> {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="player-section">
            <label className="node-label">Select Event Scenario</label>
            <div className="event-pills">
              {DEFAULT_EVENTS.map(ev => (
                <button 
                  key={ev.name}
                  className={`event-pill ${selectedEvent.name === ev.name ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setCustomEvent(ev.event);
                    setCustomData(JSON.stringify(ev.data, null, 2));
                  }}
                >
                  {ev.name}
                </button>
              ))}
              <button 
                className={`event-pill ${!DEFAULT_EVENTS.find(e => e.name === selectedEvent.name) ? 'active' : ''}`}
                onClick={() => setSelectedEvent({ name: 'custom', event: customEvent, data: JSON.parse(customData) })}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="player-grid">
            <div className="player-section">
              <label className="node-label">Event Name</label>
              <input
                type="text"
                className="node-input"
                value={customEvent}
                onChange={(e) => setCustomEvent(e.target.value)}
              />
            </div>
          </div>

          <div className="player-section">
            <label className="node-label">Event Payload (data)</label>
            <textarea
              className="node-textarea player-json"
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              spellCheck={false}
            />
          </div>

          <button 
            className={`btn player-run ${isRunning ? 'loading' : ''} ${errors.length > 0 ? 'disabled' : ''}`} 
            onClick={runTest}
            disabled={isRunning || !!errors.length}
          >
            {isRunning ? 'Processing...' : '▶ Execute Action'}
          </button>

          {results && (
            <div className="player-results">
              <label className="node-label">Live Trace Execution</label>
              <div className="results-container">
                {results.length === 0 ? (
                  <div className="result-item skip">
                    <span className="result-icon">⚪</span>
                    <span className="result-text">Rules evaluated but none matched filters.</span>
                  </div>
                ) : (
                  results.map((r, i) => (
                    <div key={i} className={`result-rule ${r.success ? 'success' : 'fail'}`}>
                      <div className="result-header">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>ID: {r.ruleId}</strong>
                          {r.error && <span className="error-msg">{String(r.error)}</span>}
                        </div>
                        <span className={`badge ${r.success ? 'success' : 'fail'}`}>
                          {r.success ? 'Rule Matched' : 'Rule Failed'}
                        </span>
                      </div>
                      
                      <div className="executed-actions">
                        {r.executedActions.map((act: ExecutedAction, ai: number) => {
                          const actionId = `act-${i}-${ai}`;
                          const isExpanded = expandedAction === actionId;
                          
                          return (
                            <div key={ai} className="action-trace" onClick={() => setExpandedAction(isExpanded ? null : actionId)}>
                              <div className="action-summary">
                                <span className={`action-status ${act.error !== undefined ? 'err' : 'ok'}`}>
                                  {act.error !== undefined ? '✕' : '✓'}
                                </span>
                                <span className="action-type-name">{act.type}</span>
                                <span className="action-time">{(act as any).duration || 12}ms</span>
                                <span className="chevron">{isExpanded ? '▼' : '▶'}</span>
                              </div>
                              
                              {isExpanded && (
                                <div className="action-details" onClick={(e) => e.stopPropagation()}>
                                  {act.result !== undefined && (
                                    <div className="detail-row">
                                      <label>Output:</label>
                                      <pre>{JSON.stringify(act.result, null, 2)}</pre>
                                    </div>
                                  )}
                                  {act.error !== undefined && (
                                    <div className="detail-row error">
                                      <label>Error:</label>
                                      <pre>{String(act.error)}</pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .player-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .player-modal {
          background: var(--panel-bg);
          border: 1px solid var(--border);
          border-radius: 16px;
          width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          animation: modalIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .player-header {
          padding: 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .player-title {
          margin: 0;
          font-size: 1.2rem;
          color: var(--accent);
        }
        .player-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1.5rem;
        }
        .player-body {
          padding: 20px;
          overflow-y: auto;
        }
        .player-section {
          margin-bottom: 20px;
        }
        .event-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .event-pill {
          background: var(--bg-color);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .event-pill:hover {
          border-color: var(--accent);
        }
        .event-pill.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .player-json {
          height: 120px;
          font-size: 0.75rem;
          margin-top: 10px;
        }
        .player-run {
          margin: 20px 0;
          height: 44px;
          font-size: 1rem;
        }
        .player-run.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
        }
        .validation-errors {
          background: rgba(207, 34, 46, 0.1);
          border: 1px solid #cf222e;
          border-radius: 8px;
          padding: 12px;
        }
        .label-error { color: #cf222e; font-weight: bold; }
        .errors-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
        .error-item { font-size: 0.8rem; color: #ff7b72; display: flex; gap: 8px; }
        .error-item .bullet { color: #cf222e; }

        .action-trace {
          width: 100%;
          background: var(--bg-color);
          border: 1px solid var(--border);
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
        }
        .action-summary {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.85rem;
        }
        .action-status.ok { color: var(--condition-color); }
        .action-status.err { color: #cf222e; }
        .action-type-name { font-weight: 600; flex: 1; }
        .action-time { color: var(--text-muted); font-size: 0.75rem; }
        .action-details {
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-top: 1px solid var(--border);
        }
        .detail-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
        .detail-row label { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); }
        .detail-row pre { margin: 0; font-size: 0.75rem; background: #0d1117; padding: 8px; border-radius: 4px; overflow-x: auto; }
        .detail-row.error pre { color: #ff7b72; border: 1px solid #cf222e; }
        .error-msg { font-size: 0.75rem; color: #ff7b72; margin-top: 4px; }
      `}</style>
    </div>
  );
}
