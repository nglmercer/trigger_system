import * as React from 'react';
import { useState, useRef } from 'react';
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
}

export function SelectInput({ 
  value, 
  options, 
  onChange, 
  placeholder = 'Select...', 
  disabled = false,
  className = 'node-input',
  style
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
          paddingRight: '30px' 
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
  onChange: (value: string | number) => void;
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
  onBlur?: () => void;
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
  onBlur
}: TextInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  // Hover state lives on the ACTUAL INPUT element to avoid multi-tooltip bug
  const [hoverInfo, setHoverInfo] = useState<ReturnType<typeof getHoverInfo>>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const [cursorOffset, setCursorOffset] = useState<number>(0);

  const handleChange = (newVal: string | number) => {
    onChange(type === 'number' ? (typeof newVal === 'string' ? parseFloat(newVal) || 0 : newVal) : newVal);
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
          value={value}
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
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        style={style}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if (onBlur) onBlur();
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
  const [isFocused, setIsFocused] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<ReturnType<typeof getHoverInfo>>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const [cursorOffset, setCursorOffset] = useState<number>(0);

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
          value={value}
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