import * as React from 'react';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAutocompletePaths, resolveAutocompleteValue } from './AutocompleteContext.ts';

export function AutocompletePopup({ 
  value, 
  onSelect, 
  cursorRef,
  isFocused
}: { 
  value: string | number; 
  onSelect: (newValue: string) => void;
  cursorRef: React.RefObject<HTMLElement | HTMLDivElement | null>;
  isFocused: boolean;
}) {
  const paths = useAutocompletePaths();
  const valStr = String(value);
  const [show, setShow] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [matchInfo, setMatchInfo] = useState({ term: '', raw: '' });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    // If the input lost focus, close immediately
    if (!isFocused) {
      setShow(false);
      return;
    }
    // Check if the user is typing a variable, e.g., ending in $, ${, or ${something
    // Capture group [1] gets the actual property path they are typing
    const match = valStr.match(/\$\{?([a-zA-Z0-9_.]*)$/);
    
    // Only trigger if the match starts with $ and the expression is NOT yet closed with }
    const isExplicitTrigger = valStr.endsWith('$') || valStr.endsWith('${');
    const isTypingVar = match && match[0].startsWith('$') && !valStr.endsWith('}');
    const isVariableContext = isTypingVar && valStr.lastIndexOf('$') !== -1 && valStr.lastIndexOf(' ') < valStr.lastIndexOf('$');
    
    const isTriggered = isExplicitTrigger || isVariableContext;

    if (isTriggered && match && match[1] !== undefined) {
      const term = match[1];
      
      const filtered = paths
        .filter(p => p.toLowerCase().includes(term.toLowerCase()))
        .sort((a, b) => {
          // Prioritize exact prefix matches
          const aStarts = a.toLowerCase().startsWith(term.toLowerCase());
          const bStarts = b.toLowerCase().startsWith(term.toLowerCase());
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          // Then by depth (number of dots)
          const aDepth = (a.match(/\./g) || []).length;
          const bDepth = (b.match(/\./g) || []).length;
          if (aDepth !== bDepth) return aDepth - bDepth;
          
          return a.localeCompare(b);
        })
        .slice(0, 8);
      
      if (filtered.length > 0) {
        setSuggestions(filtered);
        setMatchInfo({ term, raw: match[0] });
        setShow(true);
        return;
      }
    }
    
    setShow(false);
  }, [valStr, paths]);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // If clicked outside menu AND outside input
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        cursorRef.current && 
        !cursorRef.current.contains(e.target as Node)
      ) {
        setShow(false);
      }
    };
    
    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, cursorRef]);

  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (show && cursorRef.current) {
      const rect = cursorRef.current.getBoundingClientRect();
      // Position the popup exactly below the input container, anchored via document offsets
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [show, valStr]); // Recalculate when show or input changes

  if (!show || suggestions.length === 0) return null;

  const handleSelect = (suggestion: string) => {
    // Replace the matched part with the completed variable wrapping
    const replacement = `${suggestion}}`;
    const newValue = valStr.substring(0, valStr.length - matchInfo.raw.length) + '${' + replacement;
    onSelect(newValue);
    setShow(false);
  };

  const renderHoverPanel = () => {
    if (!hoveredItem) return null;
    const val = resolveAutocompleteValue(hoveredItem);
    const valType = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
    
    let displayVal = '';
    if (typeof val === 'object' && val !== null) {
      displayVal = JSON.stringify(val, null, 2);
    } else {
      displayVal = String(val);
      if (typeof val === 'string') displayVal = `"${displayVal}"`;
    }

    return (
      <div style={{
        position: 'absolute',
        top: 0,
        left: '100%',
        marginLeft: '4px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        width: '350px',
        fontSize: '12px',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono, monospace)',
        zIndex: 1000000
      }}>
        <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Template Variable: </span>
            <strong style={{ color: '#58a6ff' }}>{`\${${hoveredItem}}`}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Type: </span>
            <span style={{ color: '#8b949e' }}>{valType}</span>
          </div>
        </div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Current/Test Value:</div>
        <pre style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          background: 'var(--bg-primary)', 
          padding: '8px', 
          borderRadius: '4px',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: '1px solid var(--border)',
          color: '#e6edf3'
        }}>
           {displayVal}
        </pre>
      </div>
    );
  };

  const menu = (
    <div 
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${position.top + 4}px`,
        left: `${position.left}px`,
        zIndex: 999999, // Super high z-index to break out of all Modals
      }}
    >
      <ul 
        style={{
          minWidth: `${Math.max(250, position.width)}px`,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '4px 0',
          margin: 0,
          listStyle: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          maxHeight: '250px',
          overflowY: 'auto',
          fontSize: '13px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono, monospace)',
          position: 'relative'
        }}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <li style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
          Suggestions (Local JSON)
        </li>
        {suggestions.map((s, idx) => {
           const val = resolveAutocompleteValue(s);
           const typeStr = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
           return (
            <li 
              key={s} 
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setHoveredItem(s)}
              style={{ 
                padding: '6px 12px', 
                cursor: 'pointer', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: hoveredItem === s ? 'var(--bg-color)' : 'transparent',
                borderLeft: hoveredItem === s ? '2px solid #58a6ff' : '2px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span style={{ fontSize: '14px', color: '#58a6ff' }}>{'{}'}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.6, color: '#8b949e', fontStyle: 'italic', paddingLeft: '8px' }}>
                {typeStr}
              </span>
            </li>
          );
        })}
      </ul>
      {renderHoverPanel()}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(menu, document.body);
}
