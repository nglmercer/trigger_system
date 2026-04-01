import * as React from 'react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { InfoIcon } from '../Icons.tsx';
import { AutocompletePopup, HoverTooltip } from '../AutocompletePopup.tsx';
import { findVariableAtOffset, findFirstVariable, getHoverInfo } from '../../lsp/engine.ts';

// Re-export LSP components for use in other panels
export { HoverTooltip, AutocompletePopup };

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  error?: boolean;
}

export function SelectInput({ 
  value, 
  options, 
  onChange, 
  placeholder = 'Select...', 
  disabled = false,
  className = 'node-input',
  style,
  error
}: SelectInputProps) {
  return (
    <div style={{ position: 'relative', width: style?.width || '100%' }}>
      <select
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ 
          ...style, 
          appearance: 'none', 
          WebkitAppearance: 'none',
          paddingRight: '30px',
          background: 'rgba(13, 17, 23, 0.8)',
          border: `1px solid ${error ? 'var(--error, #f85149)' : 'var(--border)'}`,
          borderRadius: '8px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--error, #f85149)' : 'var(--accent)';
          e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(248, 81, 73, 0.15)' : '0 0 0 3px rgba(88, 166, 255, 0.15)';
          e.currentTarget.style.background = 'rgba(13, 17, 23, 0.95)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--error, #f85149)' : 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(13, 17, 23, 0.8)';
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {opt.label}
          </option>
        ))}
      </select>
      <div style={{
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

interface TextInputProps {
  value: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  disabled?: boolean;
  className?: string;
  /** Autocomplete mode: 'variable' (default) or 'value' or 'none' */
  autocompleteMode?: 'variable' | 'value' | 'none';
  /** Show only primitive values (string, number, boolean) in autocomplete */
  primitiveOnly?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;  
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: boolean;
}

export function TextInput({ 
  value, 
  onChange, 
  placeholder = '', 
  type = 'text',
  disabled = false,
  className = 'node-input',
  autocompleteMode = 'variable',
  primitiveOnly = false,
  autoFocus = false,
  style,
  onBlur,
  error
}: TextInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  // Hover state lives on the ACTUAL INPUT element to avoid multi-tooltip bug
  const [hoverInfo, setHoverInfo] = useState<ReturnType<typeof getHoverInfo>>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const [cursorOffset, setCursorOffset] = useState<number>(0);
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  const handleChange = (newVal: string | number) => {
    setLocalValue(newVal);
    if (onChange) {
      onChange(type === 'number' ? (typeof newVal === 'string' ? parseFloat(newVal) || 0 : newVal) : newVal);
    }
  };

  // While editing: track which ${...} the caret is inside
  const updateCursorVar = () => {
    const pos = inputRef.current?.selectionStart ?? 0;
    setCursorOffset(pos);
    const found = findVariableAtOffset(String(value), pos);
    setCursorVar(found);
  };

  // While hovering (not focused): show var under mouse using first-var heuristic
  const handleInputMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const found = findFirstVariable(String(value));
    setHoverInfo(found ? getHoverInfo(found) : undefined);
  };

  // Active tooltip: caret-based while editing, mouse-based while hovering
  const activeInfo = isFocused
    ? (cursorVar ? getHoverInfo(cursorVar) : undefined)
    : hoverInfo;

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      {activeInfo && (
        <HoverTooltip
          info={activeInfo}
          anchorRect={containerRef.current?.getBoundingClientRect() ?? null}
          followMouse={!isFocused}
          mousePos={!isFocused ? mousePos : undefined}
        />
      )}
      {type === 'text' && !disabled && autocompleteMode !== 'none' && (
        <AutocompletePopup
          value={localValue}
          onSelect={handleChange}
          anchorRef={containerRef}
          isFocused={isFocused}
          mode={autocompleteMode}
          primitiveOnly={primitiveOnly}
          cursorOffset={cursorOffset}
        />
      )}
      <input
        ref={inputRef}
        type={type}
        className={className}
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{
          ...style,
          borderRadius: '8px',
          background: 'rgba(13, 17, 23, 0.8)',
          border: `1px solid ${error ? 'var(--error, #f85149)' : 'var(--border)'}`,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onFocus={(e) => {
          setIsFocused(true);
          e.currentTarget.style.borderColor = error ? 'var(--error, #f85149)' : 'var(--accent)';
          e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(248, 81, 73, 0.15)' : '0 0 0 3px rgba(88, 166, 255, 0.15)';
          e.currentTarget.style.background = 'rgba(13, 17, 23, 0.95)';
        }}
        onBlur={(e) => {
          if (onBlur) onBlur(e);
          e.currentTarget.style.borderColor = error ? 'var(--error, #f85149)' : 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(13, 17, 23, 0.8)';
          setTimeout(() => { setIsFocused(false); setCursorVar(undefined); }, 150);
        }}
        onKeyUp={updateCursorVar}
        onClick={updateCursorVar}
        onSelect={updateCursorVar}
        onMouseMove={handleInputMouseMove}
        onMouseLeave={() => setHoverInfo(undefined)}
      />
    </div>
  );
}

interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  style?: React.CSSProperties;
  error?: boolean;
}

