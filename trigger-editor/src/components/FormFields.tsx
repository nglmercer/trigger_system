import * as React from 'react';
import { useState } from 'react';

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
  return (
    <input
      type={type}
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
      disabled={disabled}
    />
  );
}

interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

export function TextAreaInput({ 
  value, 
  onChange, 
  placeholder = '', 
  disabled = false,
  rows = 3,
  className = 'node-textarea'
}: TextAreaInputProps) {
  return (
    <textarea
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={rows}
    />
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