import * as React from 'react';
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCompletions, useApplyCompletion, useApplyValueCompletion, usePrimitiveCompletions } from '../lsp/hooks.ts';
import { getHoverInfo } from '../lsp/engine.ts';
import type { CompletionItem, HoverInfo } from '../lsp/types.ts';

// ─── Hover Tooltip ────────────────────────────────────────────────────────────

interface HoverTooltipProps {
  info: HoverInfo;
  anchorRect: DOMRect | null;
  mousePos?: { x: number; y: number };
  followMouse?: boolean;
}

export function HoverTooltip({ info, anchorRect, mousePos, followMouse }: HoverTooltipProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (followMouse && mousePos) {
      setPos({ top: mousePos.y + window.scrollY, left: mousePos.x + window.scrollX + 14 });
    } else if (anchorRect) {
      setPos({
        top: anchorRect.top + window.scrollY - 8,
        left: anchorRect.left + window.scrollX + 8
      });
    }
  }, [followMouse, mousePos, anchorRect]);

  if (typeof document === 'undefined') return null;

  const { variable, kind, display } = info;
  return createPortal(
    <div style={{
      position: 'absolute',
      top: `${pos.top}px`,
      left: `${pos.left}px`,
      transform: 'translateY(-100%)',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '8px 12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.65)',
      fontSize: '12px',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-mono, monospace)',
      zIndex: 1000000,
      pointerEvents: 'none',
      maxWidth: '320px',
      minWidth: '150px',
    }}>
      <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#58a6ff', fontWeight: 600 }}>{`\${${variable}}`}</span>
        <span style={{
          color: '#8b949e', fontStyle: 'italic', fontSize: '10px',
          background: 'rgba(139,148,158,0.15)', padding: '1px 5px', borderRadius: '4px'
        }}>{kind}</span>
      </div>
      <pre style={{
        background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px',
        border: '1px solid var(--border)', color: '#e6edf3', margin: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '160px', overflowY: 'auto'
      }}>
        {display}
      </pre>
    </div>,
    document.body
  );
}

// ─── Autocomplete Popup ───────────────────────────────────────────────────────

interface AutocompletePopupProps {
  value: string | number;
  onSelect: (newValue: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  isFocused: boolean;
  /** Autocomplete mode: 'variable' (default), 'value', or 'none' */
  mode?: 'variable' | 'value' | 'none';
  /** Show only primitive values (string, number, boolean) in autocomplete */
  primitiveOnly?: boolean;
  /** Cursor position in the input */
  cursorOffset?: number;
}

export function AutocompletePopup({ value, onSelect, anchorRef, isFocused, mode = 'variable', primitiveOnly = false, cursorOffset }: AutocompletePopupProps) {
  const valStr = String(value);
  
  // Handle completions based on mode
  const completionData = mode === 'none'
    ? { items: [], isOpen: false }
    : primitiveOnly
      ? usePrimitiveCompletions(valStr, cursorOffset)
      : useCompletions(valStr, cursorOffset);
  
  const { items, isOpen } = completionData;
  
  // Use the appropriate completion function based on mode
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when focus is lost
  const show = isFocused && isOpen && items.length > 0;

  // Use the appropriate completion function based on mode
  const applyCompletion = mode === 'value'
    ? useApplyValueCompletion(valStr, onSelect, cursorOffset)
    : useApplyCompletion(valStr, onSelect, cursorOffset);

  // Reset active index when items change
  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' || (e.key === 'Tab')) {
        if (items.length > 0) {
          e.preventDefault();
          applyCompletion(items[activeIndex]!);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [show, items, activeIndex, applyCompletion]);

  useLayoutEffect(() => {
    if (show && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [show, valStr, anchorRef]);

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        // autocomplete will close naturally when isFocused becomes false
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, anchorRef]);

  if (!show || typeof document === 'undefined') return null;

  // Sync hoveredItem with activeIndex for info panel
  const currentItem = items[activeIndex];
  const hoveredInfo = currentItem ? getHoverInfo(currentItem.label) : undefined;

  const menu = (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${position.top + 4}px`,
        left: `${position.left}px`,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '4px'
      }}
    >
      {/* Main list */}
      <ul
        style={{
          minWidth: `${Math.max(250, position.width)}px`,
          background: 'var(--bg-secondary)',
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
        }}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <li style={{
          padding: '5px 12px', fontSize: '11px', fontWeight: 600,
          color: 'var(--text-secondary)', background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)', marginBottom: '4px'
        }}>
          Variables (LSP)
        </li>
        {items.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <li
              key={`${item.label}-${i}`}
              onClick={() => applyCompletion(item)}
              onMouseEnter={() => {
                setHoveredItem(item.label);
                setActiveIndex(i);
              }}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: isActive ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span style={{ fontSize: '14px', color: '#58a6ff' }}>{'{}'}</span>
                <span style={{ 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  fontWeight: isActive ? 600 : 400
                }}>
                  {item.label}
                </span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.6, color: '#8b949e', fontStyle: 'italic', paddingLeft: '8px' }}>
                {item.kind}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Side panel on hover */}
      {hoveredInfo && (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          width: '280px',
          fontSize: '12px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Variable: </span>
              <strong style={{ color: '#58a6ff' }}>{`\${${hoveredInfo.variable}}`}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Type: </span>
              <span style={{ color: '#8b949e' }}>{hoveredInfo.kind}</span>
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
            Current Value:
          </div>
          <pre style={{
            background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px',
            border: '1px solid var(--border)', color: '#e6edf3', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflowY: 'auto'
          }}>
            {hoveredInfo.display}
          </pre>
        </div>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
