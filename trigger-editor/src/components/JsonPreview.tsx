import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronIcon, CopyIcon, LinkIcon, PlusIcon, TrashIcon, CodeIcon, ListIcon } from './Icons.tsx';
import { TextInput, HoverTooltip, AutocompletePopup } from './inputs/FormFields.tsx';
import { findVariableAtOffset, findFirstVariable, getHoverInfo } from '../lsp/engine.ts';

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
  const [hoveredVar, setHoveredVar] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLSpanElement>(null);

  const isUrl = type === 'string' && typeof value === 'string' && value.startsWith('"http');
  const hasVariable = type === 'string' && typeof value === 'string' && value.includes('${');
  const hoverTimer = useRef<any>(null);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (hasVariable) {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => {
        const found = findFirstVariable(String(value));
        setHoveredVar(found || null);
      }, 500); // 500ms delay for "better popup"
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredVar(null);
  };

  const info = hoveredVar ? getHoverInfo(hoveredVar) : null;

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
      ref={containerRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ 
        color: COLORS[type as keyof typeof COLORS], 
        cursor: editable ? 'text' : 'inherit',
        borderBottom: editable ? '1px dashed transparent' : 'none',
        transition: 'border-color 0.2s',
        position: 'relative'
      }}
      onMouseEnter={(e) => editable && (e.currentTarget.style.borderBottomColor = COLORS[type as keyof typeof COLORS])}
    >
      {info && (
        <HoverTooltip 
            info={info} 
            anchorRect={containerRef.current?.getBoundingClientRect() ?? null} 
            followMouse={true}
            mousePos={mousePos}
        />
      )}
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
  const inputRef = useRef<HTMLInputElement>(null);
  
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
        <div style={{ minWidth: '200px', display: 'inline-block' }}>
            <TextInput 
              autoFocus
              value={editValue}
              onChange={(val) => setEditValue(String(val))}
              onBlur={commitEdit}
              className="params-modal-input"
              style={{ padding: '4px 8px', fontSize: '11px', width: '300px' }}
            />
        </div>
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
}: { 
  value: string; 
  onChange: (val: string) => void; 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<ReturnType<typeof getHoverInfo>>(undefined);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorVar, setCursorVar] = useState<string | undefined>(undefined);
  const hoverTimer = useRef<any>(null);

  const highlightJson = (code: string) => {
    if (!code) return '';
    const highlighted = code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(".*?")(\s*:)|(".*?")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])/g, 
        (match, key, colon, str, num, bool, symbol) => {
        if (key) return `<span style="color: ${COLORS.key}">${key}</span>${colon || ''}`;
        if (str) {
            const inner = str.replace(/\$\{.*?\}/g, (v: string) => `<span style="color: #58a6ff; font-weight: bold">${v}</span>`);
            return `<span style="color: ${COLORS.string}">${inner}</span>`;
        }
        if (num) return `<span style="color: ${COLORS.number}">${match}</span>`;
        if (bool) return `<span style="color: ${COLORS.boolean}">${match}</span>`;
        if (symbol) return `<span style="color: ${COLORS.symbol}">${match}</span>`;
        return match;
      });
    return highlighted + (code.endsWith('\n') ? ' ' : '');
  };

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const updateCursorVar = () => {
    const pos = textareaRef.current?.selectionStart ?? 0;
    const found = findVariableAtOffset(String(value), pos);
    setCursorVar(found);
  };

  const handleTextareaMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
        const found = findFirstVariable(String(value));
        setHoverInfo(found ? getHoverInfo(found) : undefined);
    }, 500);
  };

  const handleMouseLeaveRaw = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoverInfo(undefined);
  };

  const activeInfo = isFocused
    ? (cursorVar ? getHoverInfo(cursorVar) : undefined)
    : hoverInfo;

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        width: '100%', 
        minHeight: '200px',
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
        fontSize: '12px',
        lineHeight: '1.6',
      }}
    >
      {activeInfo && (
        <HoverTooltip
          info={activeInfo}
          anchorRect={containerRef.current?.getBoundingClientRect() ?? null}
          followMouse={!isFocused}
          mousePos={!isFocused ? mousePos : undefined}
        />
      )}
      <AutocompletePopup
        value={value}
        onSelect={onChange}
        anchorRef={containerRef}
        isFocused={isFocused}
      />
      <pre
        ref={preRef}
        aria-hidden="true"
        className="raw-editor__highlight"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          margin: 0,
          padding: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          pointerEvents: 'none',
          color: '#e6edf3',
          boxSizing: 'border-box',
          overflow: 'hidden',
          backgroundColor: 'transparent',
          fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: highlightJson(value) }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        className="raw-editor__textarea"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '250px',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'white',
          border: 'none', outline: 'none', resize: 'vertical',
          margin: 0,
          padding: '12px',
          boxSizing: 'border-box',
          fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          position: 'relative', zIndex: 1,
          display: 'block',
          overflowY: 'auto'
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => { setIsFocused(false); setCursorVar(undefined); }, 150)}
        onKeyUp={updateCursorVar}
        onClick={updateCursorVar}
        onSelect={updateCursorVar}
        onMouseMove={handleTextareaMouseMove}
        onMouseLeave={handleMouseLeaveRaw}
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
      flexDirection: 'column',
      height: '100%'
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
      <div style={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        minHeight: '250px', // Min size for stability
        display: 'flex',
        flexDirection: 'column'
      }}>
        {viewMode === 'tree' ? (
          <div style={{ padding: '16px' }}>
            <JsonNode 
              value={localData || {}} 
              isRoot={true} 
              editable={editable}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </div>
        ) : (
          <RawEditor 
            value={localRaw} 
            onChange={handleRawChange} 
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
