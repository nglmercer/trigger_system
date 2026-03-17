import type { JsonValue, LSPContext, CompletionItem, HoverInfo, ImportConfig, ImportMode } from './types.ts';

// ─── Internal state ───────────────────────────────────────────────────────────
let _context: LSPContext = {};
let _imports: ImportConfig[] = []; // Track all imports with their modes
const _listeners = new Set<() => void>();

// ─── Utilities ────────────────────────────────────────────────────────────────
function getKind(val: JsonValue): CompletionItem['kind'] {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val as CompletionItem['kind'];
}

function formatDisplay(val: JsonValue): string {
  if (typeof val === 'object' && val !== null) {
    return JSON.stringify(val, null, 2);
  }
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
}

/**
 * Recursively builds a flat list of dot-notation paths from an object.
 * Uses the import's alias as prefix and includes import mode info.
 */
function buildPaths(obj: JsonValue, prefix: string, out: CompletionItem[], seen: Set<string>, importId?: string, importMode?: ImportMode): void {
  if (seen.has(prefix)) return;
  seen.add(prefix);

  const kind = getKind(obj);
  out.push({
    label: prefix,
    kind,
    detail: kind,
    documentation: typeof obj === 'object' && obj !== null
      ? JSON.stringify(obj, null, 2).slice(0, 200)
      : String(obj),
    value: obj, // Include the actual value for value-mode completions
    importId,
    importMode
  });

  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, child] of Object.entries(obj)) {
      buildPaths(child as JsonValue, `${prefix}.${key}`, out, seen, importId, importMode);
    }
  }
}

/**
 * Resolves a dot-notation path like "data.user.name" against the current context.
 * Handles both legacy behavior (single "data" key) and import-based contexts.
 */
