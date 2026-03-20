import React, { useState, useEffect, useRef } from 'react';
import { ChevronIcon, CopyIcon, LinkIcon, PlusIcon, TrashIcon, CodeIcon, ListIcon } from './Icons.tsx';

/**
 * Enhanced JSON Utility Component
 * Features: 
 * - Tree Mode: Collapsible nodes, recursive rendering, syntax highlighting, add/remove nodes.
 * - Raw Mode: Syntax-highlighted text editor for direct JSON manipulation.
 */

interface JsonPreviewProps {
  data: any;
  maxHeight?: string;
  editable?: boolean;
  onChange?: (newData: any) => void;
  initialExpandedDepth?: number;
}

const COLORS = {
  key: '#79c0ff',      // soft blue
  string: '#a5d6ff',   // light blue
  number: '#ffa657',   // orange
  boolean: '#ff7b72',  // coral/red
  null: '#ff7b72',     // coral/red
  symbol: '#8b949e',   // gray
  highlight: 'rgba(56, 139, 253, 0.15)',
};

const INDENT_SIZE = 16;

const Token = ({ value, type, onClick, editable }: { value: any; type: keyof typeof COLORS; onClick?: () => void; editable?: boolean }) => {
  const isUrl = type === 'string' && typeof value === 'string' && value.startsWith('"http');
  
  if (isUrl && !editable) {
    const cleanUrl = value.replace(/"/g, '');
    return (
      <a 
        href={cleanUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{ 
          color: COLORS.string, 
          textDecoration: 'underline', 
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {value}
        <LinkIcon size={10} />
      </a>
    );
  }
  
  return (
    <span 
      onClick={onClick}
      style={{ 
        color: COLORS[type as keyof typeof COLORS], 
        cursor: editable ? 'text' : 'inherit',
        borderBottom: editable ? '1px dashed transparent' : 'none',
        transition: 'border-color 0.2s'
      }}
      onMouseEnter={(e) => editable && (e.currentTarget.style.borderBottomColor = COLORS[type as keyof typeof COLORS])}
      onMouseLeave={(e) => editable && (e.currentTarget.style.borderBottomColor = 'transparent')}
    >
      {type === 'string' && !isUrl ? `"${value}"` : String(value)}
    </span>
  );
};

const JsonNode = ({ 
  label, 
  value, 
  onUpdate,
  onRemove,
  depth = 0, 
  isLast = true,
  isRoot = false,
  editable = false,
  path = []
}: { 
  label?: string; 
  value: any; 
  onUpdate: (path: (string | number)[], newValue: any) => void;
  onRemove: (path: (string | number)[]) => void;
  depth?: number; 
  isLast?: boolean;
  isRoot?: boolean;
  editable?: boolean;
  path?: (string | number)[];
}) => {
  const [isExpanded, setIsExpanded] = useState(depth <= 0);
  const [isHovered, setIsHovered] = useState(false);
  const [editingField, setEditingField] = useState<'key' | 'value' | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const type = typeof value;
  const isObject = value !== null && type === 'object';
  const isArray = Array.isArray(value);
  const isEmpty = isObject && (isArray ? value.length === 0 : Object.keys(value).length === 0);

  const startEditing = (field: 'key' | 'value', initial: any) => {
    if (!editable) return;
    setEditingField(field);
    setEditValue(field === 'value' && typeof initial === 'string' ? initial : String(initial));
  };

  const commitEdit = () => {
    if (!editingField) return;
    
    if (editingField === 'value') {
      let parsed: any = editValue;
      if (editValue === 'true') parsed = true;
      else if (editValue === 'false') parsed = false;
      else if (editValue === 'null') parsed = null;
      else if (/^-?\d+(\.\d+)?$/.test(editValue)) parsed = Number(editValue);
      
      onUpdate(path, parsed);
    } else if (editingField === 'key' && label !== undefined) {
      if (editValue && editValue !== label) {
        const parentPath = path.slice(0, -1);
        onUpdate([...parentPath, '__rename__', label], editValue);
      }
    }
    
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingField(null);
  };

  const renderValue = () => {
    if (editingField === 'value') {
      return (
        <input 
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--primary)',
            color: 'white',
            fontSize: '11px',
            padding: '0 4px',
            borderRadius: '2px',
            width: '100px',
            fontFamily: 'inherit'
          }}
        />
      );
    }

    if (value === null) return <Token value="null" type="null" editable={editable} onClick={() => startEditing('value', null)} />;
    if (type === 'string') return <Token value={value} type="string" editable={editable} onClick={() => startEditing('value', value)} />;
    if (type === 'number') return <Token value={value} type="number" editable={editable} onClick={() => startEditing('value', value)} />;
    if (type === 'boolean') return <Token value={value} type="boolean" editable={editable} onClick={() => startEditing('value', value)} />;
    return null;
  };

  const renderKey = () => {
    if (label === undefined) return null;
    if (editingField === 'key') {
      return (
        <input 
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--primary)',
            color: COLORS.key,
            fontSize: '11px',
            padding: '0 4px',
            borderRadius: '2px',
            width: '80px',
            fontFamily: 'inherit'
          }}
        />
      );
    }
    return (
      <span 
        onClick={() => startEditing('key', label)}
        style={{ 
          color: COLORS.key, 
          cursor: editable ? 'text' : 'inherit' 
        }}
      >
        "{label}": 
      </span>
    );
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
    const newKey = isArray ? value.length : `new_key_${Object.keys(value).length}`;
    onUpdate([...path, newKey], "");
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(path);
  };

  if (!isObject || isEmpty) {
    return (
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          marginLeft: !isRoot ? INDENT_SIZE : 0, 
          padding: '2px 4px', 
          fontSize: '11px', 
          whiteSpace: 'nowrap',
          borderRadius: '4px',
          background: isHovered ? COLORS.highlight : 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {renderKey()}
        {isEmpty && isArray ? <span style={{ color: COLORS.symbol }}>[]</span> : 
         isEmpty ? <span style={{ color: COLORS.symbol }}>{'{}'}</span> : 
         renderValue()}
        {!isLast && !isRoot && <span style={{ color: COLORS.symbol }}>,</span>}
        
        {isHovered && editable && !isRoot && (
           <button onClick={handleRemove} title="Remove" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', opacity: 0.5 }}>
             <TrashIcon size={10} />
           </button>
        )}
      </div>
    );
  }

  const entries = Object.entries(value);
  const size = entries.length;

  return (
    <div style={{ marginLeft: !isRoot ? INDENT_SIZE : 0 }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          padding: '2px 4px',
          cursor: 'pointer',
          userSelect: 'none',
          fontSize: '11px',
          borderRadius: '4px',
          background: isHovered ? COLORS.highlight : 'transparent'
        }}
      >
        <div style={{ 
          display: 'flex',
          color: 'var(--text-secondary)'
        }}>
          <ChevronIcon size={14} direction={isExpanded ? 'down' : 'right'} />
        </div>
        
        {renderKey()}
        
        <span style={{ color: COLORS.symbol }}>{isArray ? '[' : '{'}</span>
        
        {!isExpanded && (
          <span style={{ 
            fontSize: '10px', 
            color: 'var(--text-secondary)',
            opacity: 0.7,
            padding: '0 4px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '3px',
            margin: '0 4px'
          }}>
            {size} {isArray ? 'items' : 'keys'}
          </span>
        )}
        
        {!isExpanded && <span style={{ color: COLORS.symbol }}>{isArray ? ']' : '}'}</span>}
        {!isExpanded && !isLast && !isRoot && <span style={{ color: COLORS.symbol }}>,</span>}
        
        {isHovered && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            {editable && (
              <button onClick={handleAddChild} title="Add item" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', opacity: 0.5 }}>
                <PlusIcon size={10} />
              </button>
            )}
            {!isRoot && editable && (
               <button onClick={handleRemove} title="Remove" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', opacity: 0.5 }}>
                 <TrashIcon size={10} />
               </button>
            )}
          </div>
        )}
      </div>

      {isExpanded && (
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: '10px' }}>
          {entries.map(([key, val], i) => (
            <JsonNode 
              key={key} 
              label={isArray ? undefined : key} 
              value={val} 
              depth={depth + 1} 
              isLast={i === size - 1} 
              editable={editable}
              onUpdate={onUpdate}
              onRemove={onRemove}
              path={[...path, isArray ? Number(key) : key]}
            />
          ))}
        </div>
      )}

      {isExpanded && (
        <div style={{ fontSize: '11px', padding: '2px 4px', marginLeft: '0' }}>
          <span style={{ color: COLORS.symbol }}>{isArray ? ']' : '}'}</span>
          {!isLast && !isRoot && <span style={{ color: COLORS.symbol }}>,</span>}
        </div>
      )}
    </div>
  );
};