export function TextAreaInput({ 
  value, 
  onChange, 
  placeholder = '', 
  disabled = false,
  rows = 3,
  className = 'node-textarea',
  style,
  error
}: TextAreaInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<ReturnType<typeof getHoverInfo>>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const [cursorOffset, setCursorOffset] = useState<number>(0);
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  const updateCursorVar = () => {
    const pos = textareaRef.current?.selectionStart ?? 0;
    setCursorOffset(pos);
    const found = findVariableAtOffset(String(value), pos);
    setCursorVar(found);
  };

  const handleTextareaMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    const found = findFirstVariable(String(value));
    setHoverInfo(found ? getHoverInfo(found) : undefined);
  };

  const activeInfo = isFocused
    ? (cursorVar ? getHoverInfo(cursorVar) : undefined)
    : hoverInfo;

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      {activeInfo && (
        <HoverTooltip
          info={activeInfo}
          anchorRect={containerRef.current?.getBoundingClientRect() ?? null}
          followMouse={!isFocused}
          mousePos={!isFocused ? mousePos : undefined}
        />
      )}
      {!disabled && (
        <AutocompletePopup
          value={localValue}
          onSelect={onChange}
          anchorRef={containerRef}
          isFocused={isFocused}
          cursorOffset={cursorOffset}
        />
      )}
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        style={{
          ...style,
          borderRadius: '8px',
          background: 'rgba(13, 17, 23, 0.8)',
          border: `1px solid ${error ? 'var(--error, #f85149)' : 'var(--border)'}`,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onFocus={(e) => {
          setIsFocused(true);
          e.currentTarget.style.borderColor = error ? 'var(--error, #f85149)' : 'var(--accent)';
          e.currentTarget.style.boxShadow = error ? '0 0 0 3px rgba(248, 81, 73, 0.15)' : '0 0 0 3px rgba(88, 166, 255, 0.15)';
          e.currentTarget.style.background = 'rgba(13, 17, 23, 0.95)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--error, #f85149)' : 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'rgba(13, 17, 23, 0.8)';
          setTimeout(() => { setIsFocused(false); setCursorVar(undefined); }, 150);
        }}
        onKeyUp={updateCursorVar}
        onClick={updateCursorVar}
        onSelect={updateCursorVar}
        onMouseMove={handleTextareaMouseMove}
        onMouseLeave={() => setHoverInfo(undefined)}
      />
    </div>
  );
}

interface CheckboxInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export function CheckboxInput({ 
  checked, 
  onChange, 
  label,
  hint,
  disabled = false 
}: CheckboxInputProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input
          type="checkbox"
          style={{ width: 'auto', cursor: 'inherit' }}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {label && <span className="node-label" style={{ margin: 0, userSelect: 'none' }}>{label}</span>}
      </label>
      {hint && (
        <div 
          onMouseEnter={(e) => {
            setShowTooltip(true);
            setMousePos({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setShowTooltip(false)}
          style={{ 
            color: 'var(--text-muted)', 
            cursor: 'help', 
            display: 'flex',
            padding: '2px',
            borderRadius: '4px',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <InfoIcon size={12} />
        </div>
      )}
      {showTooltip && hint && (
        <SimpleTooltip text={hint} mousePos={mousePos} />
      )}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

// Simple floating tooltip for hints
function SimpleTooltip({ text, mousePos }: { text: string; mousePos: { x: number; y: number } }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    setPos({ 
      top: mousePos.y + window.scrollY - 10, 
      left: mousePos.x + window.scrollX + 14 
    });
  }, [mousePos]);

  return createPortal(
    <div style={{
      position: 'absolute',
      top: `${pos.top}px`,
      left: `${pos.left}px`,
      transform: 'translateY(-50%)',
      background: 'rgba(22, 22, 28, 0.98)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 15px 35px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset',
      fontSize: '11.5px',
      lineHeight: '1.5',
      color: 'var(--text-primary)',
      zIndex: 1000000,
      pointerEvents: 'none',
      maxWidth: '240px',
      fontWeight: 500,
      animation: 'tooltipFadeIn 0.2s ease-out forwards',
      borderLeft: '4px solid var(--accent)'
    }}>
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(-45%) scale(0.95); }
          to { opacity: 1; transform: translateY(-50%) scale(1); }
        }
      `}</style>
      {text}
    </div>,
    document.body
  );
}

export function FormField({ label, children, hint }: FormFieldProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        marginBottom: '6px' 
      }}>
        <label className="node-label" style={{ 
          margin: 0, 
          flex: 1,
          lineHeight: '1.4'
        }}>{label}</label>
        {hint && (
          <div 
            onMouseEnter={(e) => {
              setShowTooltip(true);
              setMousePos({ x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setShowTooltip(false)}
            style={{ 
              color: 'var(--text-muted)', 
              cursor: 'help', 
              display: 'flex',
              padding: '2px',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <InfoIcon size={12} />
          </div>
        )}
      </div>
      {children}
      {showTooltip && hint && (
        <SimpleTooltip text={hint} mousePos={mousePos} />
      )}
    </div>
  );
}

// Collapsible/Accordion component
interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

export function Collapsible({ title, children, defaultOpen = false, icon }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div style={{ 
      marginTop: '12px', 
      border: '1px solid var(--border)', 
      borderRadius: '8px', 
      overflow: 'hidden',
      background: 'rgba(22, 27, 34, 0.4)',
      transition: 'all 0.2s ease'
    }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: isOpen ? 'rgba(88, 166, 255, 0.05)' : 'transparent',
          border: 'none',
          color: isOpen ? 'var(--accent)' : 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          textAlign: 'left',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ opacity: isOpen ? 1 : 0.7 }}>{icon}</span>}
          {title}
        </span>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 0.6
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div style={{ 
        maxHeight: isOpen ? '1000px' : '0',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isOpen ? 1 : 0
      }}>
        <div style={{ 
          padding: '14px', 
          borderTop: '1px solid var(--border)', 
          background: 'rgba(13, 17, 23, 0.3)' 
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}