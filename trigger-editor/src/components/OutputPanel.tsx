import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import { copyToClipboard } from '../utils.ts';
import { INITIAL_HINT } from '../constants.ts';
import { CopyIcon, CodeIcon, ChevronIcon } from './Icons.tsx';
import { getHoverInfo } from '../lsp/engine.ts';
import { HoverTooltip } from './AutocompletePopup.tsx';
import { JsonPreview } from './JsonPreview.tsx';
import { parse } from 'yaml';

interface OutputPanelProps {
  yaml: string;
  errors: string[];
}

export default function OutputPanel({ yaml, errors }: OutputPanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'yaml' | 'json'>('yaml');
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

  // Render YAML with comprehensive syntax highlighting and ${...} variables
  const renderYamlWithHighlights = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = 0;
    
    // Token types and their colors
    const tokenStyles: Record<string, React.CSSProperties> = {
      key: { color: '#79c0ff', fontWeight: 500 },
      string: { color: '#a5d6ff' },
      number: { color: '#79c0ff' },
      boolean: { color: '#ff7b72', fontWeight: 500 },
      null: { color: '#ff7b72', fontStyle: 'italic' },
      comment: { color: '#8b949e', fontStyle: 'italic' },
      punctuation: { color: '#8b949e' },
      variable: { color: '#58a6ff', background: 'rgba(88,166,255,0.12)', borderRadius: '3px', padding: '0 2px', cursor: 'help', borderBottom: '1px dashed rgba(88,166,255,0.5)' },
      variableUnknown: { color: '#e6edf3' },
    };

    // Tokenize the YAML text
    const tokenize = (input: string): Array<{ type: string; value: string; varName?: string }> => {
      const tokens: Array<{ type: string; value: string; varName?: string }> = [];
      let i = 0;
      
      while (i < input.length) {
        // Comments
        if (input[i] === '#') {
          const start = i;
          while (i < input.length && input[i] !== '\n') i++;
          tokens.push({ type: 'comment', value: input.slice(start, i) });
          continue;
        }
        
        // ${...} variables
        if (input[i] === '$' && input[i + 1] === '{') {
          const start = i;
          i += 2;
          while (i < input.length && input[i] !== '}') i++;
          if (i < input.length) i++; // skip }
          const full = input.slice(start, i);
          const varName = full.slice(2, -1);
          tokens.push({ type: 'variable', value: full, varName });
          continue;
        }
        
        // Quoted strings (single or double)
        if (input[i] === '"' || input[i] === "'") {
          const quote = input[i];
          const start = i;
          i++;
          while (i < input.length && input[i] !== quote) {
            if (input[i] === '\\') i++; // skip escaped char
            i++;
          }
          if (i < input.length) i++; // skip closing quote
          tokens.push({ type: 'string', value: input.slice(start, i) });
          continue;
        }
        
        // Numbers
        const currentChar = input[i];
        const nextChar = input[i + 1];
        if (currentChar && (/[0-9]/.test(currentChar) || (currentChar === '-' && nextChar && /[0-9]/.test(nextChar)))) {
          const start = i;
          if (currentChar === '-') i++;
          while (i < input.length) {
            const ch = input[i];
            if (!ch || !/[0-9.]/.test(ch)) break;
            i++;
          }
          tokens.push({ type: 'number', value: input.slice(start, i) });
          continue;
        }
        
        // Booleans and null
        if (currentChar && /[a-zA-Z]/.test(currentChar)) {
          const start = i;
          while (i < input.length) {
            const ch = input[i];
            if (!ch || !/[a-zA-Z0-9_-]/.test(ch)) break;
            i++;
          }
          const word = input.slice(start, i);
          if (word === 'true' || word === 'false') {
            tokens.push({ type: 'boolean', value: word });
          } else if (word === 'null' || word === '~') {
            tokens.push({ type: 'null', value: word });
          } else {
            // Check if it's a key (followed by :)
            let j = i;
            while (j < input.length && input[j] === ' ') j++;
            if (j < input.length && input[j] === ':') {
              tokens.push({ type: 'key', value: word });
            } else {
              tokens.push({ type: 'string', value: word });
            }
          }
          continue;
        }
        
        // Punctuation and whitespace
        if (currentChar && (/[{}\[\]:,\-|>]/.test(currentChar) || /\s/.test(currentChar))) {
          const start = i;
          while (i < input.length) {
            const ch = input[i];
            if (!ch || !(/[{}\[\]:,\-|>]/.test(ch) || /\s/.test(ch))) break;
            i++;
          }
          tokens.push({ type: 'punctuation', value: input.slice(start, i) });
          continue;
        }
        
        // Any other character
        if (currentChar) {
          tokens.push({ type: 'string', value: currentChar });
        }
        i++;
      }
      
      return tokens;
    };

    const tokens = tokenize(text);
    
    tokens.forEach((token) => {
      if (token.type === 'variable') {
        const hasValue = token.varName ? getHoverInfo(token.varName) !== undefined : false;
        parts.push(
          <span
            key={key++}
            onMouseEnter={(e) => {
              if (hasValue && token.varName) {
                setHoveredVar(token.varName);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseLeave={() => setHoveredVar(null)}
            onMouseMove={(e) => {
              if (hasValue) setTooltipPos({ x: e.clientX, y: e.clientY });
            }}
            style={hasValue ? tokenStyles.variable : tokenStyles.variableUnknown}
          >
            {token.value}
          </span>
        );
      } else {
        const style = tokenStyles[token.type] || {};
        parts.push(
          <span key={key++} style={style}>
            {token.value}
          </span>
        );
      }
    });

    return parts;
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
                <span className="output-title">Output</span>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                  <button 
                    onClick={() => setViewMode('yaml')}
                    style={{ 
                      background: viewMode === 'yaml' ? 'var(--primary)' : 'var(--bg-secondary)', 
                      border: '1px solid var(--border)',
                      fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white'
                    }}
                  >YAML</button>
                  <button 
                    onClick={() => setViewMode('json')}
                    style={{ 
                      background: viewMode === 'json' ? 'var(--primary)' : 'var(--bg-secondary)', 
                      border: '1px solid var(--border)',
                      fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white'
                    }}
                  >JSON</button>
                </div>
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
            {viewMode === 'yaml' ? (
              <pre 
                ref={preRef}
                className={`output-content ${!yaml ? 'output-content--hint' : ''}`} 
                style={{ margin: 0 }}
                onMouseLeave={() => setHoveredVar(null)}
              >
                {yaml ? renderYamlWithHighlights(yaml) : INITIAL_HINT}
              </pre>
            ) : (
              <div style={{ padding: '10px' }}>
                <JsonPreview 
                  data={(() => {
                    try { return parse(yaml); } catch { return { error: 'Failed to parse YAML' }; }
                  })()} 
                  maxHeight="calc(100vh - 120px)"
                />
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
