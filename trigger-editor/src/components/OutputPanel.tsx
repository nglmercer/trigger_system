import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import { copyToClipboard } from '../utils.ts';
import { INITIAL_HINT } from '../constants.ts';
import { CopyIcon, CodeIcon, ChevronIcon } from './Icons.tsx';
import { getHoverInfo } from '../lsp/engine.ts';
import { HoverTooltip } from './AutocompletePopup.tsx';

interface OutputPanelProps {
  yaml: string;
  errors: string[];
}

export default function OutputPanel({ yaml, errors }: OutputPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);
  const [hoveredVar, setHoveredVar] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const getVarAtPoint = useCallback((e: React.MouseEvent) => {
    // Get the text character position under the mouse
    const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (!range || !preRef.current) return null;
    const text = preRef.current.textContent || '';
    // Walk the text nodes to get character offset
    let offset = 0;
    const walker = document.createTreeWalker(preRef.current, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node === range.startContainer) {
        offset += range.startOffset;
        break;
      } else {
        offset += (node.textContent || '').length;
      }
    }
    // Find if current offset is inside a ${...} expression
    const regex = /\$\{([a-zA-Z0-9_.]+)\}/g;
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (offset >= m.index && offset <= m.index + m[0].length) {
        return m[1];
      }
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const found = getVarAtPoint(e);
    if (found && getHoverInfo(found) !== undefined) {
      setHoveredVar(found);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredVar(null);
    }
  }, [getVarAtPoint]);

  const renderTooltip = () => {
    if (!hoveredVar) return null;
    const info = getHoverInfo(hoveredVar);
    if (!info) return null;
    return (
      <HoverTooltip 
        info={info}
        anchorRect={preRef.current?.getBoundingClientRect() ?? null}
        followMouse={true}
        mousePos={tooltipPos}
      />
    );
  };

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
    <>
      {/* Floating Toggle Button */}
      {!isVisible && (
        <button 
          onClick={() => setIsVisible(true)}
          style={{
            position: 'fixed',
            right: '16px',
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
          title="Show YAML Output"
        >
          <CodeIcon />
        </button>
      )}

      <aside className="panel output-panel" style={{ width: isVisible ? '400px' : '0px', flexShrink: 0, transition: 'width 0.3s ease', overflow: 'hidden' }}>
        <div className="output-header" style={{ padding: isVisible ? '18px 20px' : '0', opacity: isVisible ? 1 : 0, transition: 'opacity 0.2s' }}>
          {isVisible && (
            <>
              <div className="output-header-left">
                <span className="output-title">YAML Output</span>
                <span className="output-badge">Live</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button id="btn-copy" className="btn btn-icon" onClick={onCopy} title="Copy YAML" disabled={!yaml}>
                  <CopyIcon /> Copy
                </button>
                <button className="btn btn-icon btn-secondary" onClick={() => setIsVisible(false)} title="Hide">
                  <ChevronIcon direction="right" />
                </button>
              </div>
            </>
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
            {renderTooltip()}
            <pre 
              ref={preRef}
              className={`output-content ${!yaml ? 'output-content--hint' : ''}`} 
              style={{ margin: 0, cursor: 'default' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredVar(null)}
            >
              {yaml || INITIAL_HINT}
            </pre>
          </div>
        )}
      </aside>
    </>
  );
}
