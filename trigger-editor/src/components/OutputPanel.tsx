import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery.ts';
import { copyToClipboard } from '../utils.ts';
import { INITIAL_HINT } from '../constants.ts';
import { CopyIcon, CodeIcon, ChevronIcon } from './Icons.tsx';
import { getHoverInfo } from '../lsp/engine.ts';
import { HoverTooltip } from './AutocompletePopup.tsx';
import { JsonPreview } from './JsonPreview.tsx';
import { parse } from 'yaml';
import { useTranslation } from 'react-i18next';

interface OutputPanelProps {
  yaml: string;
  errors: (string | any)[];
}

export default function OutputPanel({ yaml, errors }: OutputPanelProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = useState(!isMobile); // Auto-hide on mobile by default
  const [viewMode, setViewMode] = useState<'yaml' | 'json'>('yaml');
  const [panelWidth, setPanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const widthRef = useRef(400);
  const [hoveredVar, setHoveredVar] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const startResizing = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    widthRef.current = panelWidth;
    setIsResizing(true);
  }, [panelWidth]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    // Commit the final width to React state only on mouseup
    setPanelWidth(widthRef.current);
  }, []);

  const resize = useCallback((e: MouseEvent | PointerEvent) => {
    const newWidth = Math.round(window.innerWidth - e.clientX);
    if (newWidth > 250 && newWidth < window.innerWidth * 0.8) {
      widthRef.current = newWidth;
      // Update DOM directly to avoid React re-render & ResizeObserver cascade
      if (panelRef.current) {
        panelRef.current.style.width = `${newWidth}px`;
      }
    }
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      window.addEventListener('pointermove', resize);
      window.addEventListener('pointerup', stopResizing);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stopResizing);
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

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
        btn.innerHTML = t('outputPanel.copied');
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
    
    // Token types and their colors (GitHub Dark style)
    const tokenStyles: Record<string, React.CSSProperties> = {
      key: { color: '#7ee787', fontWeight: 500 }, // Greenish for keys
      string: { color: '#a5d6ff' },               // Light blue for strings/values
      number: { color: '#d2a8ff' },               // Purple for numbers
      boolean: { color: '#ff7b72' },              // Coral red for booleans
      null: { color: '#ff7b72', fontStyle: 'italic' },
      comment: { color: '#8b949e', fontStyle: 'italic' },
      punctuation: { color: '#8b949e' },          // Gray for operators/punctuation
      variable: { 
        color: '#79c0ff', 
        background: 'rgba(56, 139, 253, 0.15)', 
        borderRadius: '5px', 
        padding: '0 4px', 
        margin: '0 -1px',
        cursor: 'help',
        boxShadow: '0 0 0 1px rgba(56, 139, 253, 0.25)',
        fontWeight: 600,
        display: 'inline-block',
        lineHeight: '1.2'
      },
      variableUnknown: { color: '#e6edf3', opacity: 0.6 },
    };

    // Tokenize the YAML text with a more robust logic
    const tokenize = (input: string): Array<{ type: string; value: string; varName?: string }> => {
      const tokens: Array<{ type: string; value: string; varName?: string }> = [];
      let i = 0;
      
      while (i < input.length) {
        const currentChar = input[i]!;
        const nextChar = input[i + 1] || '';

        // 1. Comments
        if (currentChar === '#') {
          const start = i;
          while (i < input.length && input[i] !== '\n') i++;
          tokens.push({ type: 'comment', value: input.slice(start, i) });
          continue;
        }
        
        // 2. ${...} variables
        if (currentChar === '$' && nextChar === '{') {
          const start = i;
          i += 2;
          while (i < input.length && input[i] !== '}') i++;
          if (i < input.length) i++; // skip }
          const full = input.slice(start, i);
          const varName = full.slice(2, -1);
          tokens.push({ type: 'variable', value: full, varName });
          continue;
        }
        
        // 3. Quoted strings (single or double)
        if (currentChar === '"' || currentChar === "'") {
          const quote = currentChar;
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
        
        // 4. Numbers (only if pure numeric/version-like and NOT part of a UUID/word)
        if (/[0-9]/.test(currentChar) || (currentChar === '-' && /[0-9]/.test(nextChar))) {
          // Look ahead to check if this is actually a word (contains letters later)
          let j = i;
          if (input[j] === '-') j++;
          while (j < input.length && /[0-9.]/.test(input[j]!)) j++;
          
          const followedByLetter = j < input.length && /[a-zA-Z_]/.test(input[j]!);
          if (!followedByLetter && j > i) {
            tokens.push({ type: 'number', value: input.slice(i, j) });
            i = j;
            continue;
          }
          // If followed by letter, fall through to word handler
        }
        
        // 5. Alphanumeric words (keys, booleans, null, or unquoted strings)
        if (/[a-zA-Z0-9_]/.test(currentChar)) {
          const start = i;
          // Consume word characters including dashes (common in UUIDs and slug-like values)
          while (i < input.length && /[a-zA-Z0-9_-]/.test(input[i]!)) i++;
          const word = input.slice(start, i);
          
          if (word === 'true' || word === 'false') {
            tokens.push({ type: 'boolean', value: word });
          } else if (word === 'null' || word === '~') {
            tokens.push({ type: 'null', value: word });
          } else {
            // Check if followed by colon (is key)
            let tempI = i;
            while (tempI < input.length && input[tempI] === ' ') tempI++;
            if (input[tempI] === ':') {
              tokens.push({ type: 'key', value: word });
            } else {
              tokens.push({ type: 'string', value: word });
            }
          }
          continue;
        }
        
        // 6. Punctuation and whitespace
        // Grouping common punctuation and whitespaces
        const puncRegex = /[{}[\],: \-|>\n]/;
        if (puncRegex.test(currentChar)) {
          const start = i;
          while (i < input.length && puncRegex.test(input[i]!)) i++;
          tokens.push({ type: 'punctuation', value: input.slice(start, i) });
          continue;
        }
        
        // 7. Fallback (any other character)
        tokens.push({ type: 'string', value: currentChar });
        i++;
      }
      
      return tokens;
    };

    const tokens = tokenize(text);
    
    tokens.forEach((token) => {
      if (token.type === 'variable' && token.varName) {
        const varName = token.varName;
        const hasValue = getHoverInfo(varName) !== undefined;
        parts.push(
          <span
            key={key++}
            onMouseEnter={(e) => {
              if (hasValue) {
                setHoveredVar(varName);
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
      <div 
        className={`panel-backdrop ${isVisible && isMobile ? 'active' : ''}`} 
        onClick={() => setIsVisible(false)}
      />

      {/* Floating Toggle Button */}
      {!isVisible && (
        <button 
          onClick={() => setIsVisible(true)}
          className="output-toggle"
          style={{
            position: 'fixed',
            right: isMobile ? '12px' : '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            width: isMobile ? '44px' : '48px',
            height: isMobile ? '44px' : '48px',
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
          title={t('outputPanel.showYaml')}
        >
          <CodeIcon />
        </button>
      )}

      <aside 
        ref={panelRef}
        className={`panel output-panel ${isResizing ? 'resizing' : ''}`} 
        style={{ 
          width: isVisible ? (isMobile ? '90vw' : `${panelWidth}px`) : '0px', 
          flexShrink: 0, 
          transition: isResizing ? 'none' : 'width 0.3s ease', 
          overflow: 'hidden',
          position: isMobile ? 'fixed' : 'relative',
          zIndex: 999
        }}
      >
        {/* Resize Handle */}
        {!isMobile && isVisible && (
          <div
            className="resize-handle"
            onMouseDown={startResizing}
            onPointerDown={startResizing}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'col-resize',
              zIndex: 1001,
              background: isResizing ? 'var(--accent)' : 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (!isResizing) e.currentTarget.style.background = 'rgba(88, 166, 255, 0.3)'; }}
            onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = 'transparent'; }}
          />
        )}
        <div className="output-header" style={{ padding: isVisible ? '18px 20px' : '0', opacity: isVisible ? 1 : 0, transition: 'opacity 0.2s' }}>
          {isVisible && (
            <>
              <div className="output-header-left">
                <span className="output-title">{t('outputPanel.output')}</span>
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  <button 
                    onClick={() => setViewMode('yaml')}
                    style={{ 
                      background: viewMode === 'yaml' ? 'var(--primary)' : 'var(--bg-secondary)', 
                      border: '1px solid var(--border)',
                      fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white'
                    }}
                  >{t('outputPanel.yaml')}</button>
                  <button 
                    onClick={() => setViewMode('json')}
                    style={{ 
                      background: viewMode === 'json' ? 'var(--primary)' : 'var(--bg-secondary)', 
                      border: '1px solid var(--border)',
                      fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white'
                    }}
                  >{t('outputPanel.json')}</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button id="btn-copy" className="btn btn-icon" onClick={onCopy} title={t('outputPanel.copy')} disabled={!yaml}>
                  <CopyIcon /> {t('outputPanel.copy')}
                </button>
                <button className="btn btn-icon btn-secondary" onClick={() => setIsVisible(false)} title={t('outputPanel.hide')}>
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
                <strong style={{ color: '#cf222e', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>{t('outputPanel.graphIssues')}</strong>
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#ff7b72', fontSize: '0.75rem' }}>
                  {errors.map((err, i) => (
                    <li key={i}>
                      {typeof err === 'string' 
                        ? err 
                        : (err?.code ? t(`errors.${err.code}`, { defaultValue: err.message }) : err?.message || String(err))}
                    </li>
                  ))}
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
              <div style={{ padding: '10px', height: 'auto' }}>
                <JsonPreview 
                  data={(() => {
                    try { return parse(yaml); } catch { return { error: 'Failed to parse YAML' }; }
                  })()} 
                  maxHeight="calc(100dvh - 120px)"
                />
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