/**
 * Raw JSON Editor with pseudo-syntax highlighting
 */
const RawEditor = ({ 
  value, 
  onChange, 
  maxHeight 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  maxHeight: string;
}) => {
  const highlightJson = (code: string) => {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(".*?"(?=:))|(".*?")|(-?\d+(?:\.\d+)?)|(true|false|null)|([{}[\],:])/g, (match, key, str, num, bool, symbol) => {
        if (key) return `<span style="color: ${COLORS.key}">${key}</span>`;
        if (str) return `<span style="color: ${COLORS.string}">${str}</span>`;
        if (num) return `<span style="color: ${COLORS.number}">${match}</span>`;
        if (bool) return `<span style="color: ${COLORS.boolean}">${match}</span>`;
        if (symbol) return `<span style="color: ${COLORS.symbol}">${match}</span>`;
        return match;
      });
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100px', maxHeight }}>
      <div 
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          pointerEvents: 'none', color: 'transparent',
          padding: '12px', boxSizing: 'border-box',
          fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit',
          backgroundColor: 'transparent', overflow: 'hidden'
        }}
        dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%', height: '100%', minHeight: '100px',
          background: 'transparent', color: 'white',
          border: 'none', outline: 'none', resize: 'none',
          padding: '12px', boxSizing: 'border-box',
          fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          position: 'relative', zIndex: 1,
          caretColor: 'white'
        }}
      />
    </div>
  );
};