function resolvePath(path: string): JsonValue | undefined {
  const keys = path.split('.');

  // Determine which root to walk from
  // If we have imports, use them directly - the context IS the imports object
  // Each key in _context is an import alias
  let current: JsonValue;
  
  // Check if this looks like an import-based context (multiple keys or non-standard)
  const contextKeys = Object.keys(_context || {});
  const hasNativeData = contextKeys.length === 1 && contextKeys[0] === 'data';
  
  // If context has a single "data" key, use legacy unwrapping
  // Otherwise, treat each key as a potential import root
  if (hasNativeData) {
    // Legacy: context = { data: {...} }
    current = (_context as Record<string, JsonValue>);
  } else if (contextKeys.length > 0) {
    // Import-based: context = { alias1: {...}, alias2: {...} }
    // We need to find which import the path starts with
    current = _context as Record<string, JsonValue>;
  } else {
    return undefined;
  }

  for (const key of keys) {
    if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
      if (key in current) {
        current = (current as Record<string, JsonValue>)[key]!;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return current;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** 
 * Load import configurations with their modes
 * This allows different imports to have different completion behaviors
 * @param imports - Array of import configurations with alias, data, and mode
 */
export function loadImports(imports: ImportConfig[]): void {
  _imports = imports;
  
  // Build the context from all imports
  const newContext: LSPContext = {};
  for (const imp of imports) {
    newContext[imp.alias] = imp.data;
  }
  
  _context = newContext;
  _listeners.forEach(fn => fn());
}

/**
 * Get the current import configurations
 */
export function getImports(): ImportConfig[] {
  return _imports;
}

/** Load a new JSON context into the LSP engine (legacy compatibility) */
export function loadContext(data: LSPContext): void {
  // Wrap single data object in default import with path mode
  _imports = [{
    id: 'default',
    alias: 'data',
    data,
    mode: 'path'
  }];
  _context = { data };
  _listeners.forEach(fn => fn());
}

/** Get the raw context data */
export function getContext(): LSPContext {
  return _context;
}

/** Subscribe to context changes. Returns an unsubscribe function. */
export function onContextChange(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * Get all completion items for a given partial term.
 * @param term - What the user has typed after ${ (e.g. "data.us")
 */
export function getCompletions(term: string): CompletionItem[] {
  if (!_context || typeof _context !== 'object') return [];

  const all: CompletionItem[] = [];
  const seen = new Set<string>();

  // If we have imports configured, use them
  if (_imports.length > 0) {
    for (const imp of _imports) {
      if (imp.data && typeof imp.data === 'object') {
        buildPaths(imp.data as JsonValue, imp.alias, all, seen, imp.id, imp.mode);
      }
    }
  } else {
    // Legacy behavior: check for single "data" key
    const contextKeys = Object.keys(_context);
    const hasNativeData =
      contextKeys.length === 1 && contextKeys[0] === 'data';

    if (hasNativeData) {
      // Context = { data: { ... } } — build from context.data under "data" prefix
      const dataVal = (_context as Record<string, JsonValue>)['data'];
      if (dataVal !== undefined) buildPaths(dataVal, 'data', all, seen);
    } else {
      // Context is flat — treat entire context as the "data" root
      buildPaths(_context as JsonValue, 'data', all, seen);
    }
  }

  // Output is already deduplicated by seen Set — no extra filter needed
  const unique = all;

  const lterm = term.toLowerCase();
  return unique
    .filter(item => item.label.toLowerCase().includes(lterm))
    .sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(lterm);
      const bStarts = b.label.toLowerCase().startsWith(lterm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      const aDepth = (a.label.match(/\./g) || []).length;
      const bDepth = (b.label.match(/\./g) || []).length;
      return aDepth !== bDepth ? aDepth - bDepth : a.label.localeCompare(b.label);
    })
    .slice(0, 10);
}

/**
 * Get hover info for a fully-resolved variable path.
 * @param variable - e.g. "data.user.name"
 */
export function getHoverInfo(variable: string): HoverInfo | undefined {
  const val = resolvePath(variable);
  if (val === undefined) return undefined;
  return {
    variable,
    value: val,
    kind: getKind(val),
    display: formatDisplay(val)
  };
}

/**
 * Extract all ${var} expressions from a string value.
 */
export function extractVariables(text: string): string[] {
  const regex = /\$\{([a-zA-Z0-9_.]+)\}/g;
  const found: string[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (!found.includes(m[1]!)) found.push(m[1]!);
  }
  return found;
}

/**
 * Find which ${var} the given character offset falls inside.
 */
export function findVariableAtOffset(text: string, offset: number): string | undefined {
  const regex = /\$\{([a-zA-Z0-9_.]+)\}/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (offset >= m.index && offset <= m.index + m[0].length) {
      return m[1];
    }
  }
  return undefined;
}

/**
 * Get the first ${var} in a piece of text (useful for single-var hover hints).
 */
export function findFirstVariable(text: string): string | undefined {
  const m = text.match(/\$\{([a-zA-Z0-9_.]+)\}/);
  return m ? m[1] : undefined;
}

/**
 * Detect trigger state for autocomplete popup.
 * Returns the current partial term being typed, or null if not in a variable expression.
 */
export function getCompletionTrigger(text: string): string | null | undefined {
  // Must end with $, ${, or ${partial (not yet closed with })
  if (text.endsWith('}')) return null;

  const match = text.match(/\$\{?([a-zA-Z0-9_.]*)$/);
  if (!match) return null;

  const dollarIdx = text.lastIndexOf('$');
  const spaceIdx = text.lastIndexOf(' ');
  if (dollarIdx === -1) return null;
  // Don't trigger if there's a space after the last $
  if (spaceIdx > dollarIdx) return null;

  return match[1]; // The partial term (could be empty string)
}

/**
 * Build the completed text after a user selects a completion item.
 * Automatically detects import mode from the item and applies:
 * - For 'path' mode: inserts ${variable} format
 * - For 'value' mode: inserts raw value directly
 */
export function applyCompletion(text: string, item: CompletionItem): string {
  const trigger = getCompletionTrigger(text);
  if (trigger === null) return text;

  const match = text.match(/\$\{?([a-zA-Z0-9_.]*)$/);
  if (!match) return text;

  const prefix = text.substring(0, text.length - match[0].length);
  
  // Check if this item has value mode
  const importMode = item.importMode || 'path';
  
  if (importMode === 'value' && item.value !== undefined) {
    // Value mode: insert raw value
    return applyValueCompletion(text, item);
  }
  
  // Path mode: insert ${variable} format
  return `${prefix}\${${item.label}}`;
}

/**
 * Apply completion by inserting the raw VALUE instead of ${} reference.
 * This is useful for fields like Condition Value where you want to insert
 * the actual value (string, number, boolean) directly.
 * 
 * For strings: inserts "value"
 * For numbers: inserts the number
 * For booleans: inserts true/false
 * For arrays/objects: inserts JSON stringified
 */
export function applyValueCompletion(text: string, item: CompletionItem): string {
  const trigger = getCompletionTrigger(text);
  if (trigger === null) return text;

  const match = text.match(/\$\{?([a-zA-Z0-9_.]*)$/);
  if (!match) return text;

  const prefix = text.substring(0, text.length - match[0].length);
  
  // Get the actual value from the item
  const value = item.value;
  
  if (value === undefined || value === null) {
    // If no value, fall back to variable reference
    return `${prefix}\${${item.label}}`;
  }
  
  // Format the value based on its type
  let formattedValue: string;
  
  if (typeof value === 'string') {
    // Wrap strings in quotes
    formattedValue = `"${value}"`;
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    // Numbers and booleans don't need quotes
    formattedValue = String(value);
  } else if (Array.isArray(value)) {
    // Arrays -> JSON string
    formattedValue = JSON.stringify(value);
  } else if (typeof value === 'object') {
    // Objects -> JSON string
    formattedValue = JSON.stringify(value);
  } else {
    // Fallback to variable reference
    return `${prefix}\${${item.label}}`;
  }
  
  return `${prefix}${formattedValue}`;
}
