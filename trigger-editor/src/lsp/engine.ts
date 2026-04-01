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
 * Scores a label against a term for fuzzy matching.
 * Higher score means better match. -1 means no match.
 */
function fuzzyScore(label: string, term: string): number {
  if (!term) return 0;
  const lLabel = label.toLowerCase();
  const lTerm = term.toLowerCase();
  
  // Exact match
  if (lLabel === lTerm) return 1000;
  // Prefix match
  if (lLabel.startsWith(lTerm)) return 800;
  // Substring match
  const idx = lLabel.indexOf(lTerm);
  if (idx !== -1) return 500 - idx; // Earlier index is better

  // Fuzzy match (characters in order)
  let score = 0;
  let labelIdx = 0;
  let termIdx = 0;
  let consecutiveMatches = 0;

  while (termIdx < lTerm.length && labelIdx < lLabel.length) {
    if (lTerm[termIdx] === lLabel[labelIdx]) {
      // Bonus for consecutive characters
      score += 10 + (consecutiveMatches * 5);
      // Bonus for matches after a dot (start of a property)
      if (labelIdx === 0 || lLabel[labelIdx - 1] === '.') {
        score += 50;
      }
      termIdx++;
      consecutiveMatches++;
    } else {
      consecutiveMatches = 0;
    }
    labelIdx++;
  }

  return termIdx === lTerm.length ? score : -1;
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
      const dataVal = (_context as Record<string, JsonValue>)['data'];
      if (dataVal !== undefined) buildPaths(dataVal, 'data', all, seen);
    } else {
      buildPaths(_context as JsonValue, 'data', all, seen);
    }
  }

  if (!term) return all.slice(0, 50);

  return all
    .map(item => ({ item, score: fuzzyScore(item.label, term) }))
    .filter(pair => pair.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tie-breaker: prefer shallower depth (fewer dots)
      const aDepth = (a.item.label.match(/\./g) || []).length;
      const bDepth = (b.item.label.match(/\./g) || []).length;
      return aDepth !== bDepth ? aDepth - bDepth : a.item.label.localeCompare(b.item.label);
    })
    .map(pair => pair.item)
    .slice(0, 50);
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
 * @param text - The full text value
 * @param cursorOffset - Optional cursor position. If not provided, uses end of text.
 */
export function getCompletionTrigger(text: string, cursorOffset?: number): string | null | undefined {
  const offset = cursorOffset ?? text.length;
  const beforeCursor = text.substring(0, offset);

  // If it ends with }, we just closed an expression, don't show autocomplete
  if (beforeCursor.endsWith('}')) return null;

  // Match the end of the string before cursor for something like ${data.u or $data.u or just $
  // This regex grabs both the lead-in ($ or ${) and the partial term
  const match = beforeCursor.match(/(\$\{?)([a-zA-Z0-9_.]*)$/);
  if (!match) return null;

  return match[2]; // The partial term (could be empty string)
}

/**
 * Build the completed text after a user selects a completion item.
 * @param text - The full text value
 * @param item - Selected completion item
 * @param cursorOffset - Position of the cursor
 */
export function applyCompletion(text: string, item: CompletionItem, cursorOffset?: number): string {
  const offset = cursorOffset ?? text.length;
  const beforeCursor = text.substring(0, offset);
  const afterCursor = text.substring(offset);

  const match = beforeCursor.match(/(\$\{?)([a-zA-Z0-9_.]*)$/);
  if (!match) return text;

  const fullTrigger = match[0]; // e.g. "${data.u" or "$da"
  const prefix = beforeCursor.substring(0, beforeCursor.length - fullTrigger.length);
  
  const importMode = item.importMode || 'path';
  
  if (importMode === 'value' && item.value !== undefined) {
    return applyValueCompletion(text, item, offset);
  }
  
  // Return prefix + completed variable + rest of text
  return `${prefix}\${${item.label}}${afterCursor}`;
}

/**
 * Apply completion by inserting the raw VALUE instead of ${} reference.
 */
export function applyValueCompletion(text: string, item: CompletionItem, cursorOffset?: number): string {
  const offset = cursorOffset ?? text.length;
  const beforeCursor = text.substring(0, offset);
  const afterCursor = text.substring(offset);

  const match = beforeCursor.match(/(\$\{?)([a-zA-Z0-9_.]*)$/);
  if (!match) return text;

  const fullTrigger = match[0];
  const prefix = beforeCursor.substring(0, beforeCursor.length - fullTrigger.length);
  const value = item.value;
  
  if (value === undefined || value === null) {
    return `${prefix}\${${item.label}}${afterCursor}`;
  }
  
  let formattedValue: string;
  if (typeof value === 'string') {
    // automatic quotes 
    const insideQuotes = prefix.endsWith('"') || prefix.endsWith("'");
    if (insideQuotes) {
      formattedValue = value;
    } else {
      formattedValue = `${value}`;
    }
  } else if (typeof value === 'number' || typeof value === 'boolean') {
    formattedValue = String(value);
  } else {
    formattedValue = JSON.stringify(value);
  }
  
  return `${prefix}${formattedValue}${afterCursor}`;
}
