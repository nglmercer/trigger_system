import * as React from 'react';
import { useState } from 'react';
import { RuleEngine } from '../../../src/core/rule-engine-new.ts';
import type { TriggerRule, TriggerResult, TriggerContext, ExecutedAction } from '../../../src/types.ts';

interface RulePlayerProps {
  rule: TriggerRule | null;
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

export default function RulePlayer({ rule, isOpen, onClose }: RulePlayerProps) {
  const [selectedEvent, setSelectedEvent] = useState(DEFAULT_EVENTS[0]!);
  const [customData, setCustomData] = useState(JSON.stringify(DEFAULT_EVENTS[0]!.data, null, 2));
  const [results, setResults] = useState<TriggerResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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
        event: selectedEvent.event,
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
    <div className="player-overlay">
      <div className="player-modal">
        <div className="player-header">
          <h2 className="player-title">Rule Tester</h2>
          <button className="player-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="player-body">
          <div className="player-section">
            <label className="node-label">Select Event Type</label>
            <div className="event-pills">
              {DEFAULT_EVENTS.map(ev => (
                <button 
                  key={ev.name}
                  className={`event-pill ${selectedEvent.name === ev.name ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedEvent(ev);
                    setCustomData(JSON.stringify(ev.data, null, 2));
                  }}
                >
                  {ev.name}
                </button>
              ))}
            </div>
          </div>

          <div className="player-section">
            <label className="node-label">Mock Data (JSON)</label>
            <textarea
              className="node-textarea player-json"
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              spellCheck={false}
            />
          </div>

          <button 
            className={`btn player-run ${isRunning ? 'loading' : ''}`} 
            onClick={runTest}
            disabled={isRunning || !rule}
          >
            {isRunning ? 'Running...' : '▶ Run Rule'}
          </button>

          {results && (
            <div className="player-results">
              <label className="node-label">Execution Results</label>
              <div className="results-container">
                {results.length === 0 ? (
                  <div className="result-item skip">
                    <span className="result-icon">⚠️</span>
                    <span className="result-text">No rule matched this event/condition.</span>
                  </div>
                ) : (
                  results.map((r, i) => (
                    <div key={i} className={`result-rule ${r.success ? 'success' : 'fail'}`}>
                      <div className="result-header">
                        <strong>Rule: {r.ruleId}</strong>
                        <span className={`badge ${r.success ? 'success' : 'fail'}`}>
                          {r.success ? 'MATCH' : 'ERROR'}
                        </span>
                      </div>
                      {r.error && <div className="result-error">{String(r.error)}</div>}
                      <div className="executed-actions">
                        {r.executedActions.map((act: ExecutedAction, ai: number) => (
                          <div key={ai} className="action-tag">
                            <span className="action-icon">⚡</span>
                            <span className="action-type">{act.type}</span>
                            {act.result !== undefined && <span className="action-res">✓</span>}
                            {act.error !== undefined && <span className="action-err">✕</span>}
                          </div>
                        ))}
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
        .player-results {
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }
        .results-container {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .result-rule {
          background: rgba(48, 54, 61, 0.4);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }
        .result-rule.success { border-left: 4px solid var(--condition-color); }
        .result-rule.fail { border-left: 4px solid #cf222e; }
        .result-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .badge {
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .badge.success { background: var(--condition-color); color: white; }
        .badge.fail { background: #cf222e; color: white; }
        .executed-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .action-tag {
          background: var(--bg-color);
          border: 1px solid var(--border);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .action-res { color: var(--condition-color); font-weight: bold; }
        .action-err { color: #cf222e; font-weight: bold; }
        .result-item.skip {
          padding: 12px;
          color: var(--text-muted);
          font-style: italic;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