export function JsonPreview({ data, maxHeight = '400px', editable = false, onChange }: JsonPreviewProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'code'>('tree');
  const [copying, setCopying] = useState(false);
  const [localData, setLocalData] = useState(data);
  const [localRaw, setLocalRaw] = useState(JSON.stringify(data, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);

  useEffect(() => {
    setLocalData(data);
    setLocalRaw(JSON.stringify(data, null, 2));
  }, [data]);

  const handleUpdate = (path: (string | number)[], newValue: any) => {
    const newData = JSON.parse(JSON.stringify(localData || {}));
    
    if (path.length >= 2 && path[path.length - 2] === '__rename__') {
        const oldKey = path[path.length - 1] as string;
        const parentPath = path.slice(0, -2);
        let target = newData;
        for (const p of parentPath) target = target[p];
        if (target && typeof target === 'object' && !Array.isArray(target) && oldKey !== undefined) {
            const val = target[oldKey];
            delete target[oldKey];
            target[newValue] = val;
        }
    } else if (path.length > 0) {
        let target = newData;
        for (let i = 0; i < path.length - 1; i++) {
            const p = path[i];
            if (p !== undefined) target = target[p];
        }
        const lastKey = path[path.length - 1];
        if (lastKey !== undefined) target[lastKey] = newValue;
    }
    
    setLocalData(newData);
    setLocalRaw(JSON.stringify(newData, null, 2));
    onChange?.(newData);
  };

  const handleRemove = (path: (string | number)[]) => {
    if (path.length === 0) return;
    const newData = JSON.parse(JSON.stringify(localData || {}));
    let target = newData;
    const parentPath = path.slice(0, -1);
    const key = path[path.length - 1];
    for (const p of parentPath) if (p !== undefined) target = target[p];
    if (key !== undefined) {
        if (Array.isArray(target)) target.splice(Number(key), 1);
        else delete target[key];
    }
    setLocalData(newData);
    setLocalRaw(JSON.stringify(newData, null, 2));
    onChange?.(newData);
  };

  const handleRawChange = (val: string) => {
    setLocalRaw(val);
    try {
      const parsed = JSON.parse(val);
      setLocalData(parsed);
      setRawError(null);
      onChange?.(parsed);
    } catch (e) {
      setRawError((e as Error).message);
    }
  };

  const handleCopyAll = () => {
    setCopying(true);
    navigator.clipboard.writeText(JSON.stringify(localData, null, 2));
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="json-editor-container" style={{
      background: '#0d1117',
      borderRadius: '8px',
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      maxHeight,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      lineHeight: '1.4',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header / Tabs */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('tree')}
            style={{
              padding: '4px 10px',
              background: viewMode === 'tree' ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ListIcon size={12} /> Tree
          </button>
          <button
            onClick={() => setViewMode('code')}
            style={{
              padding: '4px 10px',
              background: viewMode === 'code' ? 'var(--primary)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CodeIcon size={12} /> Code
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
           <button
            onClick={handleCopyAll}
            title="Copy JSON"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            {copying ? '✓' : <CopyIcon size={14} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '16px', overflowY: 'auto', flexGrow: 1 }}>
        {viewMode === 'tree' ? (
          <JsonNode 
            value={localData || {}} 
            isRoot={true} 
            editable={editable}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ) : (
          <RawEditor 
            value={localRaw} 
            onChange={handleRawChange} 
            maxHeight={maxHeight} 
          />
        )}
      </div>

      {/* Footer / Error info */}
      {viewMode === 'code' && rawError && (
        <div style={{ 
          padding: '6px 12px', 
          background: 'rgba(207,34,46,0.1)', 
          borderTop: '1px solid var(--error)',
          color: 'var(--error)',
          fontSize: '10px'
        }}>
          ⚠️ {rawError}
        </div>
      )}
    </div>
  );
}
