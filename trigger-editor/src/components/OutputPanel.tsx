import * as React from 'react';
import { useState } from 'react';
import { copyToClipboard } from '../utils.ts';
import { INITIAL_HINT } from '../constants.ts';

interface OutputPanelProps {
  yaml: string;
  errors: string[];
}

export default function OutputPanel({ yaml, errors }: OutputPanelProps) {
  const [isVisible, setIsVisible] = useState(true);

  const onCopy = async () => {
    if (!yaml) return;
    const success = await copyToClipboard(yaml);
    if (success) {
      const btn = document.getElementById('btn-copy');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copied';
        btn.classList.add('btn--success');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('btn--success');
        }, 2000);
      }
    }
  };

  return (
    <aside className="panel output-panel" style={{ width: isVisible ? '400px' : '60px', flexShrink: 0, transition: 'width 0.3s ease' }}>
      <div className="output-header" style={{ padding: isVisible ? '18px 20px' : '18px 10px', flexDirection: isVisible ? 'row' : 'column', gap: '20px' }}>
        {isVisible ? (
          <>
            <div className="output-header-left">
              <span className="output-title">YAML Output</span>
              <span className="output-badge">Live</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button id="btn-copy" className="btn btn-icon" onClick={onCopy} title="Copy YAML" disabled={!yaml}>
                ⎘ Copy
              </button>
              <button className="btn btn-icon btn-secondary" onClick={() => setIsVisible(false)}>
                ◀
              </button>
            </div>
          </>
        ) : (
          <button className="btn btn-icon" onClick={() => setIsVisible(true)} style={{ height: '40px', writingMode: 'vertical-lr' }}>
            ▶ SHOW YAML
          </button>
        )}
      </div>

      {isVisible && (
        <div className="output-scroll-container" style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {errors.length > 0 && (
            <div className="output-errors" style={{ padding: '15px 20px', background: 'rgba(207, 34, 46, 0.1)', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ color: '#cf222e', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>⚠️ Graph Issues</strong>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#ff7b72', fontSize: '0.75rem' }}>
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
          <pre className={`output-content ${!yaml ? 'output-content--hint' : ''}`} style={{ margin: 0 }}>
            {yaml || INITIAL_HINT}
          </pre>
        </div>
      )}
    </aside>
  );
}
