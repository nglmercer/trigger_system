import * as React from 'react';
import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { AutocompletePopup } from './AutocompletePopup.tsx';
import { resolveAutocompleteValue } from './AutocompleteContext.ts';

// Helper: find which ${var} path the given character offset falls inside
function findVarAtOffset(text: string, offset: number): string | undefined {
  const regex = /\$\{([a-zA-Z0-9_.]+)\}/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (offset >= m.index && offset <= m.index + m[0].length) {
      return m[1];
    }
  }
  return undefined;
}

// Helper: find the first ${var} in the text (fallback for hover without cursor info)
function findFirstVar(text: string): string | undefined {
  const match = text.match(/\$\{([a-zA-Z0-9_.]+)\}/);
  return match ? match[1] : undefined;
}

// Hover Tooltip Component — shows exactly ONE resolved variable
export function InputHoverTooltip({ 
  targetVar,
  anchorRef,
  visible,
  followMouse,
  mousePos
}: { 
  targetVar: string | undefined;
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: boolean;
  followMouse?: boolean;
  mousePos?: { x: number; y: number };
}) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!visible || !targetVar) return;
    if (followMouse && mousePos) {
      setPosition({
        top: mousePos.y + window.scrollY,
        left: mousePos.x + window.scrollX + 12
      });
    } else if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX + 8
      });
    }
  }, [visible, targetVar, followMouse, mousePos, anchorRef]);

  if (!visible || !targetVar || typeof document === 'undefined') return null;

  const val = resolveAutocompleteValue(targetVar);
  if (val === undefined) return null;

  const typeStr = val === null ? 'null' : Array.isArray(val) ? 'array' : typeof val;
  let displayVal: string;
  if (typeof val === 'object' && val !== null) {
    displayVal = JSON.stringify(val, null, 2);
  } else {
    displayVal = typeof val === 'string' ? `"${val}"` : String(val);
  }

  const tooltip = (
    <div style={{
      position: 'absolute',
      top: `${position.top}px`,
      left: `${position.left}px`,
      transform: followMouse ? 'translateY(-100%)' : 'translateY(-100%)',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '8px 12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      fontSize: '12px',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-mono, monospace)',
      zIndex: 1000000,
      pointerEvents: 'none',
      maxWidth: '320px',
      minWidth: '180px'
    }}>
      <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#58a6ff', fontWeight: 600 }}>{`\${${targetVar}}`}</span>
        <span style={{ 
          color: '#8b949e', fontStyle: 'italic', fontSize: '10px',
          background: 'rgba(139,148,158,0.15)', padding: '1px 5px', borderRadius: '4px'
        }}>{typeStr}</span>
      </div>
      <pre style={{
        background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px',
        border: '1px solid var(--border)', color: '#e6edf3', margin: 0,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '150px', overflowY: 'auto'
      }}>
        {displayVal}
      </pre>
    </div>
  );

  return createPortal(tooltip, document.body);
}

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
}

export function SelectInput({ 
  value, 
  options, 
  onChange, 
  placeholder = 'Select...', 
  disabled = false,
  className = 'node-input'
}: SelectInputProps) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface TextInputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  disabled?: boolean;
  className?: string;
}

export function TextInput({ 
  value, 
  onChange, 
  placeholder = '', 
  type = 'text',
  disabled = false,
  className = 'node-input'
}: TextInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hoverVar, setHoverVar] = useState<string | undefined>(undefined);
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleChange = (newVal: string | number) => {
    onChange(type === 'number' ? (typeof newVal === 'string' ? parseFloat(newVal) || 0 : newVal) : newVal);
  };

  // Hover: use first var found in value (can't map pixel→char in native inputs)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isFocused) return;
    setMousePos({ x: e.clientX, y: e.clientY });
    setHoverVar(findFirstVar(String(value)));
  };

  // Editing: use selectionStart to find which ${...} the caret is inside
  const updateCursorVar = () => {
    const pos = inputRef.current?.selectionStart ?? 0;
    setCursorVar(findVarAtOffset(String(value), pos));
  };

  // Active var to show: while editing use caret-based, else use hover
  const activeVar = isFocused ? cursorVar : (isHovered ? hoverVar : undefined);
  const tooltipVisible = !!activeVar;

  return (
    <div 
      style={{ position: 'relative' }} 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoverVar(undefined); }}
      onMouseMove={handleMouseMove}
    >
      <InputHoverTooltip 
        targetVar={activeVar} 
        anchorRef={containerRef} 
        visible={tooltipVisible} 
        followMouse={!isFocused}
        mousePos={mousePos}
      />
      {type === 'text' && !disabled && (
        <AutocompletePopup value={value} onSelect={handleChange} cursorRef={containerRef} isFocused={isFocused} />
      )}
      <input
        ref={inputRef}
        type={type}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => { setIsFocused(false); setCursorVar(undefined); }, 150)}
        onKeyUp={updateCursorVar}
        onClick={updateCursorVar}
        onSelect={updateCursorVar}
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
}

export function TextAreaInput({ 
  value, 
  onChange, 
  placeholder = '', 
  disabled = false,
  rows = 3,
  className = 'node-textarea',
  style
}: TextAreaInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hoverVar, setHoverVar] = useState<string | undefined>(undefined);
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isFocused) return;
    setMousePos({ x: e.clientX, y: e.clientY });
    setHoverVar(findFirstVar(String(value)));
  };

  const updateCursorVar = () => {
    const pos = textareaRef.current?.selectionStart ?? 0;
    setCursorVar(findVarAtOffset(String(value), pos));
  };

  const activeVar = isFocused ? cursorVar : (isHovered ? hoverVar : undefined);
  const tooltipVisible = !!activeVar;

  return (
    <div 
      style={{ position: 'relative', width: '100%' }} 
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoverVar(undefined); }}
      onMouseMove={handleMouseMove}
    >
      <InputHoverTooltip 
        targetVar={activeVar} 
        anchorRef={containerRef} 
        visible={tooltipVisible} 
        followMouse={!isFocused}
        mousePos={mousePos}
      />
      {!disabled && (
        <AutocompletePopup value={value} onSelect={onChange} cursorRef={containerRef} isFocused={isFocused} />
      )}
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        style={style}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => { setIsFocused(false); setCursorVar(undefined); }, 150)}
        onKeyUp={updateCursorVar}
        onClick={updateCursorVar}
        onSelect={updateCursorVar}
      />
    </div>
  );
}

interface CheckboxInputProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function CheckboxInput({ 
  checked, 
  onChange, 
  label,
  disabled = false 
}: CheckboxInputProps) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox"
        style={{ width: 'auto' }}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {label && <span className="node-label" style={{ margin: 0 }}>{label}</span>}
    </label>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <>
      <label className="node-label">{label}</label>
      {children}
      {hint && <div className="node-hint" style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>{hint}</div>}
    </>
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
    <div style={{ marginTop: '12px', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          {title}
        </span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
          {children}
        </div>
      )}
    </div>
  );
}